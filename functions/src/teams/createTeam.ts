import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { randomBytes } from 'crypto';
import { db, requireAuth, getUserDoc } from '../lib/validateAuth';

function generateTeamCode(): string {
  return randomBytes(6)
    .toString('base64url')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 8)
    .toUpperCase();
}

interface CreateTeamData {
  name: string;
}

export const createTeam = onCall(
  { region: 'asia-northeast1' },
  async (request: CallableRequest<CreateTeamData>) => {
    const uid = requireAuth(request);
    const { name } = request.data;

    if (!name || name.trim().length === 0) {
      throw new HttpsError('invalid-argument', 'チーム名を入力してください');
    }

    const userData = await getUserDoc(uid);

    let teamCode = generateTeamCode();

    return await db.runTransaction(async (tx) => {
      for (let i = 0; i < 3; i++) {
        const codeSnap = await tx.get(db.doc(`teamCodes/${teamCode}`));
        if (!codeSnap.exists) break;
        if (i === 2)
          throw new HttpsError('internal', 'チームコードの生成に失敗しました。再度お試しください');
        teamCode = generateTeamCode();
      }

      const teamRef = db.collection('teams').doc();
      const teamId = teamRef.id;
      const now = FieldValue.serverTimestamp();

      tx.set(teamRef, { name: name.trim(), ownerId: uid, teamCode, createdAt: now });
      tx.set(db.doc(`teamCodes/${teamCode}`), { teamId, createdAt: now });
      tx.set(db.doc(`teams/${teamId}/members/${uid}`), {
        role: 'owner',
        displayName: userData.displayName,
        avatarUrl: userData.avatarUrl ?? null,
        plan: userData.plan,
        joinedAt: now,
      });
      /* 既存チームには引き続き所属し、新チームを追加してアクティブにする */
      tx.update(db.doc(`users/${uid}`), {
        currentTeamId: teamId,
        teamIds: FieldValue.arrayUnion(teamId),
      });

      return { teamId, teamCode };
    });
  }
);
