import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { randomBytes } from 'crypto';
import { db, getAuthContext, requireOperator, getUserDoc } from '../lib/validateAuth';
import { deleteUserUnavailability } from '../unavailability/cleanup';

interface RemoveTeamMemberData {
  teamId: string;
  targetUserId: string;
}

export const removeTeamMember = onCall(
  { region: 'asia-northeast1' },
  async (request: CallableRequest<RemoveTeamMemberData>) => {
    const { teamId, targetUserId } = request.data;

    if (!teamId || !targetUserId) {
      throw new HttpsError('invalid-argument', 'teamId と targetUserId が必要です');
    }

    const ctx = await getAuthContext(request, teamId);
    requireOperator(ctx);

    if (ctx.uid === targetUserId) {
      throw new HttpsError('invalid-argument', '自分自身は削除できません');
    }

    const targetUserData = await getUserDoc(targetUserId);

    // ソロチームIDをトランザクション外で先行生成（ID生成はFirestore読み書き不要）
    const soloTeamCode = randomBytes(6)
      .toString('base64url')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 8)
      .toUpperCase();
    const soloTeamRef = db.collection('teams').doc();
    const soloTeamId = soloTeamRef.id;

    const result = await db.runTransaction(async (tx) => {
      const now = FieldValue.serverTimestamp();

      // Firestoreトランザクションの制約: 読み取りは書き込みより前に実行する必要がある
      const tasksSnap = await tx.get(
        db.collection(`teams/${teamId}/tasks`).where('assigneeId', '==', targetUserId)
      );
      const userSnap = await tx.get(db.doc(`users/${targetUserId}`));
      const membersSnap = await tx.get(db.collection(`teams/${teamId}/members`));
      const teamDocSnap = await tx.get(db.doc(`teams/${teamId}`));
      const currentTeamIds = (userSnap.data()?.teamIds as string[]) ?? [];
      const newTeamIds = currentTeamIds.filter((id) => id !== teamId).concat(soloTeamId);

      tx.delete(db.doc(`teams/${teamId}/members/${targetUserId}`));

      // 通常 requireOperator(ctx) によりオペレーター（ctx.uid）が常にメンバーとして存在し、
      // かつ ctx.uid !== targetUserId が保証されるため membersSnap.size >= 2 が維持される。
      // ただしデータ破損等の異常状態で targetUserId のみが存在していた場合の防御として実施。
      if (membersSnap.size <= 1) {
        const teamCode = teamDocSnap.data()?.teamCode as string | undefined;
        tx.delete(db.doc(`teams/${teamId}`));
        if (teamCode) tx.delete(db.doc(`teamCodes/${teamCode}`));
      }

      for (const taskDoc of tasksSnap.docs) {
        tx.update(taskDoc.ref, { assigneeId: null });
      }

      tx.set(soloTeamRef, {
        name: `${targetUserData.displayName}のチーム`,
        operatorUids: [targetUserId],
        teamCode: soloTeamCode,
        createdAt: now,
      });
      tx.set(db.doc(`teamCodes/${soloTeamCode}`), { teamId: soloTeamId, createdAt: now });
      tx.set(db.doc(`teams/${soloTeamId}/members/${targetUserId}`), {
        role: 'operator',
        displayName: targetUserData.displayName,
        avatarUrl: targetUserData.avatarUrl ?? null,
        plan: targetUserData.plan,
        joinedAt: now,
      });
      tx.update(db.doc(`users/${targetUserId}`), {
        currentTeamId: soloTeamId,
        teamIds: newTeamIds,
      });

      return { success: true };
    });

    await deleteUserUnavailability(teamId, targetUserId);
    return result;
  }
);
