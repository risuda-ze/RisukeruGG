import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../../lib/admin';

export async function createTaskAssignedNotification(
  teamId: string,
  recipientId: string,
  taskTitle: string,
  taskId: string,
  recipientPlan: 'light' | 'party'
): Promise<void> {
  if (recipientPlan === 'light') return;

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
