import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebase/admin';

const id = z.string().regex(/^\d{17,20}$/);
const imageMessages = z.array(
  z.object({
    id,
    author: z.object({ id }),
    attachments: z.array(z.object({ content_type: z.string().nullish() })),
  })
);
const api = 'https://discord.com/api/v10';
const videoUrl = z.url({ protocol: /^https?$/ }).max(1000);

export function deliveryModal(customId: string) {
  return {
    type: 9,
    data: {
      title: '納品URLを追加・再納品',
      custom_id: customId.replace('vr:video:', 'vr:submit:'),
      components: [
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: 'url',
              label: '納品ファイルURL',
              style: 1,
              required: true,
              max_length: 1000,
            },
          ],
        },
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: 'note',
              label: '共有事項（任意）',
              style: 2,
              required: false,
              max_length: 2000,
            },
          ],
        },
      ],
    },
  };
}

interface Delivery {
  kind: 'thumb' | 'submit';
  teamId: string;
  requestId: string;
  guild: string;
  channel: string;
  user: string;
  interaction: string;
  app: string;
  token: string;
  buttonId?: string;
  url: string;
  note: string;
}

async function register(input: Delivery) {
  const db = getAdminFirestore();
  const team = db.collection('teams').doc(input.teamId);
  const ref = team.collection('videoRequests').doc(input.requestId);
  const receipt = ref.collection('deliveryInteractions').doc(input.interaction);
  const thumb = input.kind === 'thumb';
  if (!thumb && (!videoUrl.safeParse(input.url).success || input.note.length > 2000))
    throw Error('納品URLと共有事項を確認してください。');
  let imageId: string | undefined;
  if (thumb) {
    if (!input.buttonId || !id.safeParse(input.buttonId).success)
      throw Error('納品ボタンを確認してください。');
    const response = await fetch(`${api}/channels/${input.channel}/messages?limit=100`, {
      headers: { Authorization: 'Bot ' + process.env.DISCORD_BOT_TOKEN },
    });
    if (!response.ok) throw Error('スレッドの画像を取得できませんでした。');
    const buttonId = BigInt(input.buttonId);
    imageId = imageMessages
      .parse(await response.json())
      .find(
        (m) =>
          m.author.id === input.user &&
          BigInt(m.id) > buttonId &&
          m.attachments.some((a) => a.content_type?.startsWith('image/'))
      )?.id;
    if (!imageId) throw Error('このボタンより後に画像を投稿してから押してください。');
  }
  return db.runTransaction(async (tx) => {
    const [config, doc, previous] = await Promise.all([
      tx.get(team.collection('discord').doc('config')),
      tx.get(ref),
      tx.get(receipt),
    ]);
    const r = doc.data();
    if (
      !r ||
      r.discordTransport !== 'integrated' ||
      config.get('guildId') !== input.guild ||
      r.discord?.guildId !== input.guild ||
      !(thumb
        ? r.discord.thumbnailThreadId === input.channel
        : r.discord.editorThreadIds.includes(input.channel))
    )
      throw Error('依頼とスレッドが一致しません。');
    if (previous.exists) return null;
    const status = thumb ? r.thumbnailStatus : r.status;
    if (status !== 'in_progress' && !(status === 'review_requested' && !thumb))
      throw Error('現在は納品を受け付けていません。');
    const now = FieldValue.serverTimestamp();
    const taskId = thumb ? r.thumbnailTaskId : r.taskId;
    if (!taskId) throw Error('対象タスクがありません。');
    tx.update(team.collection('tasks').doc(taskId), {
      columnId: r.reviewTaskColumnId,
      updatedAt: now,
    });
    tx.set(receipt, { createdAt: now });
    if (thumb && imageId) {
      if (r.thumbnailMessageId && BigInt(imageId) <= BigInt(r.thumbnailMessageId))
        throw Error('修正した画像を新しく投稿してください。');
      tx.update(ref, {
        thumbnailStatus: 'review_requested',
        thumbnailMessageId: imageId,
        thumbnailMessageUrl: `https://discord.com/channels/${input.guild}/${input.channel}/${imageId}`,
        updatedAt: now,
      });
      const users = z
        .array(id)
        .parse(
          r.videoType === 'short'
            ? r.discordRouting.thumbnailShortIds
            : r.discordRouting.thumbnailLongIds
        );
      return {
        users,
        body: [
          users.map((u) => `<@${u}>`).join(' '),
          r.thumbnailMessageId ? '修正ありがとう！' : 'サムネの納品ありがとう！',
          '確認するので待っててクレヨン',
        ]
          .filter(Boolean)
          .join('\n'),
      };
    }
    tx.update(ref, {
      status: 'review_requested',
      deliveryUrls: FieldValue.arrayUnion(input.url),
      deliveries: FieldValue.arrayUnion({ url: input.url, note: input.note || null }),
      updatedAt: now,
    });
    const first = new Set([...(r.deliveryUrls ?? []), input.url]).size === 1;
    return {
      users: [] as string[],
      body: [
        first
          ? '初稿の納品完了丸！ありがとうございます！\n確認しますのでお待ちください！'
          : '修正ファイルの納品ありがとうございます！\nさっそく確認します！',
        '納品ファイル：' + input.url,
        input.note ? '共有事項：' + input.note : '',
      ]
        .filter(Boolean)
        .join('\n\n'),
    };
  });
}

export async function handleDelivery(input: Delivery) {
  let body: string;
  let users: string[] = [];
  try {
    const result = await register(input);
    if (!result) return;
    body = result.body;
    users = result.users;
  } catch (error) {
    body =
      error instanceof Error && !(error instanceof z.ZodError) && error.message.endsWith('。')
        ? error.message
        : '納品を処理できませんでした。依頼の状態を確認してください。';
    console.error('[discord] 動画依頼の納品受付に失敗', error);
  }
  const hook = `${api}/webhooks/${input.app}/${input.token}`;
  const parts = body.match(/[\s\S]{1,1900}/gu) ?? [body];
  for (const [index, content] of parts.entries()) {
    const response = await fetch(index === 0 ? hook + '/messages/@original' : hook, {
      method: index === 0 ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, allowed_mentions: { parse: [], users } }),
    });
    if (!response.ok) throw Error('納品結果のDiscord投稿に失敗しました（' + response.status + '）');
  }
}
