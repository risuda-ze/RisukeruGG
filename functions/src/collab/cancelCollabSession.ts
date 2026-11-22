import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { db, getAuthContext, requireMemberRole } from '../lib/validateAuth';

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
    requireMemberRole(ctx);

    const sessionRef = db.doc(`teams/${teamId}/collabSessions/${sessionId}`);
    const sessionSnap = await sessionRef.get();

    if (!sessionSnap.exists) {
      throw new HttpsError('not-found', 'セッションが見つかりません');
    }

    const session = sessionSnap.data()!;

    await db.runTransaction(async (tx) => {
      tx.update(sessionRef, { status: 'cancelled' });

      // 確定済みの場合はリンク先スケジュールを削除
      if (session.status === 'confirmed' && session.linkedScheduleId) {
        tx.delete(db.doc(`teams/${teamId}/schedules/${session.linkedScheduleId}`));
      }
    });

    return { success: true };
  }
);
