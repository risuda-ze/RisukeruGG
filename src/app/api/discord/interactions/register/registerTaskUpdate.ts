import { getAdminFirestore } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { TaskUpdateProposal } from '@/lib/ai/parseProposal';

/**
 * Discord Bot 経由の既存タスク更新。
 * changes に含まれるフィールドのみ部分更新する（新規作成ではなく編集）。
 * 対象タスクが存在しない場合はエラーを投げる。
 * @returns 更新したタスクのタイトル（完了メッセージ表示用）
 */
export async function registerTaskUpdate(
  teamId: string,
  proposal: TaskUpdateProposal,
  members: Array<{ userId: string; displayName: string }>,
  columns: Array<{ id: string; name: string }>,
  categories: Array<{ id: string; name: string }> = []
): Promise<string> {
  const db = getAdminFirestore();
  const taskRef = db.doc(`teams/${teamId}/tasks/${proposal.taskId}`);

  const snap = await taskRef.get();
  if (!snap.exists) {
    throw new Error(`更新対象のタスクが見つかりません (taskId: ${proposal.taskId})`);
  }

  const c = proposal.changes;
  const data: Record<string, unknown> = {};
  if (c.title !== undefined) data.title = c.title;
  // null は「値を外す」操作（詳細削除・期限解除・担当解除・カテゴリ解除）
  if (c.description !== undefined) data.description = c.description;
  if (c.dueDate !== undefined) data.dueDate = c.dueDate === null ? null : new Date(c.dueDate);
  if (c.assigneeName !== undefined) {
    if (c.assigneeName === null) {
      data.assigneeId = null;
    } else {
      // 表示名 → UID 解決。見つからなければそのフィールドは変更しない
      const assigneeId = members.find((m) => m.displayName === c.assigneeName)?.userId;
      if (assigneeId) data.assigneeId = assigneeId;
    }
  }
  if (c.columnName !== undefined) {
    const column = columns.find((col) => col.name === c.columnName);
    if (column) data.columnId = column.id;
  }
  if (c.categoryName !== undefined) {
    if (c.categoryName === null) {
      data.categoryId = null;
    } else {
      const category = categories.find((cat) => cat.name === c.categoryName);
      if (category) data.categoryId = category.id;
    }
  }

  if (Object.keys(data).length === 0) {
    throw new Error('更新できる変更内容がありません');
  }

  await taskRef.update({ ...data, updatedAt: FieldValue.serverTimestamp() });

  // 完了メッセージ用に更新後のタイトルを返す
  return (c.title ?? (snap.data()?.title as string | undefined)) ?? proposal.taskId;
}
