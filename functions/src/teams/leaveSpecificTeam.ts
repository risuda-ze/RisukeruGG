import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { randomBytes } from 'crypto';
import { db, requireAuth, getUserDoc } from '../lib/validateAuth';

interface LeaveSpecificTeamData {
  teamId: string;
}

/** 特定チームから脱退する。アクティブチームから脱退した場合は別チームに自動切替 */
export const leaveSpecificTeam = onCall(
  { region: 'asia-northeast1' },
  async (request: CallableRequest<LeaveSpecificTeamData>) => {
    const uid = requireAuth(request);
    const { teamId } = request.data;

    if (!teamId) {
      throw new HttpsError('invalid-argument', 'チームIDを指定してください');
    }

    const userData = await getUserDoc(uid);
    const currentTeamIds = (userData.teamIds as string[] | undefined) ?? (userData.currentTeamId ? [userData.currentTeamId as string] : []);

    if (!currentTeamIds.includes(teamId)) {
      throw new HttpsError('not-found', 'このチームに所属していません');
    }

    const memberDoc = await db.doc(`teams/${teamId}/members/${uid}`).get();
    if (!memberDoc.exists) {
      throw new HttpsError('not-found', 'このチームに所属していません');
    }
    if (memberDoc.data()!.role === 'owner') {
      throw new HttpsError('failed-precondition', '先に所有権を移譲してください');
    }

    return await db.runTransaction(async (tx) => {
      const now = FieldValue.serverTimestamp();
      const remainingTeamIds = currentTeamIds.filter((id) => id !== teamId);

      /* チームメンバーから削除 */
      tx.delete(db.doc(`teams/${teamId}/members/${uid}`));

      /* 担当タスクのアサインを解除 */
      const tasksSnap = await tx.get(
        db.collection(`teams/${teamId}/tasks`).where('assigneeId', '==', uid)
      );
      for (const taskDoc of tasksSnap.docs) {
        tx.update(taskDoc.ref, { assigneeId: null });
      }

      /* オーナーに通知 */
      const teamSnap = await tx.get(db.doc(`teams/${teamId}`));
      const ownerId = teamSnap.data()!.ownerId as string;
      const notifRef = db.collection(`teams/${teamId}/notifications`).doc();
      tx.set(notifRef, {
        recipientId: ownerId,
        category: 'system',
        type: 'member_left',
        title: 'メンバーが脱退しました',
        body: `${userData.displayName} がチームを脱退しました`,
        refType: 'team',
        refId: teamId,
        isRead: false,
        createdAt: now,
      });

      let newActiveTeamId: string;

      if (remainingTeamIds.length === 0) {
        /* 所属チームが0になる場合はソロチームを自動生成 */
        const soloTeamCode = randomBytes(6)
          .toString('base64url')
          .replace(/[^a-zA-Z0-9]/g, '')
          .slice(0, 8)
          .toUpperCase();
        const soloTeamRef = db.collection('teams').doc();
        newActiveTeamId = soloTeamRef.id;

        tx.set(soloTeamRef, {
          name: `${userData.displayName}のチーム`,
          ownerId: uid,
          teamCode: soloTeamCode,
          createdAt: now,
        });
        tx.set(db.doc(`teamCodes/${soloTeamCode}`), { teamId: newActiveTeamId, createdAt: now });
        tx.set(db.doc(`teams/${newActiveTeamId}/members/${uid}`), {
          role: 'owner',
          displayName: userData.displayName,
          avatarUrl: userData.avatarUrl ?? null,
          plan: userData.plan,
          joinedAt: now,
        });
        remainingTeamIds.push(newActiveTeamId);
      } else {
        /* アクティブチームから脱退した場合は最初の残チームに切替 */
        newActiveTeamId =
          userData.currentTeamId === teamId ? remainingTeamIds[0] : (userData.currentTeamId as string);
      }

      tx.update(db.doc(`users/${uid}`), {
        teamIds: FieldValue.arrayRemove(teamId),
        currentTeamId: newActiveTeamId,
      });

      return { success: true, newActiveTeamId };
    });
  }
);
