import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { db, getAuthContext, requireOwnerOrEditor } from '../lib/validateAuth';

interface ConfirmCollabDateData {
  teamId: string;
  sessionId: string;
  confirmedDate: string;
}

export const confirmCollabDate = onCall(
  { region: 'asia-northeast1' },
  async (request: CallableRequest<ConfirmCollabDateData>) => {
    const { teamId, sessionId, confirmedDate } = request.data;

    if (!teamId || !sessionId || !confirmedDate) {
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

    if (session.status !== 'open') {
      throw new HttpsError('failed-precondition', 'このセッションは確定できません');
    }

    const confirmedDateObj = new Date(confirmedDate);
    const now = FieldValue.serverTimestamp();

    await db.runTransaction(async (tx) => {
      // カレンダーにスケジュールエントリを自動作成
      const scheduleRef = db.collection(`teams/${teamId}/schedules`).doc();
      const endDate = new Date(confirmedDateObj);
      endDate.setHours(endDate.getHours() + 1);

      tx.set(scheduleRef, {
        title: `[コラボ] ${session.title}（${session.partnerName}さんと）`,
        type: 'stream',
        startAt: confirmedDateObj,
        endAt: endDate,
        platform: null,
        description: `コラボ相手: ${session.partnerName}`,
        participantIds: [],
        collabPartnerName: session.partnerName,
        linkedTaskIds: [],
        updatedAt: now,
        createdBy: ctx.uid,
        createdAt: now,
      });

      tx.update(sessionRef, {
        status: 'confirmed',
        confirmedDate: confirmedDateObj,
        linkedScheduleId: scheduleRef.id,
      });
    });

    return { success: true };
  }
);
