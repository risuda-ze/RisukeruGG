import * as v1 from 'firebase-functions/v1';
import { FieldValue } from 'firebase-admin/firestore';
import { randomBytes } from 'crypto';
import { db } from '../lib/admin';

/** 新規ユーザー作成時にFirestoreドキュメントとソロチームを自動生成する */
export const onUserCreate = v1.auth.user().onCreate(async (user) => {
  const uid = user.uid;
  const now = FieldValue.serverTimestamp();

  const teamCode = randomBytes(6)
    .toString('base64url')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 8)
    .toUpperCase();
  const soloTeamRef = db.collection('teams').doc();
  const soloTeamId = soloTeamRef.id;

  const displayName = user.displayName ?? user.email?.split('@')[0] ?? 'ユーザー';
  const avatarUrl = user.photoURL ?? null;

  const batch = db.batch();

  batch.set(db.doc(`users/${uid}`), {
    displayName,
    email: user.email ?? '',
    avatarUrl,
    currentTeamId: soloTeamId,
    teamIds: [soloTeamId],
    plan: 'light',
    planUpdatedAt: now,
    monthlyTaskCount: 0,
    monthlyCollabCount: 0,
    countResetAt: now,
    createdAt: now,
    notificationPreferences: {
      collab: { inApp: true, push: false },
      tasks: { inApp: true, push: false },
      reminders: { inApp: true, push: false },
      system: { inApp: true, push: false },
    },
    fcmTokens: [],
    googleCalendar: null,
  });

  batch.set(soloTeamRef, {
    name: `${displayName}のチーム`,
    ownerId: uid,
    teamCode,
    createdAt: now,
  });

  batch.set(db.doc(`teamCodes/${teamCode}`), {
    teamId: soloTeamId,
    createdAt: now,
  });

  batch.set(db.doc(`teams/${soloTeamId}/members/${uid}`), {
    role: 'owner',
    displayName,
    avatarUrl,
    plan: 'light',
    joinedAt: now,
  });

  await batch.commit();
});
