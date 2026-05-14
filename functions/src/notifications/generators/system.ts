import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../../lib/admin';

export async function createSystemNotification(
  teamId: string,
  recipientId: string,
  title: string,
  body: string,
  refType?: string,
  refId?: string
): Promise<void> {
  const now = FieldValue.serverTimestamp();
  await db.collection(`teams/${teamId}/notifications`).add({
    recipientId,
    category: 'system',
    type: 'system_message',
    title,
    body,
    refType: refType ?? null,
    refId: refId ?? null,
    isRead: false,
    createdAt: now,
  });
}
