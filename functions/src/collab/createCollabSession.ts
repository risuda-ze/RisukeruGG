import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { randomUUID } from 'crypto';
import { db, getAuthContext, requireMemberRole, getUserDoc } from '../lib/validateAuth';
import { assertActiveCollabLimit, assertCollabQuota, incrementCollabCount } from './lib';

interface CreateCollabSessionData {
  teamId: string;
  title: string;
  partnerName: string;
  proposedDates: string[];
  expiresInDays: number;
}

export const createCollabSession = onCall(
  { region: 'asia-northeast1' },
  async (request: CallableRequest<CreateCollabSessionData>) => {
    const { teamId, title, partnerName, proposedDates, expiresInDays } = request.data;

    if (!teamId || !title || !partnerName || !proposedDates?.length) {
      throw new HttpsError('invalid-argument', '必須項目が不足しています');
    }
    if (proposedDates.length > 5) {
      throw new HttpsError('invalid-argument', '候補日程は最大5件です');
    }
    if (expiresInDays < 1 || expiresInDays > 30) {
      throw new HttpsError('invalid-argument', '有効期限は1〜30日で設定してください');
    }

    const ctx = await getAuthContext(request, teamId);
    requireMemberRole(ctx);

    const userData = await getUserDoc(ctx.uid);
    await assertActiveCollabLimit(teamId, userData);
    assertCollabQuota(userData);

    const sessionId = randomUUID();
    const now = FieldValue.serverTimestamp();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    await db.runTransaction(async (tx) => {
      const sessionRef = db.doc(`teams/${teamId}/collabSessions/${sessionId}`);

      tx.set(sessionRef, {
        title,
        partnerName,
        createdBy: ctx.uid,
        teamId,
        proposedDates: proposedDates.map((d) => new Date(d)),
        responses: null,
        expiresAt,
        status: 'open',
        confirmedDate: null,
        linkedScheduleId: null,
        createdAt: now,
      });

      incrementCollabCount(tx, ctx.uid, userData);
    });

    const shareUrl = `https://risukeru-gg.vercel.app/collab/${teamId}__${sessionId}`;
    return { sessionId, shareUrl };
  }
);
