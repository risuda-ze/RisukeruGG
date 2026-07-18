import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../../lib/admin';
import { isPartyPlan } from '../../lib/plan';

export async function createCollabNotification(
  teamId: string,
  recipientId: string,
  type: string,
  title: string,
  body: string,
  sessionId: string,
  recipientPlan: 'light' | 'party'
): Promise<void> {
  // LIGHT は collab カテゴリ通知の対象外（PL-002）。試用モード中は PARTY 相当で送信する
  if (!isPartyPlan(recipientPlan)) return;

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
