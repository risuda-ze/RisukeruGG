import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { randomBytes } from 'crypto';
import { db, getAuthContext, requireAuth, getUserDoc } from '../lib/validateAuth';

export const leaveTeam = onCall({ region: 'asia-northeast1' }, async (request: CallableRequest) => {
  const uid = requireAuth(request);
  const userData = await getUserDoc(uid);
  const teamId = userData.currentTeamId as string | null;

  if (!teamId) {
    throw new HttpsError('failed-precondition', 'チームに所属していません');
  }

  const ctx = await getAuthContext(request, teamId);

  let isSoloTeam = false;
  let existingTeamCode: string | undefined;
  let remainingOperatorUids: string[] = [];

  if (ctx.role === 'operator') {
    const [membersSnap, teamDocSnap] = await Promise.all([
      db.collection(`teams/${teamId}/members`).get(),
      db.doc(`teams/${teamId}`).get(),
    ]);
    existingTeamCode = teamDocSnap.data()?.teamCode as string | undefined;

    if (membersSnap.size <= 1) {
      isSoloTeam = true;
    } else {
      /* 複数メンバー: 自分以外にオペレーターがいるか確認 */
      const otherOperatorCount = membersSnap.docs.filter(
        (d) => d.id !== uid && (d.data().role === 'operator' || d.data().role === 'owner')
      ).length;
      if (otherOperatorCount === 0) {
        throw new HttpsError(
          'failed-precondition',
          '先に別のメンバーをオペレーターに指名してください'
        );
      }
      const currentOperatorUids = Array.isArray(teamDocSnap.data()?.operatorUids)
        ? (teamDocSnap.data()!.operatorUids as string[])
        : teamDocSnap.data()?.ownerId
          ? [teamDocSnap.data()!.ownerId as string]
          : [];
      remainingOperatorUids = currentOperatorUids.filter((id) => id !== uid);
    }
  }

  return await db.runTransaction(async (tx) => {
    const now = FieldValue.serverTimestamp();

    tx.delete(db.doc(`teams/${teamId}/members/${uid}`));

    if (isSoloTeam) {
      tx.delete(db.doc(`teams/${teamId}`));
      if (existingTeamCode) tx.delete(db.doc(`teamCodes/${existingTeamCode}`));
    } else if (ctx.role === 'operator') {
      /* 他にオペレーターが存在: operatorUids から自分を除いて更新 */
      tx.update(db.doc(`teams/${teamId}`), { operatorUids: remainingOperatorUids });
    }

    const tasksSnap = await tx.get(
      db.collection(`teams/${teamId}/tasks`).where('assigneeId', '==', uid)
    );
    for (const taskDoc of tasksSnap.docs) {
      tx.update(taskDoc.ref, { assigneeId: null });
    }

    if (!isSoloTeam) {
      let notifyUids: string[];
      if (ctx.role === 'operator') {
        notifyUids = remainingOperatorUids;
      } else {
        const teamSnap = await tx.get(db.doc(`teams/${teamId}`));
        notifyUids = Array.isArray(teamSnap.data()?.operatorUids)
          ? (teamSnap.data()!.operatorUids as string[])
          : teamSnap.data()?.ownerId
            ? [teamSnap.data()!.ownerId as string]
            : [];
      }
      for (const recipientId of notifyUids) {
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
    }

    const soloTeamCode = randomBytes(6)
      .toString('base64url')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 8)
      .toUpperCase();
    const soloTeamRef = db.collection('teams').doc();
    const soloTeamId = soloTeamRef.id;

    tx.set(soloTeamRef, {
      name: `${userData.displayName}のチーム`,
      operatorUids: [uid],
      teamCode: soloTeamCode,
      createdAt: now,
    });
    tx.set(db.doc(`teamCodes/${soloTeamCode}`), { teamId: soloTeamId, createdAt: now });
    tx.set(db.doc(`teams/${soloTeamId}/members/${uid}`), {
      role: 'operator',
      displayName: userData.displayName,
      avatarUrl: userData.avatarUrl ?? null,
      plan: userData.plan,
      joinedAt: now,
    });
    tx.update(db.doc(`users/${uid}`), { currentTeamId: soloTeamId });

    return { success: true, newSoloTeamId: soloTeamId };
  });
});
