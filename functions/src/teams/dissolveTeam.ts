import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { randomBytes } from 'crypto';
import { db, requireAuth, getUserDoc } from '../lib/validateAuth';
import { toTeamRole } from '../lib/role';

/**
 * チームを解散する（オーナー専用）。
 * 全メンバーに新しいソロチームを割り当て、チームドキュメントを削除する。
 */
export const dissolveTeam = onCall(
  { region: 'asia-northeast1' },
  async (request: CallableRequest) => {
    const uid = requireAuth(request);
    const userData = await getUserDoc(uid);
    const teamId = userData.currentTeamId as string | null;

    if (!teamId) {
      throw new HttpsError('failed-precondition', 'チームに所属していません');
    }

    const memberSnap = await db.doc(`teams/${teamId}/members/${uid}`).get();
    if (!memberSnap.exists || toTeamRole(memberSnap.data()!.role) !== 'member') {
      throw new HttpsError('permission-denied', 'メンバーのみチームを解散できます');
    }

    const teamSnap = await db.doc(`teams/${teamId}`).get();
    const teamCode = teamSnap.data()?.teamCode as string | undefined;

    const allMembersSnap = await db.collection(`teams/${teamId}/members`).get();
    const now = FieldValue.serverTimestamp();

    function genTeamCode() {
      return randomBytes(6)
        .toString('base64url')
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 8)
        .toUpperCase();
    }

    const batch = db.batch();

    // 非オーナーメンバーそれぞれにソロチームを作成
    for (const memberDoc of allMembersSnap.docs) {
      const memberId = memberDoc.id;
      const memberData = memberDoc.data();

      // 旧チームのメンバーレコードを削除
      batch.delete(memberDoc.ref);

      if (memberId === uid) continue; // オーナーは後で処理

      const soloCode = genTeamCode();
      const soloRef = db.collection('teams').doc();
      batch.set(soloRef, {
        name: `${memberData.displayName}のチーム`,
        teamCode: soloCode,
        createdAt: now,
      });
      batch.set(db.doc(`teamCodes/${soloCode}`), { teamId: soloRef.id, createdAt: now });
      batch.set(db.doc(`teams/${soloRef.id}/members/${memberId}`), {
        role: 'member',
        displayName: memberData.displayName,
        avatarUrl: memberData.avatarUrl ?? null,
        plan: memberData.plan,
        joinedAt: now,
      });
      batch.update(db.doc(`users/${memberId}`), { currentTeamId: soloRef.id });
    }

    // チームドキュメントと旧チームコードを削除
    batch.delete(db.doc(`teams/${teamId}`));
    if (teamCode) {
      batch.delete(db.doc(`teamCodes/${teamCode}`));
    }

    // オーナー用ソロチームを作成
    const ownerSoloCode = genTeamCode();
    const ownerSoloRef = db.collection('teams').doc();
    batch.set(ownerSoloRef, {
      name: `${userData.displayName}のチーム`,
      teamCode: ownerSoloCode,
      createdAt: now,
    });
    batch.set(db.doc(`teamCodes/${ownerSoloCode}`), { teamId: ownerSoloRef.id, createdAt: now });
    batch.set(db.doc(`teams/${ownerSoloRef.id}/members/${uid}`), {
      role: 'member',
      displayName: userData.displayName,
      avatarUrl: userData.avatarUrl ?? null,
      plan: userData.plan,
      joinedAt: now,
    });
    batch.update(db.doc(`users/${uid}`), { currentTeamId: ownerSoloRef.id });

    await batch.commit();

    return { success: true };
  }
);
