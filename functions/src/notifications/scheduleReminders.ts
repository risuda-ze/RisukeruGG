import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import { Timestamp } from 'firebase-admin/firestore';
import { db } from '../lib/admin';
import { sendDiscordWebhook, type DiscordEmbed } from '../discord/sendWebhook';
import { sendBotChannelMessage } from '../discord/sendBotMessage';
import { discordBotToken } from '../discord/botToken';

/**
 * スケジュール開始前の Discord リマインダー（1時間前・15分前）。
 *
 * アプリ内通知は廃止済みのため、この cron は Discord 送信のみを担う。
 * 実行時刻の揺らぎで取りこぼし・二重送信が起きないよう、実際の実行時刻ではなく
 * cron が予定していた発火時刻（event.scheduleTime）を分単位に切り捨てた値を基準に、
 * [基準+オフセット, 基準+オフセット+1分) の決定的ウィンドウで対象スケジュールを判定する。
 */
export const scheduleReminders = onSchedule(
  { schedule: '* * * * *', region: 'asia-northeast1', secrets: [discordBotToken] },
  async (event) => {
    // scheduleTime が取れない場合（手動実行など）は現在時刻にフォールバック
    const base = new Date(event.scheduleTime ?? Date.now());
    base.setSeconds(0, 0);

    const windows: Array<{ offsetMs: number; label: string; flag: string }> = [
      { offsetMs: 60 * 60 * 1000, label: '1時間後', flag: 'notifyBefore1h' },
      { offsetMs: 15 * 60 * 1000, label: '15分後', flag: 'notifyBefore15min' },
    ];

    const teamsSnap = await db.collection('teams').get();
    let sentCount = 0;

    for (const teamDoc of teamsSnap.docs) {
      const teamId = teamDoc.id;

      // Discord 未連携チームはスケジュール照会自体をスキップする
      const configSnap = await db.doc(`teams/${teamId}/discord/config`).get();
      if (!configSnap.exists) continue;

      const config = configSnap.data()!;
      if (!config.channelId && !config.webhookUrl) continue;

      for (const { offsetMs, label, flag } of windows) {
        // 未設定はデフォルト有効（opt-out）。明示的に false のときだけスキップ。
        if (config[flag] === false) continue;

        const windowStart = new Date(base.getTime() + offsetMs);
        const windowEnd = new Date(windowStart.getTime() + 60 * 1000);

        const schedulesSnap = await db
          .collection(`teams/${teamId}/schedules`)
          .where('startAt', '>=', Timestamp.fromDate(windowStart))
          .where('startAt', '<', Timestamp.fromDate(windowEnd))
          .get();

        for (const scheduleDoc of schedulesSnap.docs) {
          const schedule = scheduleDoc.data();
          // 終日予定は開始時刻の概念が薄いため時刻前リマインダーの対象外
          if (schedule.allDay === true) continue;

          const startTime = (schedule.startAt as Timestamp).toDate();
          const timeStr = startTime.toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Tokyo',
          });

          const embed: DiscordEmbed = {
            title: `⏰ ${label}にスケジュールが始まります`,
            color: 0xef9f27,
            fields: [
              { name: 'タイトル', value: (schedule.title as string) || '(無題)', inline: true },
              { name: '開始時刻', value: timeStr, inline: true },
            ],
          };

          // channelId（Bot 通知）を優先し、なければ Webhook にフォールバック
          if (config.channelId) {
            await sendBotChannelMessage(config.channelId as string, embed);
          } else if (config.webhookUrl) {
            await sendDiscordWebhook(config.webhookUrl as string, embed);
          }
          sentCount++;
        }
      }
    }

    logger.info(`Discord スケジュールリマインダー送信: ${sentCount}件`);
  }
);
