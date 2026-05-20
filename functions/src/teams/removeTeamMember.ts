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

    return await db.runTransaction(async (tx) => {
      const now = FieldValue.serverTimestamp();

      tx.delete(db.doc(`teams/${teamId}/members/${targetUserId}`));

      const tasksSnap = await tx.get(
        db.collection(`teams/${teamId}/tasks`).where('assigneeId', '==', targetUserId)
      );
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

      const soloTeamCode = randomBytes(6)
        .toString('base64url')
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 8)
        .toUpperCase();
      const soloTeamRef = db.collection('teams').doc();
      const soloTeamId = soloTeamRef.id;

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
      tx.update(db.doc(`users/${targetUserId}`), { currentTeamId: soloTeamId });

      return { success: true };
    });
  }
);
