import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { db, getAuthContext, requireOwnerOrEditor } from '../lib/validateAuth';

interface ReopenCollabSessionData {
  teamId: string;
  sessionId: string;
}

export const reopenCollabSession = onCall(
  { region: 'asia-northeast1' },
  async (request: CallableRequest<ReopenCollabSessionData>) => {
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

    if (session.status !== 'confirmed') {
      throw new HttpsError('failed-precondition', 'このセッションは確定済みではありません');
    }

    await db.runTransaction(async (tx) => {
      /* 確定時に作成されたスケジュールを削除（存在する場合のみ） */
      if (session.linkedScheduleId) {
        const scheduleRef = db.doc(`teams/${teamId}/schedules/${session.linkedScheduleId}`);
        const scheduleSnap = await tx.get(scheduleRef);
        if (scheduleSnap.exists) {
          tx.delete(scheduleRef);
        }
      }

      /* セッションを open 状態に戻す */
      tx.update(sessionRef, {
        status: 'open',
        confirmedDate: FieldValue.delete(),
        linkedScheduleId: FieldValue.delete(),
      });
    });

    return { success: true };
  }
);
