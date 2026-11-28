import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { updatedFields } from '../lib/audit';
import { randomBytes } from 'crypto';
import { db, requireAuth, getUserDoc } from '../lib/validateAuth';
import { toTeamRole } from '../lib/role';
import { deleteUserUnavailability } from '../unavailability/cleanup';

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
    const currentTeamIds =
      (userData.teamIds as string[] | undefined) ??
      (userData.currentTeamId ? [userData.currentTeamId as string] : []);

    if (!currentTeamIds.includes(teamId)) {
      throw new HttpsError('not-found', 'このチームに所属していません');
    }

    const memberDoc = await db.doc(`teams/${teamId}/members/${uid}`).get();
    if (!memberDoc.exists) {
      throw new HttpsError('not-found', 'このチームに所属していません');
    }

    const isMember = toTeamRole(memberDoc.data()!.role) === 'member';
    if (isMember) {
      const membersSnap = await db.collection(`teams/${teamId}/members`).get();
      const isSolo = membersSnap.size <= 1;

      if (!isSolo) {
        /* 複数所属者のチーム: 自分以外にメンバー（全権限のロール）がいるか確認 */
        const otherMemberCount = membersSnap.docs.filter(
          (d) => d.id !== uid && toTeamRole(d.data().role) === 'member'
        ).length;
        if (otherMemberCount === 0) {
          throw new HttpsError(
            'failed-precondition',
            '先に別の所属者をメンバーに変更してください'
          );
        }

        const remainingTeamIds = currentTeamIds.filter((id) => id !== teamId);

        const result = await db.runTransaction(async (tx) => {
          // Firestore トランザクションの制約: 読み取りは書き込みより前に実行する必要がある
          const tasksSnap = await tx.get(
            db.collection(`teams/${teamId}/tasks`).where('assigneeId', '==', uid)
          );

          tx.delete(db.doc(`teams/${teamId}/members/${uid}`));

          for (const taskDoc of tasksSnap.docs) {
            tx.update(taskDoc.ref, { assigneeId: null, ...updatedFields(uid) });
          }

          const newActiveTeamId =
            userData.currentTeamId === teamId
              ? (remainingTeamIds[0] ?? null)
              : (userData.currentTeamId as string);
          tx.update(db.doc(`users/${uid}`), {
            teamIds: FieldValue.arrayRemove(teamId),
            currentTeamId: newActiveTeamId,
          });

          return { success: true, newActiveTeamId };
        });

        await deleteUserUnavailability(teamId, uid);
        return result;
      }

      /* ソロチーム: チームを削除して脱退 */
      const teamDocSnap = await db.doc(`teams/${teamId}`).get();
      const teamCode = teamDocSnap.data()?.teamCode as string | undefined;
      const remainingTeamIds = currentTeamIds.filter((id) => id !== teamId);

      const result = await db.runTransaction(async (tx) => {
        const now = FieldValue.serverTimestamp();

        tx.delete(db.doc(`teams/${teamId}/members/${uid}`));
        tx.delete(db.doc(`teams/${teamId}`));
        if (teamCode) tx.delete(db.doc(`teamCodes/${teamCode}`));

        let newActiveTeamId: string;

        if (remainingTeamIds.length === 0) {
          /* 他チームなし: 新ソロチームを自動生成 */
          const soloTeamCode = randomBytes(6)
            .toString('base64url')
            .replace(/[^a-zA-Z0-9]/g, '')
            .slice(0, 8)
            .toUpperCase();
          const soloTeamRef = db.collection('teams').doc();
          newActiveTeamId = soloTeamRef.id;

          tx.set(soloTeamRef, {
            name: `${userData.displayName}のチーム`,
            teamCode: soloTeamCode,
            createdAt: now,
          });
          tx.set(db.doc(`teamCodes/${soloTeamCode}`), { teamId: newActiveTeamId, createdAt: now });
          tx.set(db.doc(`teams/${newActiveTeamId}/members/${uid}`), {
            role: 'member',
            displayName: userData.displayName,
            avatarUrl: userData.avatarUrl ?? null,
            plan: userData.plan,
            joinedAt: now,
          });
          remainingTeamIds.push(newActiveTeamId);
        } else {
          /* 他チームあり: アクティブチームだった場合は最初の残チームに切替 */
          newActiveTeamId =
            userData.currentTeamId === teamId
              ? remainingTeamIds[0]
              : (userData.currentTeamId as string);
        }

        tx.update(db.doc(`users/${uid}`), {
          teamIds: FieldValue.arrayRemove(teamId),
          currentTeamId: newActiveTeamId,
        });

        return { success: true, newActiveTeamId };
      });

      await deleteUserUnavailability(teamId, uid);
      return result;
    }

    /* スタッフの通常脱退フロー */
    const result = await db.runTransaction(async (tx) => {
      // Firestore トランザクションの制約: 読み取りは書き込みより前に実行する必要がある
      const tasksSnap = await tx.get(
        db.collection(`teams/${teamId}/tasks`).where('assigneeId', '==', uid)
      );

      const now = FieldValue.serverTimestamp();
      const remainingTeamIds = currentTeamIds.filter((id) => id !== teamId);

      tx.delete(db.doc(`teams/${teamId}/members/${uid}`));

      for (const taskDoc of tasksSnap.docs) {
        tx.update(taskDoc.ref, { assigneeId: null, ...updatedFields(uid) });
      }

      let newActiveTeamId: string;

      if (remainingTeamIds.length === 0) {
        const soloTeamCode = randomBytes(6)
          .toString('base64url')
          .replace(/[^a-zA-Z0-9]/g, '')
          .slice(0, 8)
          .toUpperCase();
        const soloTeamRef = db.collection('teams').doc();
        newActiveTeamId = soloTeamRef.id;

        tx.set(soloTeamRef, {
          name: `${userData.displayName}のチーム`,
          teamCode: soloTeamCode,
          createdAt: now,
        });
        tx.set(db.doc(`teamCodes/${soloTeamCode}`), { teamId: newActiveTeamId, createdAt: now });
        tx.set(db.doc(`teams/${newActiveTeamId}/members/${uid}`), {
          role: 'member',
          displayName: userData.displayName,
          avatarUrl: userData.avatarUrl ?? null,
          plan: userData.plan,
          joinedAt: now,
        });
        remainingTeamIds.push(newActiveTeamId);
      } else {
        newActiveTeamId =
          userData.currentTeamId === teamId
            ? remainingTeamIds[0]
            : (userData.currentTeamId as string);
      }

      tx.update(db.doc(`users/${uid}`), {
        teamIds: FieldValue.arrayRemove(teamId),
        currentTeamId: newActiveTeamId,
      });

      return { success: true, newActiveTeamId };
    });

    await deleteUserUnavailability(teamId, uid);
    return result;
  }
);
