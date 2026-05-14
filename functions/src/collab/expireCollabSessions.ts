import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import { db } from '../lib/admin';

export const expireCollabSessions = onSchedule(
  { schedule: '0 * * * *', region: 'asia-northeast1' },
  async () => {
    const now = new Date();

    const teamsSnap = await db.collection('teams').get();

    let expiredCount = 0;

    for (const teamDoc of teamsSnap.docs) {
      const teamId = teamDoc.id;
      const sessionsSnap = await db
        .collection(`teams/${teamId}/collabSessions`)
        .where('status', '==', 'open')
        .where('expiresAt', '<', now)
        .get();

      if (sessionsSnap.empty) continue;

      const batch = db.batch();
      for (const sessionDoc of sessionsSnap.docs) {
        batch.update(sessionDoc.ref, { status: 'expired' });
        expiredCount++;
      }
      await batch.commit();
    }

    logger.info(`期限切れコラボセッションを更新: ${expiredCount}件`);
  }
);
