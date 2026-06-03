import { getAdminFirestore } from '@/lib/firebase/admin';
import { sendFollowUp } from '../discordFollowUp';
import { getSession, deleteSession, upsertSession } from '../sessionManager';
import { registerSchedule } from '../register/registerSchedule';
import { registerTask } from '../register/registerTask';
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
    // pendingProposal のみ削除して会話履歴は保持
    // 次の /risukerugg で修正指示を送れる状態にする
    await upsertSession(guildId, {
      guildId: session.guildId,
      teamId: session.teamId,
      messages: session.messages,
      pendingProposal: undefined,
    });
    await sendFollowUp(
      appId,
      token,
      'どこを修正する？（例: 時間を変えたい、タイトルを変えたい）\n修正したい点を `/risukerugg message:〇〇` で教えてね！'
    );
    return;
  }

  // confirm: pendingProposal を取得して登録処理
  if (!session.pendingProposal) {
    await sendFollowUp(appId, token, '登録する内容が見つかりませんでした。もう一度 AI に依頼してみてください。');
    return;
  }

  // Zod で再検証（セッション保存後に型が変化した場合やプロンプトインジェクション経由のデータを拒否）
  const validationResult = ProposalDataSchema.safeParse(session.pendingProposal);
  if (!validationResult.success) {
    await sendFollowUp(appId, token, '登録データが無効です。もう一度 AI に依頼してみてください。');
    await deleteSession(guildId);
    return;
  }
  const proposal = validationResult.data;

  const db = getAdminFirestore();

  // チームのメンバーとカラム情報を取得（名前→ID 解決のため）
  const membersSnap = await db.collection(`teams/${session.teamId}/members`).get();
  const members = membersSnap.docs.map((d) => ({
    userId: d.id,
    displayName: d.data().displayName as string,
  }));

  try {
    let completionMessage = '';

    if (proposal.type === 'schedule') {
      const id = await registerSchedule(session.teamId, proposal, members);
      completionMessage = `✅ スケジュール「${proposal.title}」を登録したよ！（ID: ${id}）`;
    } else if (proposal.type === 'task') {
      const columnsSnap = await db.collection(`teams/${session.teamId}/taskStatuses`).get();
      const columns = columnsSnap.docs.map((d) => ({
        id: d.id,
        name: d.data().name as string,
      }));
      const id = await registerTask(session.teamId, proposal, members, columns);
      completionMessage = `✅ タスク「${proposal.title}」を登録したよ！（ID: ${id}）`;
    } else if (proposal.type === 'collab') {
      const id = await registerCollab(session.teamId, proposal);
      completionMessage = `✅ コラボ調整「${proposal.title}」を登録したよ！（ID: ${id}）`;
    } else {
      completionMessage = '不明な登録タイプです。';
    }

    // 登録完了後にセッションを削除（新しい会話として再スタート）
    await deleteSession(guildId);
    await sendFollowUp(appId, token, completionMessage);
  } catch (err) {
    console.error('Discord Bot 登録エラー:', err);
    await sendFollowUp(appId, token, '登録中にエラーが発生しました。もう一度試してみてください。');
  }
}
