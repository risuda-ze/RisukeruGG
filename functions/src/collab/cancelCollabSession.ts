import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { db, getAuthContext, requireOwnerOrEditor } from '../lib/validateAuth';

interface CancelCollabSessionData {
  teamId: string;
  sessionId: string;
}

export const cancelCollabSession = onCall(
  { region: 'asia-northeast1' },
  async (request: CallableRequest<CancelCollabSessionData>) => {
    const { teamId, sessionId } = request.data;

    if (!teamId || !sessionId) {
      throw new HttpsError('invalid-argument', '必須項目が不足しています');
    }

    const ctx = await getAuthContext(request, teamId);
    requireOwnerOrEditor(ctx);

    const sessionRef = db.doc(`teams/${teamId}/collabSessions/${sessionId}`);
    const sessionSnap = await sessionRef.get();

    if (!sessionSnap.exists) {
      throw new HttpsError('not-found', 'セッションが見つかりません');
    }

    const session = sessionSnap.data()!;
    const now = FieldValue.serverTimestamp();

    await db.runTransaction(async (tx) => {
      tx.update(sessionRef, { status: 'cancelled' });

      // 確定済みの場合はリンク先スケジュールを削除
      if (session.status === 'confirmed' && session.linkedScheduleId) {
        tx.delete(db.doc(`teams/${teamId}/schedules/${session.linkedScheduleId}`));
      }

      // 通知
      const notifRef = db.collection(`teams/${teamId}/notifications`).doc();
      tx.set(notifRef, {
        recipientId: session.createdBy,
        category: 'collab',
        type: 'collab_cancelled',
        title: 'コラボ調整がキャンセルされました',
        body: `「${session.title}」がキャンセルされました`,
        refType: 'collab',
        refId: sessionId,
        isRead: false,
        createdAt: now,
      });
    });

    return { success: true };
  }
);
