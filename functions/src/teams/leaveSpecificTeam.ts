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

    const isOperator = memberDoc.data()!.role === 'operator';
    if (isOperator) {
      const membersSnap = await db.collection(`teams/${teamId}/members`).get();
      const isSolo = membersSnap.size <= 1;

      if (!isSolo) {
        /* 複数メンバーチーム: 自分以外にオペレーターがいるか確認 */
        const otherOperatorCount = membersSnap.docs.filter(
          (d) => d.id !== uid && (d.data().role === 'operator' || d.data().role === 'owner')
        ).length;
        if (otherOperatorCount === 0) {
          throw new HttpsError(
            'failed-precondition',
            '先に別のメンバーをオペレーターに指名してください'
          );
        }

        /* 他にオペレーターが存在: operatorUids から自分を除いて脱退 */
        const teamDocSnap = await db.doc(`teams/${teamId}`).get();
        const currentOperatorUids = Array.isArray(teamDocSnap.data()?.operatorUids)
          ? (teamDocSnap.data()!.operatorUids as string[])
          : [teamDocSnap.data()?.ownerId as string];
        const remainingTeamIds = currentTeamIds.filter((id) => id !== teamId);
        const newOperatorUids = currentOperatorUids.filter((id) => id !== uid);

        return await db.runTransaction(async (tx) => {
          const now = FieldValue.serverTimestamp();

          tx.delete(db.doc(`teams/${teamId}/members/${uid}`));
          tx.update(db.doc(`teams/${teamId}`), { operatorUids: newOperatorUids });

          const tasksSnap = await tx.get(
            db.collection(`teams/${teamId}/tasks`).where('assigneeId', '==', uid)
          );
          for (const taskDoc of tasksSnap.docs) {
            tx.update(taskDoc.ref, { assigneeId: null });
          }

          /* 残オペレーター全員に通知 */
          for (const recipientId of newOperatorUids) {
            const notifRef = db.collection(`teams/${teamId}/notifications`).doc();
            tx.set(notifRef, {
              recipientId,
              category: 'system',
              type: 'member_left',
              title: 'メンバーが脱退しました',
              body: `${userData.displayName} がチームを脱退しました`,
              refType: 'team',
              refId: teamId,
              isRead: false,
              createdAt: now,
            });
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
      }

      /* ソロチーム: チームを削除して脱退 */
      const teamDocSnap = await db.doc(`teams/${teamId}`).get();
      const teamCode = teamDocSnap.data()?.teamCode as string | undefined;
      const remainingTeamIds = currentTeamIds.filter((id) => id !== teamId);

      return await db.runTransaction(async (tx) => {
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
            operatorUids: [uid],
            teamCode: soloTeamCode,
            createdAt: now,
          });
          tx.set(db.doc(`teamCodes/${soloTeamCode}`), { teamId: newActiveTeamId, createdAt: now });
          tx.set(db.doc(`teams/${newActiveTeamId}/members/${uid}`), {
            role: 'operator',
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
    }

    /* 非オペレーターの通常脱退フロー */
    return await db.runTransaction(async (tx) => {
      const now = FieldValue.serverTimestamp();
      const remainingTeamIds = currentTeamIds.filter((id) => id !== teamId);

      tx.delete(db.doc(`teams/${teamId}/members/${uid}`));

      const tasksSnap = await tx.get(
        db.collection(`teams/${teamId}/tasks`).where('assigneeId', '==', uid)
      );
      for (const taskDoc of tasksSnap.docs) {
        tx.update(taskDoc.ref, { assigneeId: null });
      }

      /* オペレーター全員に通知 */
      const teamSnap = await tx.get(db.doc(`teams/${teamId}`));
      const operatorUids: string[] = Array.isArray(teamSnap.data()?.operatorUids)
        ? (teamSnap.data()!.operatorUids as string[])
        : teamSnap.data()?.ownerId
          ? [teamSnap.data()!.ownerId as string]
          : [];
      for (const recipientId of operatorUids) {
        const notifRef = db.collection(`teams/${teamId}/notifications`).doc();
        tx.set(notifRef, {
          recipientId,
          category: 'system',
          type: 'member_left',
          title: 'メンバーが脱退しました',
          body: `${userData.displayName} がチームを脱退しました`,
          refType: 'team',
          refId: teamId,
          isRead: false,
          createdAt: now,
        });
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
          operatorUids: [uid],
          teamCode: soloTeamCode,
          createdAt: now,
        });
        tx.set(db.doc(`teamCodes/${soloTeamCode}`), { teamId: newActiveTeamId, createdAt: now });
        tx.set(db.doc(`teams/${newActiveTeamId}/members/${uid}`), {
          role: 'operator',
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
  }
);
