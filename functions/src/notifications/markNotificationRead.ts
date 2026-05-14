import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { db, requireAuth } from '../lib/validateAuth';

interface MarkNotificationReadData {
  teamId: string;
  notificationId: string;
}

export const markNotificationRead = onCall(
  { region: 'asia-northeast1' },
  async (request: CallableRequest<MarkNotificationReadData>) => {
    const uid = requireAuth(request);
    const { teamId, notificationId } = request.data;

    if (!teamId || !notificationId) {
      throw new HttpsError('invalid-argument', '必須項目が不足しています');
    }

    const notifRef = db.doc(`teams/${teamId}/notifications/${notificationId}`);
    const notifSnap = await notifRef.get();

    if (!notifSnap.exists) {
      throw new HttpsError('not-found', '通知が見つかりません');
    }

    if (notifSnap.data()?.recipientId !== uid) {
      throw new HttpsError('permission-denied', 'この通知を更新する権限がありません');
    }

    await notifRef.update({ isRead: true });
    return { success: true };
  }
);
