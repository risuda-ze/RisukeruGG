import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { db } from '../lib/admin';
import { discordBotToken } from '../discord/botToken';
import { createPublicThread, sendMessage, type DiscordActionRow } from '../discord/rest';

const options = { region: 'asia-northeast1', secrets: [discordBotToken] };
const path = 'teams/{teamId}/videoRequests/{requestId}';
const snowflake = z.string().regex(/^\d{17,20}$/);
const channelsSchema = z.array(z.object({ id: snowflake, type: z.number() }));
const changeSchema = z.object({
  target: z.enum(['editor', 'thumbnail', 'both']),
  label: z.string(),
  value: z.string(),
});
type Ref = FirebaseFirestore.DocumentReference;
type Row = FirebaseFirestore.DocumentData;

function mentions(ids: string[]) {
  return ids.map((id) => `<@${id}>`).join(' ');
}

function button(kind: 'video' | 'thumb', ref: Ref): DiscordActionRow[] {
  const team = ref.parent.parent;
  if (!team) throw Error('チームを特定できません');
  return [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 3,
          custom_id: `vr:${kind}:${team.id}:${ref.id}`,
          label: kind === 'thumb' ? 'サムネを納品' : '納品URLを追加・再納品',
        },
      ],
    },
  ];
}

async function api(resource: string, method = 'GET', body?: object) {
  const response = await fetch('https://discord.com/api/v10' + resource, {
    method,
    headers: {
      Authorization: 'Bot ' + discordBotToken.value(),
      'Content-Type': 'application/json',
    },
    body: body && JSON.stringify(body),
  });
  if (!response.ok) throw Error(`Discord APIで失敗しました（${response.status}）`);
  return response;
}

async function post(thread: string, ids: string[], body: string, components?: DiscordActionRow[]) {
  const prefix = mentions(ids);
  const content = [prefix, body].filter(Boolean).join('\n\n');
  // Discordの本文上限を超える概要・修正指示は分割し、最後にボタンを付ける。
  const parts = content.match(/[\s\S]{1,1900}/gu) ?? [''];
  for (const [i, part] of parts.entries()) {
    if (
      !(await sendMessage(thread, {
        content: part,
        allowed_mentions: { parse: [], users: ids },
        ...(i === parts.length - 1 && components ? { components } : {}),
      }))
    )
      throw Error('スレッドへの投稿に失敗しました');
  }
}

async function claim(ref: Ref, field: string, processing: string) {
  return db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists || doc.get(field) !== 'bot_queued') return false;
    tx.update(ref, { [field]: processing, updatedAt: FieldValue.serverTimestamp() });
    return true;
  });
}

async function resolveEditors(team: Ref, request: Row, guild: string) {
  if (!request.editorMemberIds?.length)
    return z.array(snowflake).min(1).parse(request.editorDiscordIds);
  const ids = new Set<string>();
  for (const memberId of request.editorMemberIds) {
    const ref = team.collection('members').doc(memberId);
    const member = (await ref.get()).data();
    if (!member) throw Error('担当者がチームに見つかりません');
    if (member.discordUserId) {
      ids.add(snowflake.parse(member.discordUserId));
      continue;
    }
    if (!member.discordUsername) throw Error('担当者のDiscord情報が未設定です');
    const response = await api(
      '/guilds/' +
        guild +
        '/members/search?limit=10&query=' +
        encodeURIComponent(member.discordUsername)
    );
    const matches = z
      .array(z.object({ user: z.object({ id: snowflake, username: z.string() }) }))
      .parse(await response.json());
    const match = matches.find((m) => m.user.username === member.discordUsername);
    if (!match) throw Error('Discordサーバー内に担当者が見つかりません');
    await ref.update({ discordUserId: match.user.id });
    ids.add(match.user.id);
  }
  return [...ids];
}

