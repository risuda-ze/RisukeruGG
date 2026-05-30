import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { generateSystemPrompt } from '@/lib/ai/systemPrompt';
import { hasProposal, extractProposals, stripProposalBlocks } from '@/lib/ai/parseProposal';
import { sendFollowUp, sendProposalMessage } from '../discordFollowUp';
import {
  getSession,
  upsertSession,
  deleteSession,
  isSessionExpired,
} from '../sessionManager';

/**
 * Discord の Deferred Response 後に呼び出すバックグラウンド処理。
 * チームの特定は guildId → teams/{teamId}/discord/config の照合で行う。
 * 個人ユーザーの特定は行わない（セッションはサーバー単位で共有）。
 */
export async function handleAiConversation(
  guildId: string,
  userMessage: string,
  appId: string,
  token: string
): Promise<void> {
  const db = getAdminFirestore();
  const domain = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://risukeru.gg';

  // ─── リセットコマンド ─────────────────────────────────────
  if (userMessage === 'リセット' || userMessage.toLowerCase() === 'reset') {
    await deleteSession(guildId);
    await sendFollowUp(appId, token, '会話をリセットしたよ！また気軽に話しかけてね。');
    return;
  }

  // ─── guild_id → teamId の解決 ────────────────────────────
  // teams/{teamId}/discord/config の guildId フィールドと照合する
  const discordConfigSnap = await db
    .collectionGroup('discord')
    .where('guildId', '==', guildId)
    .limit(1)
    .get();

  if (discordConfigSnap.empty) {
    // このDiscordサーバーはRisukeruGGと未連携
    await sendFollowUp(
      appId,
      token,
      `このDiscordサーバーはRisukeruGGと連携されていないよ！\n` +
        `チーム設定からBotを招待してね → ${domain}/team`
    );
    return;
  }

  const configDoc = discordConfigSnap.docs[0]!;
  // サブコレクション（discord）の親（teams/{teamId}）のIDを取得
  const teamId = configDoc.ref.parent.parent?.id;
  if (!teamId) {
    await sendFollowUp(appId, token, 'チームの特定に失敗しました。サポートにお問い合わせください。');
    return;
  }

  // ─── セッション取得 / タイムアウト確認 ─────────────────────
  let session = await getSession(guildId);

  // 30分タイムアウト or チームが変わっていたらセッションリセット
  if (session && (isSessionExpired(session) || session.teamId !== teamId)) {
    await deleteSession(guildId);
    session = null;
  }

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...(session?.messages ?? []),
    { role: 'user', content: userMessage },
  ];

  // ─── チームデータ取得（AI コンテキスト生成用） ───────────────
  const [membersSnap, schedulesSnap, tasksSnap, collabsSnap, columnsSnap] = await Promise.all([
    db.collection(`teams/${teamId}/members`).get(),
    db.collection(`teams/${teamId}/schedules`).orderBy('startAt').limit(50).get(),
    db.collection(`teams/${teamId}/tasks`).limit(50).get(),
    db.collection(`teams/${teamId}/collabSessions`).limit(20).get(),
    db.collection(`teams/${teamId}/kanbanColumns`).orderBy('order').get(),
  ]);

  const members = membersSnap.docs.map((d) => ({
    userId: d.id,
    displayName: d.data().displayName as string,
    role: d.data().role as string,
  }));

  const schedules = schedulesSnap.docs.map((d) => {
    const data = d.data();
    const startAt = (data.startAt as { toDate: () => Date }).toDate();
    const endAt = (data.endAt as { toDate: () => Date }).toDate();
    return {
      title: data.title as string,
      startAt: startAt.toLocaleString('ja-JP'),
      endAt: endAt.toLocaleString('ja-JP'),
      allDay: (data.allDay as boolean) ?? false,
    };
  });

  const tasksList = tasksSnap.docs.map((d) => {
    const data = d.data();
    const col = columnsSnap.docs.find((c) => c.id === data.columnId);
    const assignee = members.find((m) => m.userId === data.assigneeId);
    return {
      title: data.title as string,
      columnName: col?.data().name as string | undefined,
      assigneeName: assignee?.displayName,
      dueDate: data.dueDate
        ? (data.dueDate as { toDate: () => Date }).toDate().toISOString().split('T')[0]
        : undefined,
    };
  });

  const collabs = collabsSnap.docs.map((d) => ({
    title: d.data().title as string,
    partnerName: d.data().partnerName as string,
    status: d.data().status as string,
  }));

  const columns = columnsSnap.docs.map((d) => ({
    id: d.id,
    name: d.data().name as string,
  }));

  const todayDate = new Date();
  const today = todayDate.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
  const todayISO = todayDate.toISOString().split('T')[0]!;

  const systemPrompt = generateSystemPrompt(
    { tasks: tasksList, schedules, collabs, members, columns },
    today,
    todayISO
  );

  // ─── Claude haiku 呼び出し（non-streaming） ───────────────
  const { text: aiReply } = await generateText({
    model: anthropic('claude-haiku-4-5'),
    system: systemPrompt,
    messages,
  });

  // ─── %%PROPOSAL%% チェック ──────────────────────────────
  const proposals = hasProposal(aiReply) ? extractProposals(aiReply) : [];
  const replyText = stripProposalBlocks(aiReply);

  // ─── セッション更新 ─────────────────────────────────────
  const updatedMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...messages,
    { role: 'assistant', content: aiReply },
  ];

  // メッセージ履歴は最大20件に制限（古いものを削除）
  const trimmedMessages = updatedMessages.slice(-20);

  if (proposals.length > 0) {
    // %%PROPOSAL%% あり: pendingProposal にマージして保存
    await upsertSession(guildId, {
      guildId,
      teamId,
      messages: trimmedMessages,
      pendingProposal: proposals[0] as unknown as Record<string, unknown>,
    });
    // テキスト部分があれば先に送信
    if (replyText) {
      await sendFollowUp(appId, token, replyText);
    }
    await sendProposalMessage(appId, token, proposals, guildId);
  } else {
    // 通常の会話: セッション更新してテキスト返信
    await upsertSession(guildId, {
      guildId,
      teamId,
      messages: trimmedMessages,
    });
    await sendFollowUp(appId, token, aiReply);
  }
}
