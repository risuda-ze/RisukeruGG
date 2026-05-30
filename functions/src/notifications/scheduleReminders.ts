import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { db } from '../lib/admin';
import { sendDiscordWebhook } from '../discord/sendWebhook';
import { sendBotChannelMessage } from '../discord/sendBotMessage';

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

    // チームごとに Discord Webhook リマインダーを送信
    // 通知ループとは別に実行し、失敗してもリマインダー本体を失敗させない
    for (const teamDoc of teamsSnap.docs) {
      const teamId = teamDoc.id;

      const discordConfigSnap = await db.doc(`teams/${teamId}/discord/config`).get();
      if (!discordConfigSnap.exists) continue;

      const discordConfig = discordConfigSnap.data()!;
      // channelId（Bot 通知）または webhookUrl（Sprint 1 フォールバック）が必要
      if (!discordConfig.channelId && !discordConfig.webhookUrl) continue;

      for (const [window, label, configKey] of [
        [oneHourLater, '1時間後', 'notifyBefore1h'],
        [fifteenMinLater, '15分後', 'notifyBefore15min'],
      ] as [Date, string, string][]) {
        if (!discordConfig[configKey]) continue;

        const windowStart = new Date(window.getTime() - 30 * 1000);
        const windowEnd = new Date(window.getTime() + 30 * 1000);

        const schedulesSnap = await db
          .collection(`teams/${teamId}/schedules`)
          .where('startAt', '>=', Timestamp.fromDate(windowStart))
          .where('startAt', '<=', Timestamp.fromDate(windowEnd))
          .get();

        for (const scheduleDoc of schedulesSnap.docs) {
          const schedule = scheduleDoc.data();
          const startTime = (schedule.startAt as { toDate: () => Date }).toDate();
          const timeStr = startTime.toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit',
          });

          const embed = {
            title: `⏰ ${label}にスケジュールが始まります`,
            color: 0xef9f27,
            fields: [
              { name: 'タイトル', value: schedule.title as string, inline: true },
              { name: '開始時刻', value: timeStr, inline: true },
            ],
          };

          // channelId が設定済みなら Bot API、未設定なら Webhook にフォールバック
          if (discordConfig.channelId) {
            await sendBotChannelMessage(discordConfig.channelId as string, embed);
          } else if (discordConfig.webhookUrl) {
            await sendDiscordWebhook(discordConfig.webhookUrl as string, embed);
          }
        }
      }
    }

    logger.info(`リマインダー通知送信: ${reminderCount}件`);
  }
);
