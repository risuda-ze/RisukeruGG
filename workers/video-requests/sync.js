import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

function threadUrl(thread) {
  return `https://discord.com/channels/${thread.guildId}/${thread.id}`;
}

function trimThreadName(name) {
  const normalized = String(name || '').trim() || '編集依頼';
  return normalized.length <= 100 ? normalized : `${normalized.slice(0, 97)}...`;
}

function formatDate(value) {
  if (!value) return '（未設定）';
  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? '（未設定）' : date.toLocaleDateString('ja-JP');
}

function formatMentions(ids = []) {
  return ids.length ? ids.map((id) => `<@${id}>`).join(' ') : '（担当者メンションなし）';
}

function createDb() {
  const useEmulator = process.env.RISUKERU_USE_EMULATOR === 'true';
  if (!process.env.RISUKERU_TEAM_ID || (!useEmulator && !process.env.FIREBASE_SERVICE_ACCOUNT_JSON))
    return null;
  if (!getApps().length) {
    if (useEmulator) {
      // ローカル検証ではサービスアカウントを使わず、RisukeruGG側のEmulatorへ接続する。
      process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
      initializeApp({ projectId: process.env.RISUKERU_FIREBASE_PROJECT_ID || 'demo-risukeru' });
    } else {
      initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)) });
    }
  }
  return getFirestore();
}

function makeDeliveryButton(requestId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        // v2 は旧Botの video_delivery: ハンドラーと衝突しない。
        .setCustomId(`video_delivery_v2:${requestId}`)
        .setLabel('納品URLを追加・再納品')
        .setStyle(ButtonStyle.Success)
    ),
  ];
}

function thumbnailButton(id) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('thumbnail_delivery:' + id)
        .setLabel('サムネを納品')
        .setStyle(ButtonStyle.Success)
    ),
  ];
}

function makeDeliveryModal(requestId) {
  return new ModalBuilder()
    .setCustomId(`video_delivery_v2_modal:${requestId}`)
    .setTitle('納品URLを追加・再納品')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('delivery_url')
          .setLabel('ギガファイル便のURL')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(1000)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('delivery_note')
          .setLabel('納品時の共有事項（任意）')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setMaxLength(2000)
      )
    );
}

function makeUpdateMessage(changes) {
  return [
    '**依頼内容を更新しました**',
    '',
    ...changes.flatMap((change, index) => [
      `**${change.label}**`,
      change.value,
      ...(index === changes.length - 1 ? [] : ['']),
    ]),
  ].join('\n');
}

