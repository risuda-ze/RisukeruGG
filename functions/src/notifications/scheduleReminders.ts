import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { db } from '../lib/admin';

export const scheduleReminders = onSchedule(
  { schedule: '* * * * *', region: 'asia-northeast1' },
  async () => {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    const fifteenMinLater = new Date(now.getTime() + 15 * 60 * 1000);

    const teamsSnap = await db.collection('teams').get();
    let reminderCount = 0;

    for (const teamDoc of teamsSnap.docs) {
      const teamId = teamDoc.id;

      // 1時間前・15分前のスケジュールを検出
      for (const [window, label] of [
        [oneHourLater, '1時間前'],
        [fifteenMinLater, '15分前'],
      ] as [Date, string][]) {
        const windowStart = new Date(window.getTime() - 30 * 1000);
        const windowEnd = new Date(window.getTime() + 30 * 1000);

        const schedulesSnap = await db
          .collection(`teams/${teamId}/schedules`)
          .where('startAt', '>=', Timestamp.fromDate(windowStart))
          .where('startAt', '<=', Timestamp.fromDate(windowEnd))
          .get();

        for (const scheduleDoc of schedulesSnap.docs) {
          const schedule = scheduleDoc.data();
          const participantIds = (schedule.participantIds as string[]) ?? [];

          for (const uid of participantIds) {
            const userSnap = await db.doc(`users/${uid}`).get();
            if (!userSnap.exists) continue;

            const user = userSnap.data()!;
            if (user.plan === 'light') continue;

            const notifRef = db.collection(`teams/${teamId}/notifications`).doc();
            await notifRef.set({
              recipientId: uid,
              category: 'reminders',
              type: 'schedule_reminder',
              title: `${label}にスケジュールが始まります`,
              body: `「${schedule.title}」が${label}に開始予定です`,
              refType: 'schedule',
              refId: scheduleDoc.id,
              isRead: false,
              createdAt: FieldValue.serverTimestamp(),
            });
            reminderCount++;
          }
        }
      }
    }

    logger.info(`リマインダー通知送信: ${reminderCount}件`);
  }
);
