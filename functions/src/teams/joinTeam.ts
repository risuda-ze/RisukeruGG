import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { db, requireAuth, getUserDoc } from '../lib/validateAuth';
import { LIGHT_PLAN_LIMITS } from '../lib/constants';
import { isPartyPlan } from '../lib/plan';

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
    const currentTeamIds = (userData.teamIds as string[] | undefined) ?? (userData.currentTeamId ? [userData.currentTeamId as string] : []);

    if (currentTeamIds.includes(teamId)) {
      throw new HttpsError('already-exists', 'すでにこのチームに所属しています');
    }

    return await db.runTransaction(async (tx) => {
      const membersSnap = await tx.get(db.collection(`teams/${teamId}/members`));
      const members = membersSnap.docs.map((d) => d.data());
      // PL-005: 3名以上チームは全員 PARTY が要件。試用モード中は全員 PARTY 相当のため制限は無効化される
      const lightMemberCount = members.filter((m) => !isPartyPlan(m.plan)).length;

      if (lightMemberCount >= LIGHT_PLAN_LIMITS.maxTeamMembers && !isPartyPlan(userData.plan)) {
        const now = FieldValue.serverTimestamp();
        for (const docSnap of membersSnap.docs) {
          if (!isPartyPlan(docSnap.data().plan)) {
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

      tx.set(db.doc(`teams/${teamId}/members/${uid}`), {
        role: 'member',
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

      return { success: true, teamId };
    });
  }
);
