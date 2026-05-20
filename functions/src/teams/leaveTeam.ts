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

  if (ctx.role === 'operator') {
    throw new HttpsError('failed-precondition', '先に別のメンバーをオペレーターに指名してください');
  }

  return await db.runTransaction(async (tx) => {
    const now = FieldValue.serverTimestamp();

    tx.delete(db.doc(`teams/${teamId}/members/${uid}`));

    const tasksSnap = await tx.get(
      db.collection(`teams/${teamId}/tasks`).where('assigneeId', '==', uid)
    );
    for (const taskDoc of tasksSnap.docs) {
      tx.update(taskDoc.ref, { assigneeId: null });
    }

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

    const soloTeamCode = randomBytes(6)
      .toString('base64url')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 8)
      .toUpperCase();
    const soloTeamRef = db.collection('teams').doc();
    const soloTeamId = soloTeamRef.id;

    tx.set(soloTeamRef, {
      name: `${userData.displayName}のチーム`,
      ownerId: uid,
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
