import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { randomBytes } from 'crypto';
import { db, getAuthContext, requireOperator, getUserDoc } from '../lib/validateAuth';

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

    return await db.runTransaction(async (tx) => {
      const now = FieldValue.serverTimestamp();

      // Firestoreトランザクションの制約: 読み取りは書き込みより前に実行する必要がある
      const tasksSnap = await tx.get(
        db.collection(`teams/${teamId}/tasks`).where('assigneeId', '==', targetUserId)
      );
      const userSnap = await tx.get(db.doc(`users/${targetUserId}`));
      const currentTeamIds = (userSnap.data()?.teamIds as string[]) ?? [];
      const newTeamIds = currentTeamIds.filter((id) => id !== teamId).concat(soloTeamId);

      tx.delete(db.doc(`teams/${teamId}/members/${targetUserId}`));

      for (const taskDoc of tasksSnap.docs) {
        tx.update(taskDoc.ref, { assigneeId: null });
      }

      const notifRef = db.collection(`teams/${teamId}/notifications`).doc();
      tx.set(notifRef, {
        recipientId: ctx.uid,
        category: 'system',
        type: 'member_removed',
        title: 'メンバーを削除しました',
        body: `${targetUserData.displayName} をチームから削除しました`,
        refType: 'team',
        refId: teamId,
        isRead: false,
        createdAt: now,
      });

      tx.set(soloTeamRef, {
        name: `${targetUserData.displayName}のチーム`,
        ownerId: targetUserId,
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
  }
);
