import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { db, requireAuth, getUserDoc } from '../lib/validateAuth';

/**
 * アカウントと関連データを削除する。
 * - オーナーかつ複数メンバーが存在する場合は拒否（先に所有権移譲が必要）
 * - ソロチームのオーナー: チームごと削除
 * - editor/viewer: チームから脱退してアカウント削除
 */
export const deleteAccount = onCall(
  { region: 'asia-northeast1' },
  async (request: CallableRequest) => {
    const uid = requireAuth(request);
    const userData = await getUserDoc(uid);
    const teamId = userData.currentTeamId as string | null;

    if (teamId) {
      const memberSnap = await db.doc(`teams/${teamId}/members/${uid}`).get();

      if (memberSnap.exists) {
        const role = memberSnap.data()!.role as string;

        if (role === 'owner') {
          const membersSnap = await db.collection(`teams/${teamId}/members`).get();

          if (membersSnap.size > 1) {
            throw new HttpsError(
              'failed-precondition',
              '他のメンバーがいるチームのオーナーは、先に所有権を移譲してからアカウントを削除してください'
            );
          }

          // ソロチーム: チームごと削除
          const teamSnap = await db.doc(`teams/${teamId}`).get();
          const teamCode = teamSnap.data()?.teamCode as string | undefined;

          await db.runTransaction(async (tx) => {
            tx.delete(db.doc(`teams/${teamId}/members/${uid}`));
            tx.delete(db.doc(`teams/${teamId}`));
            if (teamCode) {
              tx.delete(db.doc(`teamCodes/${teamCode}`));
            }
            tx.delete(db.doc(`users/${uid}`));
          });
        } else {
          // editor/viewer: チームから脱退してアカウント削除
          await db.runTransaction(async (tx) => {
            tx.delete(db.doc(`teams/${teamId}/members/${uid}`));

            const tasksSnap = await tx.get(
              db.collection(`teams/${teamId}/tasks`).where('assigneeId', '==', uid)
            );
            for (const taskDoc of tasksSnap.docs) {
              tx.update(taskDoc.ref, { assigneeId: null, updatedAt: FieldValue.serverTimestamp() });
            }

            tx.delete(db.doc(`users/${uid}`));
          });
        }
      }
    } else {
      await db.doc(`users/${uid}`).delete();
    }

    // Firebase Auth アカウントを最後に削除
    await getAuth().deleteUser(uid);

    return { success: true };
  }
);
