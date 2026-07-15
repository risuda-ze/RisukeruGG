import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../../lib/admin';
import { isPartyPlan } from '../../lib/plan';

export async function createTaskAssignedNotification(
  teamId: string,
  recipientId: string,
  taskTitle: string,
  taskId: string,
  recipientPlan: 'light' | 'party'
): Promise<void> {
  // LIGHT は tasks カテゴリ通知の対象外（PL-002）。試用モード中は PARTY 相当で送信する
  if (!isPartyPlan(recipientPlan)) return;

  const now = FieldValue.serverTimestamp();
  await db.collection(`teams/${teamId}/notifications`).add({
    recipientId,
    category: 'tasks',
    type: 'task_assigned',
    title: 'タスクが割り当てられました',
    body: `「${taskTitle}」があなたに割り当てられました`,
    refType: 'task',
    refId: taskId,
    isRead: false,
    createdAt: now,
  });
}
