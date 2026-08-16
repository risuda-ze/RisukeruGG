import { getAdminFirestore } from '@/lib/firebase/admin';
import { sendFollowUp } from '../discordFollowUp';
import { getSession, deleteSession, clearPendingProposals } from '../sessionManager';
import { registerSchedule } from '../register/registerSchedule';
import { registerTask } from '../register/registerTask';
import { registerTaskUpdate } from '../register/registerTaskUpdate';
import { registerCollab } from '../register/registerCollab';
import { ProposalDataSchema } from '@/lib/ai/parseProposal';

interface ButtonClickParams {
  action: 'confirm' | 'revise' | 'cancel';
  guildId: string;
  discordUserId: string;
  appId: string;
  token: string;
}

/**
 * Discord ボタンクリック処理。
 * confirm / revise / cancel の 3 種類のアクションを処理する。
 * セッションキーは guildId（サーバー単位）。
 * confirm/revise はプロポーザルを発行した Discord ユーザー本人のみ操作可能。
 */
export async function handleButtonClick({
  action,
  guildId,
  discordUserId,
  appId,
  token,
}: ButtonClickParams): Promise<void> {
  const session = await getSession(guildId);

  if (!session) {
    await sendFollowUp(appId, token, 'セッションが見つかりません。`/risukerugg message:リセット` で再開してください。');
    return;
  }

  // ─── 操作権限チェック（confirm / revise は発行者本人のみ） ──────────────────
  if (action === 'confirm' || action === 'revise') {
    const initiator = session.initiatorDiscordUserId;
    if (initiator && discordUserId && initiator !== discordUserId) {
      await sendFollowUp(
        appId,
        token,
        '❌ この操作はプロポーザルを発行した本人のみが実行できます。'
      );
      return;
    }
  }

  if (action === 'cancel') {
    await deleteSession(guildId);
    await sendFollowUp(appId, token, 'キャンセルしたよ！また何かあれば声をかけてね。');
    return;
  }

  if (action === 'revise') {
    // 確認待ちプロポーザルのみ削除して会話履歴は保持
    // 次の /risukerugg で修正指示を送れる状態にする
    await clearPendingProposals(guildId);
    await sendFollowUp(
      appId,
      token,
      'どこを修正する？（例: 時間を変えたい、タイトルを変えたい）\n修正したい点を `/risukerugg message:〇〇` で教えてね！'
    );
    return;
  }

  // confirm: pendingProposals を取得して全件登録処理
  if (!session.pendingProposals || session.pendingProposals.length === 0) {
    await sendFollowUp(appId, token, '登録する内容が見つかりませんでした。もう一度 AI に依頼してみてください。');
    return;
  }

  // Zod で全件再検証（セッション保存後に型が変化した場合やプロンプトインジェクション経由のデータを拒否）
  // 1件でも無効ならセッションごと破棄する（部分登録による意図しない状態を避ける）
  const proposals = [];
  for (const raw of session.pendingProposals) {
    const validationResult = ProposalDataSchema.safeParse(raw);
    if (!validationResult.success) {
      await sendFollowUp(appId, token, '登録データが無効です。もう一度 AI に依頼してみてください。');
      await deleteSession(guildId);
      return;
    }
    proposals.push(validationResult.data);
  }

  const db = getAdminFirestore();

  // チームのメンバーとカラム情報を取得（名前→ID 解決のため）
  const membersSnap = await db.collection(`teams/${session.teamId}/members`).get();
  const members = membersSnap.docs.map((d) => ({
    userId: d.id,
    displayName: d.data().displayName as string,
  }));

  // タスク提案・タスク更新が含まれる場合のみカラム一覧を取得する
  let columns: Array<{ id: string; name: string }> = [];
  if (proposals.some((p) => p.type === 'task' || p.type === 'task_update')) {
    const columnsSnap = await db.collection(`teams/${session.teamId}/taskStatuses`).get();
    columns = columnsSnap.docs.map((d) => ({
      id: d.id,
      name: d.data().name as string,
    }));
  }

  // タスク更新が含まれる場合のみカテゴリ一覧を取得する（categoryName 解決用）
  let categories: Array<{ id: string; name: string }> = [];
  if (proposals.some((p) => p.type === 'task_update')) {
    const categoriesSnap = await db.collection(`teams/${session.teamId}/categories`).get();
    categories = categoriesSnap.docs.map((d) => ({
      id: d.id,
      name: d.data().name as string,
    }));
  }

  try {
    // 全件を順に登録し、完了メッセージを積み上げる
    const completionLines: string[] = [];
    for (const proposal of proposals) {
      if (proposal.type === 'schedule') {
        const id = await registerSchedule(session.teamId, proposal, members);
        completionLines.push(`✅ スケジュール「${proposal.title}」を登録したよ！（ID: ${id}）`);
      } else if (proposal.type === 'task') {
        const id = await registerTask(session.teamId, proposal, members, columns);
        completionLines.push(`✅ タスク「${proposal.title}」を登録したよ！（ID: ${id}）`);
      } else if (proposal.type === 'task_update') {
        const title = await registerTaskUpdate(
          session.teamId,
          proposal,
          members,
          columns,
          categories
        );
        completionLines.push(`✏️ タスク「${title}」を更新したよ！`);
      } else {
        const id = await registerCollab(session.teamId, proposal);
        completionLines.push(`✅ コラボ調整「${proposal.title}」を登録したよ！（ID: ${id}）`);
      }
    }

    // 登録完了後にセッションを削除（新しい会話として再スタート）
    await deleteSession(guildId);
    await sendFollowUp(appId, token, completionLines.join('\n'));
  } catch (err) {
    console.error('Discord Bot 登録エラー:', err);
    await sendFollowUp(appId, token, '登録中にエラーが発生しました。もう一度試してみてください。');
  }
}
