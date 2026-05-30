import { getAdminFirestore } from '@/lib/firebase/admin';
import { sendFollowUp } from '../discordFollowUp';
import { getSession, deleteSession, upsertSession } from '../sessionManager';
import { registerSchedule } from '../register/registerSchedule';
import { registerTask } from '../register/registerTask';
import { registerCollab } from '../register/registerCollab';
import type { ScheduleProposal, TaskProposal, CollabProposal } from '@/lib/ai/parseProposal';

interface ButtonClickParams {
  action: 'confirm' | 'revise' | 'cancel';
  discordUserId: string;
  appId: string;
  token: string;
}

/**
 * Discord ボタンクリック処理。
 * confirm / revise / cancel の 3 種類のアクションを処理する。
 */
export async function handleButtonClick({
  action,
  discordUserId,
  appId,
  token,
}: ButtonClickParams): Promise<void> {
  const session = await getSession(discordUserId);

  if (!session) {
    await sendFollowUp(appId, token, 'セッションが見つかりません。`/risukerugg message:リセット` で再開してください。');
    return;
  }

  if (action === 'cancel') {
    await deleteSession(discordUserId);
    await sendFollowUp(appId, token, 'キャンセルしたよ！また何かあれば声をかけてね。');
    return;
  }

  if (action === 'revise') {
    // pendingProposal のみ削除して会話履歴は保持
    // ユーザーが次の /risukerugg で修正指示を送れる状態にする
    await upsertSession(discordUserId, {
      discordUserId: session.discordUserId,
      risukeruUserId: session.risukeruUserId,
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

  const proposal = session.pendingProposal as unknown as ScheduleProposal | TaskProposal | CollabProposal;

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
      const id = await registerSchedule(session.teamId, session.risukeruUserId, proposal, members);
      completionMessage = `✅ スケジュール「${proposal.title}」を登録したよ！（ID: ${id}）`;
    } else if (proposal.type === 'task') {
      const columnsSnap = await db.collection(`teams/${session.teamId}/kanbanColumns`).get();
      const columns = columnsSnap.docs.map((d) => ({
        id: d.id,
        name: d.data().name as string,
      }));
      const id = await registerTask(session.teamId, session.risukeruUserId, proposal, members, columns);
      completionMessage = `✅ タスク「${proposal.title}」を登録したよ！（ID: ${id}）`;
    } else if (proposal.type === 'collab') {
      const id = await registerCollab(session.teamId, session.risukeruUserId, proposal);
      completionMessage = `✅ コラボ調整「${proposal.title}」を登録したよ！（ID: ${id}）`;
    } else {
      completionMessage = '不明な登録タイプです。';
    }

    // 登録完了後にセッションを削除（新しい会話として再スタート）
    await deleteSession(discordUserId);
    await sendFollowUp(appId, token, completionMessage);
  } catch (err) {
    console.error('Discord Bot 登録エラー:', err);
    await sendFollowUp(appId, token, '登録中にエラーが発生しました。もう一度試してみてください。');
  }
}
