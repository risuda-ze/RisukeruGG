import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { db, requireAuth, getUserDoc } from '../lib/validateAuth';
import { LIGHT_PLAN_LIMITS } from '../lib/constants';

interface JoinTeamData {
  teamCode: string;
}

export const joinTeam = onCall(
  { region: 'asia-northeast1' },
  async (request: CallableRequest<JoinTeamData>) => {
    const uid = requireAuth(request);
    const { teamCode } = request.data;

    if (!teamCode?.trim()) {
      throw new HttpsError('invalid-argument', 'チームコードを入力してください');
    }

    const codeSnap = await db.doc(`teamCodes/${teamCode.toUpperCase()}`).get();
    if (!codeSnap.exists) {
      throw new HttpsError('not-found', '無効なチームコードです');
    }

    const teamId = codeSnap.data()!.teamId as string;
    const userData = await getUserDoc(uid);
    const oldTeamId = userData.currentTeamId as string | null;

    if (oldTeamId === teamId) {
      throw new HttpsError('already-exists', 'すでにこのチームに所属しています');
    }

    return await db.runTransaction(async (tx) => {
      const membersSnap = await tx.get(db.collection(`teams/${teamId}/members`));
      const members = membersSnap.docs.map((d) => d.data());
      const lightMemberCount = members.filter((m) => m.plan === 'light').length;

      if (lightMemberCount >= LIGHT_PLAN_LIMITS.maxTeamMembers && userData.plan === 'light') {
        const now = FieldValue.serverTimestamp();
        for (const docSnap of membersSnap.docs) {
          if (docSnap.data().plan === 'light') {
            const notifRef = db.collection(`teams/${teamId}/notifications`).doc();
            tx.set(notifRef, {
              recipientId: docSnap.id,
              category: 'system',
              type: 'light_limit_reached',
              title: 'チームメンバー上限',
              body: '全員がPARTYプランにアップグレードすると3名以上のチームが作れます',
              refType: 'team',
              refId: teamId,
              isRead: false,
              createdAt: now,
            });
          }
        }
        throw new HttpsError(
          'failed-precondition',
          '全員がPARTYプランにアップグレードする必要があります'
        );
      }

      const now = FieldValue.serverTimestamp();

      if (oldTeamId) {
        const oldMembersSnap = await tx.get(db.collection(`teams/${oldTeamId}/members`));
        tx.delete(db.doc(`teams/${oldTeamId}/members/${uid}`));
        const remainingCount = oldMembersSnap.docs.filter((d) => d.id !== uid).length;
        if (remainingCount === 0) {
          const oldTeamSnap = await tx.get(db.doc(`teams/${oldTeamId}`));
          const oldTeamCode = oldTeamSnap.data()?.teamCode as string | undefined;
          tx.delete(db.doc(`teams/${oldTeamId}`));
          if (oldTeamCode) {
            tx.delete(db.doc(`teamCodes/${oldTeamCode}`));
          }
        }
      }

      tx.set(db.doc(`teams/${teamId}/members/${uid}`), {
        role: 'editor',
        displayName: userData.displayName,
        avatarUrl: userData.avatarUrl ?? null,
        plan: userData.plan,
        joinedAt: now,
      });

      tx.update(db.doc(`users/${uid}`), { currentTeamId: teamId });

      return { success: true, teamId };
    });
  }
);
