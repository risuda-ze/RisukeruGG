import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { randomBytes } from 'crypto';
import { db, getAuthContext, requireOperator } from '../lib/validateAuth';

interface ResetTeamCodeData {
  teamId: string;
}

export const resetTeamCode = onCall(
  { region: 'asia-northeast1' },
  async (request: CallableRequest<ResetTeamCodeData>) => {
    const { teamId } = request.data;

    if (!teamId) {
      throw new HttpsError('invalid-argument', 'teamId が必要です');
    }

    const ctx = await getAuthContext(request, teamId);
    requireOperator(ctx);

    return await db.runTransaction(async (tx) => {
      const teamSnap = await tx.get(db.doc(`teams/${teamId}`));
      if (!teamSnap.exists) {
        throw new HttpsError('not-found', 'チームが見つかりません');
      }

      const oldCode = teamSnap.data()!.teamCode as string;

      let newCode = randomBytes(6)
        .toString('base64url')
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 8)
        .toUpperCase();

      for (let i = 0; i < 3; i++) {
        const codeSnap = await tx.get(db.doc(`teamCodes/${newCode}`));
        if (!codeSnap.exists) break;
        if (i === 2)
          throw new HttpsError('internal', 'コード生成に失敗しました。再度お試しください');
        newCode = randomBytes(6)
          .toString('base64url')
          .replace(/[^a-zA-Z0-9]/g, '')
          .slice(0, 8)
          .toUpperCase();
      }

      const now = FieldValue.serverTimestamp();

      tx.delete(db.doc(`teamCodes/${oldCode}`));
      tx.set(db.doc(`teamCodes/${newCode}`), { teamId, createdAt: now });
      tx.update(db.doc(`teams/${teamId}`), { teamCode: newCode });

      return { newTeamCode: newCode };
    });
  }
);
