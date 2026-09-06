import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { generateSystemPrompt } from '@/lib/ai/systemPrompt';
import { hasProposal, extractProposals, stripProposalBlocks } from '@/lib/ai/parseProposal';
import { sendFollowUp, sendProposalMessage } from '../discordFollowUp';
import { getSession, upsertSession, deleteSession, isSessionExpired } from '../sessionManager';
import { getEventLastDay } from '@/lib/utils/eventDays';

/**
 * Discord の Deferred Response 後に呼び出すバックグラウンド処理。
 * チームの特定は guildId → teams/{teamId}/discord/config の照合で行う。
 * 個人ユーザーの特定は行わない（セッションはサーバー単位で共有）。
 */
export async function handleAiConversation(
  guildId: string,
  userMessage: string,
  discordUserId: string,
  appId: string,
  token: string
): Promise<void> {
  try {
    await runAiConversation(guildId, userMessage, discordUserId, appId, token);
  } catch (err) {
    // waitUntil() から呼ばれるため、ここで例外を握り潰すと Discord には
    // フォローアップが届かず「アプリケーションが応答しませんでした」になる。
    // 必ずログに残し、ユーザーにもエラーを返して沈黙タイムアウトを防ぐ。
    console.error('[discord] handleAiConversation で例外:', err);
    await sendFollowUp(
      appId,
      token,
      'ごめん、処理中にエラーが起きちゃった…。時間をおいてもう一度試してみてね。'
    ).catch((e) => console.error('[discord] エラー通知の送信にも失敗:', e));
  }
}

async function runAiConversation(
  guildId: string,
  userMessage: string,
  discordUserId: string,
  appId: string,
  token: string
): Promise<void> {
  // AI 呼び出しに必須のキーが無い場合は、例外で沈黙する前に明示的に案内する
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[discord] ANTHROPIC_API_KEY が未設定です');
    await sendFollowUp(
      appId,
      token,
      'AI機能の設定が未完了のようです。管理者に連絡してね（ANTHROPIC_API_KEY 未設定）。'
    );
    return;
  }

  const db = getAdminFirestore();
  const domain =
    process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://risukeru.gg';

  // ─── プロンプトインジェクション対策 ──────────────────────────
  // %%PROPOSAL%% マーカーを含むメッセージは AI 出力フォーマットの偽装を試みる可能性がある
  if (userMessage.includes('%%PROPOSAL%%') || userMessage.includes('%%/PROPOSAL%%')) {
    await sendFollowUp(appId, token, '申し訳ありませんが、そのメッセージは処理できません。');
    return;
  }
  // メッセージ長を 2000 文字に制限してトークン過剰消費・コンテキスト汚染を防ぐ
  const sanitizedMessage = userMessage.slice(0, 2000);

  // ─── リセットコマンド ─────────────────────────────────────
  if (sanitizedMessage === 'リセット' || sanitizedMessage.toLowerCase() === 'reset') {
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
    await sendFollowUp(
      appId,
      token,
      'チームの特定に失敗しました。サポートにお問い合わせください。'
    );
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
    { role: 'user', content: sanitizedMessage },
  ];

  // ─── チームデータ取得（AI コンテキスト生成用） ───────────────
  const [membersSnap, schedulesSnap, tasksSnap, collabsSnap, columnsSnap, categoriesSnap] =
    await Promise.all([
      db.collection(`teams/${teamId}/members`).get(),
      db.collection(`teams/${teamId}/schedules`).orderBy('startAt').limit(50).get(),
      db.collection(`teams/${teamId}/tasks`).limit(50).get(),
      db.collection(`teams/${teamId}/collabSessions`).limit(20).get(),
      db.collection(`teams/${teamId}/taskStatuses`).orderBy('order').get(),
      db.collection(`teams/${teamId}/categories`).get(),
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
    const allDay = (data.allDay as boolean) ?? false;
    /* 終日予定は排他的終了（翌日00:00）のため、AIには「含まれる最終日」を渡す */
    const displayEnd = allDay ? getEventLastDay({ startAt, endAt }) : endAt;
    return {
      title: data.title as string,
      startAt: startAt.toLocaleString('ja-JP'),
      endAt: displayEnd.toLocaleString('ja-JP'),
      allDay,
    };
  });

  const categoriesList = categoriesSnap.docs.map((d) => ({
    id: d.id,
    name: d.data().name as string,
  }));

  const tasksList = tasksSnap.docs.map((d) => {
    const data = d.data();
    const col = columnsSnap.docs.find((c) => c.id === data.columnId);
    const assignee = members.find((m) => m.userId === data.assigneeId);
    const rawComments = (data.comments as Array<{ authorName?: string; text?: string }> | undefined) ?? [];
    return {
      id: d.id,
      title: data.title as string,
      columnName: col?.data().name as string | undefined,
      assigneeName: assignee?.displayName,
      dueDate: data.dueDate
        ? (data.dueDate as { toDate: () => Date }).toDate().toISOString().split('T')[0]
        : undefined,
      description: (data.description as string | null | undefined) ?? undefined,
      categoryName: categoriesList.find((c) => c.id === data.categoryId)?.name,
      comments: rawComments.map((c) => ({
        authorName: c.authorName ?? '不明',
        text: c.text ?? '',
      })),
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
    {
      tasks: tasksList,
      schedules,
      collabs,
      members,
      columns,
      categories: categoriesList.map((c) => ({ name: c.name })),
    },
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
    // %%PROPOSAL%% あり: 全件を pendingProposals に保存（複数提案は全件登録対象）
    // initiatorDiscordUserId を記録し、confirm/revise/cancel を発行者本人のみに制限する
    await upsertSession(guildId, {
      guildId,
      teamId,
      messages: trimmedMessages,
      pendingProposals: proposals as unknown as Array<Record<string, unknown>>,
      initiatorDiscordUserId: discordUserId,
    });
    // テキスト部分があれば先に送信
    if (replyText) {
      await sendFollowUp(appId, token, replyText);
    }
    // task_update の差分表示用に現在のタスク一覧を渡す
    await sendProposalMessage(appId, token, proposals, guildId, tasksList);
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
