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

/** Discord の Deferred Response 後に呼び出すバックグラウンド処理 */
export async function handleAiConversation(
  discordUserId: string,
  userMessage: string,
  appId: string,
  token: string
): Promise<void> {
  const db = getAdminFirestore();

  // ─── リセットコマンド ─────────────────────────────────────
  if (userMessage === 'リセット' || userMessage.toLowerCase() === 'reset') {
    await deleteSession(discordUserId);
    await sendFollowUp(appId, token, '会話をリセットしたよ！また気軽に話しかけてね。');
    return;
  }

  // ─── Discord ユーザー → RisukeruGG ユーザー解決 ──────────
  const usersSnap = await db
    .collection('users')
    .where('discord.userId', '==', discordUserId)
    .limit(1)
    .get();

  if (usersSnap.empty) {
    const domain = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://リスケるGG';
    await sendFollowUp(
      appId,
      token,
      `Discord アカウントが RisukeruGG と連携されていないよ！\n` +
        `まず設定画面でアカウントを連携してね → ${domain}/settings#discord`
    );
    return;
  }

  const userDoc = usersSnap.docs[0]!;
  const risukeruUserId = userDoc.id;
  const userData = userDoc.data();
  const teamId = userData.currentTeamId as string | null;

  if (!teamId) {
    await sendFollowUp(appId, token, 'チームに参加していないよ！まず RisukeruGG でチームに参加してね。');
    return;
  }

  // ─── セッション取得 / タイムアウト確認 ─────────────────────
  let session = await getSession(discordUserId);

  // 30分タイムアウト or 別チームになっていたらセッションリセット
  if (session && (isSessionExpired(session) || session.teamId !== teamId)) {
    await deleteSession(discordUserId);
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
    await upsertSession(discordUserId, {
      discordUserId,
      risukeruUserId,
      teamId,
      messages: trimmedMessages,
      pendingProposal: proposals[0] as unknown as Record<string, unknown>,
    });
    // テキスト部分があれば先に送信
    if (replyText) {
      await sendFollowUp(appId, token, replyText);
    }
    await sendProposalMessage(appId, token, proposals, discordUserId);
  } else {
    // 通常の会話: セッション更新してテキスト返信
    await upsertSession(discordUserId, {
      discordUserId,
      risukeruUserId,
      teamId,
      messages: trimmedMessages,
    });
    await sendFollowUp(appId, token, aiReply);
  }
}
