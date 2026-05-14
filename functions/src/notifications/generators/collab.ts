import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../../lib/admin';

export async function createCollabNotification(
  teamId: string,
  recipientId: string,
  type: string,
  title: string,
  body: string,
  sessionId: string,
  recipientPlan: 'light' | 'party'
): Promise<void> {
  if (recipientPlan === 'light') return;

  const now = FieldValue.serverTimestamp();
  await db.collection(`teams/${teamId}/notifications`).add({
    recipientId,
    category: 'collab',
    type,
    title,
    body,
    refType: 'collab',
    refId: sessionId,
    isRead: false,
    createdAt: now,
  });
}