/** 自宅PCで動くBotからFirestoreを監視し、動画依頼をDiscordへ反映する。 */
export function startRisukeruVideoRequestSync(config) {
  const db = createDb();
  const teamId = process.env.RISUKERU_TEAM_ID;
  if (!db || !teamId) {
    console.log('RisukeruGG動画依頼連携は未設定です');
    return null;
  }
  const {
    client,
    guildId,
    targetChannelId,
    fallbackSourceChannelId,
    editorChannelMap,
    archiveDuration,
    thumbnailMentionIdsLong,
    thumbnailMentionIdsShort,
  } = config;

  const channelForUser = (userId) => {
    const channelId = editorChannelMap[userId] || fallbackSourceChannelId;
    if (!channelId) throw new Error(`${userId} に対応する編集者用チャンネルが設定されていません`);
    return channelId;
  };
  const fetchChannel = async (id) => {
    const channel = await client.channels.fetch(id);
    if (!channel) throw new Error(`チャンネル ${id} を取得できません`);
    return channel;
  };
  const resolveEditorDiscordIds = async (request) => {
    if (!request.editorMemberIds?.length) return request.editorDiscordIds || [];
    const guild = await client.guilds.fetch(guildId);
    const ids = [];
    for (const memberId of request.editorMemberIds) {
      const memberRef = db.doc(`teams/${teamId}/members/${memberId}`);
      const memberSnap = await memberRef.get();
      if (!memberSnap.exists) throw new Error('選択された担当者がRisukeruGGチームに見つかりません');
      const member = memberSnap.data();
      if (member.discordUserId) {
        ids.push(member.discordUserId);
        continue;
      }
      if (!member.discordUsername)
        throw new Error(`${member.displayName} のDiscordユーザー名が未登録です`);
      const found = await guild.members.search({ query: member.discordUsername, limit: 10 });
      const discordMember = found.find((item) => item.user.username === member.discordUsername);
      if (!discordMember)
        throw new Error(`Discordサーバー内に @${member.discordUsername} が見つかりません`);
      await memberRef.update({ discordUserId: discordMember.id });
      ids.push(discordMember.id);
    }
    return [...new Set(ids)];
  };
  const createEditorThreads = async (request) => {
    const ids = request.editorDiscordIds || [];
    const channelIds = [...new Set(ids.map(channelForUser))];
    const threads = [];
    for (const channelId of channelIds) {
      const channel = await fetchChannel(channelId);
      if (channel.type !== ChannelType.GuildText)
        throw new Error(`${channelId} はテキストチャンネルではありません`);
      const thread = await channel.threads.create({
        name: trimThreadName(request.title),
        autoArchiveDuration: archiveDuration,
        reason: `RisukeruGG動画依頼: ${request.title}`,
      });
      const assigned = ids.filter((id) => channelForUser(id) === channelId);
      await thread.send(
        [
          formatMentions(assigned),
          '',
          request.videoType === 'short'
            ? 'お疲れ様です！ショート動画の編集をお願いいたします！'
            : 'お疲れ様です！横動画の編集をお願いいたします！',
          '',
          '**編集内容**',
          request.summary || '（なし）',
          '',
          '**プロマネ**',
          request.projectManagementUrl || '（リンクなし）',
          '',
          '**共有事項**',
          request.notes || '（なし）',
        ].join('\n')
      );
      await thread.send({
        content: '納品時はこのボタンからギガファイル便URLを登録してください。',
        components: makeDeliveryButton(request.id),
      });
      threads.push(thread);
    }
    return threads;
  };
  const createThumbnailThread = async (request, editorThreads) => {
    const target = await fetchChannel(targetChannelId);
    if (target.type !== ChannelType.GuildText)
      throw new Error('TARGET_CHANNEL_ID はテキストチャンネルを指定してください');
    const thread = await target.threads.create({
      name: trimThreadName(request.title),
      autoArchiveDuration: archiveDuration,
      reason: `動画依頼 ${request.title} のサムネ・タイトル案`,
    });
    const ids = request.videoType === 'short' ? thumbnailMentionIdsShort : thumbnailMentionIdsLong;
    await thread.send(
      [
        formatMentions(ids),
        'サムネイルの制作をお願いします。',
        '',
        `タイトル案（仮）：${request.titleIdea || '（未入力）'}`,
        '',
        `納期：${formatDate(request.finalPackageDueAt)}`,
        '',
        '編集依頼スレッド:',
        ...editorThreads.map(threadUrl),
      ].join('\n')
    );
    if (request.thumbnailTaskId) {
      await thread.send({
        content: 'このスレッドに画像を投稿してから「サムネを納品」を押してください。',
        components: thumbnailButton(request.id),
      });
    }
    return thread;
  };
  const processRequest = async (snap) => {
    const request = { id: snap.id, ...snap.data() };
    if (request.discord?.status !== 'queued') return;
    const claimed = await db.runTransaction(async (tx) => {
      const latest = await tx.get(snap.ref);
      if (!latest.exists || latest.data()?.discord?.status !== 'queued') return false;
      tx.update(snap.ref, {
        'discord.status': 'creating',
        updatedAt: FieldValue.serverTimestamp(),
      });
      return true;
    });
    if (!claimed) return;
    try {
      request.editorDiscordIds = await resolveEditorDiscordIds(request);
      await snap.ref.update({
        editorDiscordIds: request.editorDiscordIds,
        updatedAt: FieldValue.serverTimestamp(),
      });
      const progressId =
        request.progressTaskColumnId ??
        (await db.doc(`teams/${teamId}/settings/videoRequests`).get()).get('progressColumnId');
      if (!progressId || !(await db.doc(`teams/${teamId}/taskStatuses/${progressId}`).get()).exists)
        throw new Error('カテゴリ設定で制作中の列を指定してください');
      const editorThreads = await createEditorThreads(request);
      const thumbnailThread = request.thumbnailTaskId
        ? await createThumbnailThread(request, editorThreads)
        : null;
      const batch = db.batch();
      for (const taskId of [request.taskId, request.thumbnailTaskId].filter(Boolean)) {
        batch.update(db.doc(`teams/${teamId}/tasks/${taskId}`), {
          columnId: progressId,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      batch.update(snap.ref, {
        status: 'in_progress',
        ...(request.thumbnailTaskId ? { thumbnailStatus: 'in_progress' } : {}),
        discord: {
          status: 'created',
          editorThreadIds: editorThreads.map((thread) => thread.id),
          editorThreadUrls: editorThreads.map(threadUrl),
          thumbnailThreadId: thumbnailThread?.id ?? null,
          thumbnailThreadUrl: thumbnailThread ? threadUrl(thumbnailThread) : null,
          error: null,
        },
        updatedAt: FieldValue.serverTimestamp(),
      });
      await batch.commit();
    } catch (error) {
      console.error('動画依頼のDiscord作成に失敗しました:', error);
      await snap.ref.update({
        'discord.status': 'failed',
        'discord.error': error instanceof Error ? error.message : String(error),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  };

  db.collection(`teams/${teamId}/videoRequests`).onSnapshot((snapshot) => {
    snapshot
      .docChanges()
      .filter((change) => change.type !== 'removed')
      .forEach((change) => processRequest(change.doc));
  });
  // queued は差分通知対応Bot専用。旧Botの pending 監視と混在させない。
  db.collectionGroup('discordEvents')
    .where('status', '==', 'queued')
    .onSnapshot(async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type !== 'added') continue;
        const requestRef = change.doc.ref.parent.parent;
        if (!requestRef || !requestRef.path.startsWith(`teams/${teamId}/`)) continue;

        const claimed = await db.runTransaction(async (tx) => {
          const latest = await tx.get(change.doc.ref);
          if (!latest.exists || latest.data()?.status !== 'queued') return false;
          tx.update(change.doc.ref, { status: 'sending', updatedAt: FieldValue.serverTimestamp() });
          return true;
        });
        if (!claimed) continue;
        try {
          const request = await requestRef.get();
          const requestData = request.data();
          const event = change.doc.data();
          if (event.type === 'thumbnail_revision' || event.type === 'thumbnail_approved') {
            const thread = await fetchChannel(requestData.discord.thumbnailThreadId);
            const ids =
              requestData.videoType === 'short'
                ? thumbnailMentionIdsShort
                : thumbnailMentionIdsLong;
            const revise = event.type === 'thumbnail_revision';
            await thread.send({
              content: revise
                ? `${formatMentions(ids)}\n\n**修正依頼**\n${event.message}\n\n修正した画像をこのスレッドに投稿してから、下の「サムネを納品」を押してください。`
                : `${formatMentions(ids)}\nサムネを確認しました！制作ありがとうございます！`,
              components: revise ? thumbnailButton(requestRef.id) : [],
              allowedMentions: { users: ids },
            });
            await change.doc.ref.update({ status: 'sent', sentAt: FieldValue.serverTimestamp() });
            continue;
          }
          const updates = Array.isArray(event.changes) ? event.changes : [];
          const editorChanges = updates.filter(
            (item) => item.target === 'editor' || item.target === 'both'
          );
          for (const url of requestData?.discord?.editorThreadUrls || []) {
            const threadId = url.split('/').pop();
            if (!threadId) continue;
            const thread = await fetchChannel(threadId);
            const editorMentions = formatMentions(requestData.editorDiscordIds || []);
            if (event.type === 'request_updated') {
              if (updates.some((item) => item.label === 'タイトル'))
                await thread.setName(trimThreadName(requestData.title));
              if (editorChanges.length)
                await thread.send(`${editorMentions}\n\n${makeUpdateMessage(editorChanges)}`);
            } else if (event.type === 'approved') {
              await thread.send(
                `${editorMentions}\n\nプロジェクト確認しました！\nOKなのでこちらで納品とさせていただきます。\n素敵な編集ありがとうございます！`
              );
            } else {
              await thread.send({
                content: `${editorMentions}\n\n**修正依頼**\n${event.message}\n\n修正後の納品は、下のボタンからURLと共有事項を登録してください。`,
                components: makeDeliveryButton(requestRef.id),
              });
            }
          }
          const thumbnailChanges = updates.filter(
            (item) => item.target === 'thumbnail' || item.target === 'both'
          );
          if (
            event.type === 'request_updated' &&
            requestData?.discord?.thumbnailThreadId &&
            thumbnailChanges.length
          ) {
            const thumbnailThread = await fetchChannel(requestData.discord.thumbnailThreadId);
            if (updates.some((item) => item.label === 'タイトル'))
              await thumbnailThread.setName(trimThreadName(requestData.title));
            const thumbnailIds =
              requestData.videoType === 'short'
                ? thumbnailMentionIdsShort
                : thumbnailMentionIdsLong;
            await thumbnailThread.send(
              `${formatMentions(thumbnailIds)}\n\n${makeUpdateMessage(thumbnailChanges)}`
            );
          }
          await change.doc.ref.update({
            status: 'sent',
            sentAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        } catch (error) {
          console.error('動画依頼のDiscord通知に失敗しました:', error);
          await change.doc.ref.update({
            status: 'failed',
            error: error instanceof Error ? error.message : String(error),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }
    });
  return db;
}

export async function handleRisukeruVideoRequestInteraction(interaction, db, config) {
  if (interaction.isButton() && interaction.customId.startsWith('thumbnail_delivery:')) {
    await interaction.deferReply({ ephemeral: true });
    const id = interaction.customId.slice('thumbnail_delivery:'.length);
    const team = db.collection('teams').doc(process.env.RISUKERU_TEAM_ID);
    const ref = team.collection('videoRequests').doc(id);
    const messages = await interaction.channel.messages.fetch({ limit: 100 });
    const image = messages.find(
      (message) =>
        message.author.id === interaction.user.id &&
        BigInt(message.id) > BigInt(interaction.message.id) &&
        message.attachments.some((file) => file.contentType?.startsWith('image/'))
    );
    if (!image) {
      await interaction.editReply('このスレッドに画像を直接投稿してから、もう一度押してください。');
      return true;
    }
    const result = await db.runTransaction(async (tx) => {
      const data = (await tx.get(ref)).data();
      if (!data?.thumbnailTaskId || data.discord?.thumbnailThreadId !== interaction.channelId)
        return 'このスレッドに対応するサムネ依頼がありません。';
      if (data.thumbnailStatus !== 'in_progress') return '現在は納品を受け付けていません。';
      if (data.thumbnailMessageId && BigInt(image.id) <= BigInt(data.thumbnailMessageId))
        return '修正した画像を新しく投稿してください。';
      const now = FieldValue.serverTimestamp();
      tx.update(ref, {
        thumbnailStatus: 'review_requested',
        thumbnailMessageId: image.id,
        thumbnailMessageUrl: image.url,
        updatedAt: now,
      });
      tx.update(team.collection('tasks').doc(data.thumbnailTaskId), {
        columnId: data.reviewTaskColumnId,
        updatedAt: now,
      });
      return {
        isRevision: Boolean(data.thumbnailMessageId),
        mentionIds:
          data.videoType === 'short'
            ? config.thumbnailMentionIdsShort
            : config.thumbnailMentionIdsLong,
      };
    });
    if (typeof result === 'string') {
      await interaction.editReply(result);
      return true;
    }
    try {
      await interaction.channel.send({
        content: [
          result.mentionIds.map((id) => `<@${id}>`).join(' '),
          result.isRevision ? '修正ありがとう！' : 'サムネの納品ありがとう！',
          '確認するので待っててクレヨン',
        ]
          .filter(Boolean)
          .join('\n'),
        allowedMentions: { users: result.mentionIds },
      });
    } catch (error) {
      console.error('サムネ納品のお礼を投稿できませんでした', error);
      await interaction.editReply('サムネは納品済みです。スレッドへのお礼の投稿に失敗しました。');
      return true;
    }
    await interaction.editReply('サムネを納品しました！確認されるまでお待ちください。');
    return true;
  }
  if (interaction.isButton() && interaction.customId.startsWith('video_delivery_v2:')) {
    await interaction.showModal(
      makeDeliveryModal(interaction.customId.slice('video_delivery_v2:'.length))
    );
    return true;
  }
  if (interaction.isModalSubmit() && interaction.customId.startsWith('video_delivery_v2_modal:')) {
    if (!db || !process.env.RISUKERU_TEAM_ID)
      throw new Error('RisukeruGG動画依頼連携が設定されていません');
    const url = interaction.fields.getTextInputValue('delivery_url').trim();
    const note = interaction.fields.getTextInputValue('delivery_note').trim();
    if (!/^https?:\/\//.test(url))
      throw new Error('http:// または https:// で始まるURLを入力してください');
    const requestId = interaction.customId.slice('video_delivery_v2_modal:'.length);
    const requestRef = db.doc(`teams/${process.env.RISUKERU_TEAM_ID}/videoRequests/${requestId}`);
    const request = await requestRef.get();
    if (!request.exists) throw new Error('動画依頼が見つかりません');
    const data = request.data();
    if (
      !data.discord?.editorThreadIds?.includes(interaction.channelId) ||
      data.status === 'completed'
    )
      throw new Error('このスレッドでは納品を受け付けていません');
    const receiptRef = requestRef.collection('deliveryInteractions').doc(interaction.id);
    const processed = await db.runTransaction(async (tx) => {
      if ((await tx.get(receiptRef)).exists) return false;
      if ((await tx.get(requestRef)).get('status') === 'completed')
        throw new Error('すでに完了しています');
      const delivery = { url, note: note || null };
      tx.set(receiptRef, { createdAt: FieldValue.serverTimestamp(), url, note: note || null });
      tx.update(requestRef, {
        status: 'review_requested',
        deliveryUrls: FieldValue.arrayUnion(url),
        deliveries: FieldValue.arrayUnion(delivery),
        updatedAt: FieldValue.serverTimestamp(),
      });
      if (data.taskId && data.reviewTaskColumnId) {
        tx.update(db.doc(`teams/${process.env.RISUKERU_TEAM_ID}/tasks/${data.taskId}`), {
          columnId: data.reviewTaskColumnId,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      return true;
    });
    if (!processed) return true;
    const deliveryCount = [...new Set([...(data.deliveryUrls || []), url])].length;
    const message =
      deliveryCount === 1
        ? '初稿が納品完了丸！ありがとうございます！\n確認されるまでお待ちください。'
        : '修正ファイルの納品ありがとうございます！\nさっそく確認します！';
    await interaction.reply({
      content: `${message}\n\n納品ファイル：${url}${note ? `\n共有事項：${note}` : ''}`,
      ephemeral: false,
    });
    return true;
  }
  return false;
}