export const sendIntegratedVideoRequest = onDocumentCreated(
  { ...options, document: path },
  async (event) => {
    const ref = event.data?.ref;
    if (!ref || !(await claim(ref, 'discord.status', 'creating'))) return;
    try {
      const team = db.doc('teams/' + event.params.teamId);
      const r = (await ref.get()).data();
      if (!r) return;
      const guild = snowflake.parse(
        (await team.collection('discord').doc('config').get()).get('guildId')
      );
      if (guild !== r.discordRouting.guildId)
        throw Error('依頼作成後に連携サーバーが変更されました');
      const available = channelsSchema.parse(
        await (await api('/guilds/' + guild + '/channels')).json()
      );
      const routes = r.discordRouting;
      const editors = await resolveEditors(team, r, guild);
      const groups = new Map<string, string[]>();
      for (const id of editors) {
        const parent = routes.editorChannels?.[id] || routes.editorChannelId;
        groups.set(parent, [...(groups.get(parent) ?? []), id]);
      }
      const parents = [...groups.keys(), ...(r.thumbnailTaskId ? [routes.thumbnailChannelId] : [])];
      if (parents.some((id) => !available.some((c) => c.id === id && c.type === 0)))
        throw Error('連携サーバー内のテキストチャンネルを指定してください');
      const progress = await team.collection('taskStatuses').doc(r.progressTaskColumnId).get();
      if (!progress.exists || progress.get('role') === 'done')
        throw Error('制作中の列設定を確認してください');
      const thread = async (parent: string) => {
        const id = await createPublicThread(parent, r.title);
        if (!id) throw Error('スレッドを作成できませんでした');
        return id;
      };
      const editorThreadIds: string[] = [];
      const url = (id: string) => `https://discord.com/channels/${guild}/${id}`;
      for (const [parent, ids] of groups) {
        const id = await thread(parent);
        editorThreadIds.push(id);
        await post(
          id,
          ids,
          [
            r.videoType === 'short'
              ? 'ショート動画の編集をお願いします。'
              : '横動画の編集をお願いします。',
            '**編集内容**',
            r.summary,
            '**プロマネ**',
            r.projectManagementUrl,
            '**共有事項**',
            r.notes || '（なし）',
          ].join('\n'),
          button('video', ref)
        );
      }
      let thumb: string | null = null;
      if (r.thumbnailTaskId) {
        thumb = await thread(routes.thumbnailChannelId);
        const due = r.finalPackageDueAt
          .toDate()
          .toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' });
        await post(
          thumb,
          thumbIds(r),
          [
            'サムネイルの制作をお願いします。',
            'タイトル案（仮）：' + r.titleIdea,
            '納期：' + due,
            ...editorThreadIds.map(url),
            '画像を投稿してから納品ボタンを押してください。',
          ].join('\n\n'),
          button('thumb', ref)
        );
      }
      const batch = db.batch();
      for (const id of [r.taskId, r.thumbnailTaskId].filter(Boolean))
        batch.update(team.collection('tasks').doc(id), {
          columnId: progress.id,
          updatedAt: FieldValue.serverTimestamp(),
        });
      batch.update(ref, {
        editorDiscordIds: editors,
        status: 'in_progress',
        ...(thumb ? { thumbnailStatus: 'in_progress' } : {}),
        discord: {
          status: 'created',
          guildId: guild,
          editorThreadIds,
          editorThreadUrls: editorThreadIds.map(url),
          thumbnailThreadId: thumb,
          thumbnailThreadUrl: thumb ? url(thumb) : null,
          error: null,
        },
        updatedAt: FieldValue.serverTimestamp(),
      });
      await batch.commit();
    } catch (error) {
      await ref.update({
        'discord.status': 'failed',
        'discord.error': error instanceof Error ? error.message : String(error),
      });
    }
  }
);

function thumbIds(r: Row): string[] {
  return z
    .array(snowflake)
    .parse(
      r.videoType === 'short'
        ? r.discordRouting.thumbnailShortIds
        : r.discordRouting.thumbnailLongIds
    );
}

export const sendIntegratedVideoEvent = onDocumentCreated(
  { ...options, document: path + '/discordEvents/{eventId}' },
  async (event) => {
    const e = event.data;
    const ref = e?.ref.parent.parent;
    if (!e || !ref || !(await claim(e.ref, 'status', 'sending'))) return;
    try {
      const r = (await ref.get()).data();
      if (
        !r ||
        r.discord.status !== 'created' ||
        (await db.doc('teams/' + event.params.teamId + '/discord/config').get()).get('guildId') !==
          r.discord.guildId
      )
        throw Error('依頼のDiscord連携を確認してください');
      const { type, message, changes } = e.data();
      const editorIds = z.array(snowflake).parse(r.editorDiscordIds);
      const targets: Array<{ id: string; thumb: boolean }> = [
        ...r.discord.editorThreadIds.map((id: string) => ({ id, thumb: false })),
        ...(r.discord.thumbnailThreadId ? [{ id: r.discord.thumbnailThreadId, thumb: true }] : []),
      ];
      for (const { id, thumb } of targets) {
        const ids = thumb ? thumbIds(r) : editorIds;
        if (type === 'request_updated') {
          const items = z
            .array(changeSchema)
            .parse(changes)
            .filter((c) => c.target === 'both' || c.target === (thumb ? 'thumbnail' : 'editor'));
          if (!items.length) continue;
          if (items.some((c) => c.label === 'タイトル'))
            await api('/channels/' + id, 'PATCH', { name: r.title.slice(0, 100) });
          await post(
            id,
            ids,
            ['**依頼内容を更新しました**', ...items.map((c) => `**${c.label}**\n${c.value}`)].join(
              '\n\n'
            )
          );
        } else if (type === (thumb ? 'thumbnail_revision' : 'revision_requested')) {
          await post(
            id,
            ids,
            '**修正依頼**\n' + message + '\n\n修正後は下のボタンから納品してください。',
            button(thumb ? 'thumb' : 'video', ref)
          );
        } else if (type === (thumb ? 'thumbnail_approved' : 'approved')) {
          await post(
            id,
            ids,
            thumb
              ? 'サムネを確認しました！制作ありがとうございます！'
              : 'プロジェクト確認しました！\nOKなのでこちらで納品とさせていただきます。\n素敵な編集ありがとうございます！'
          );
        }
      }
      await e.ref.update({ status: 'sent', sentAt: FieldValue.serverTimestamp() });
    } catch (error) {
      await e.ref.update({
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);
