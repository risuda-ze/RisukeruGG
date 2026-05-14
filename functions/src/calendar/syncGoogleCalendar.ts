import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import { db } from '../lib/admin';

/** 5分おきにGoogleカレンダーと差分同期する */
export const syncGoogleCalendar = onSchedule(
  { schedule: 'every 5 minutes', region: 'asia-northeast1' },
  async () => {
    // Googleカレンダー連携済みのユーザーを取得
    const usersSnap = await db
      .collection('users')
      .where('googleCalendar.connected', '==', true)
      .get();

    if (usersSnap.empty) {
      logger.info('Googleカレンダー連携ユーザーなし');
      return;
    }

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      const userData = userDoc.data();
      const gcal = userData.googleCalendar;

      if (!gcal?.accessToken) continue;

      try {
        // Google Calendar API v3でイベントを取得
        const response = await fetch(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=100&orderBy=startTime&singleEvents=true',
          {
            headers: { Authorization: `Bearer ${gcal.accessToken}` },
          }
        );

        if (response.status === 401) {
          // アクセストークン期限切れ
          await db.doc(`users/${uid}`).update({
            'googleCalendar.syncError': '再認証が必要です',
          });
          continue;
        }

        if (!response.ok) {
          await db.doc(`users/${uid}`).update({
            'googleCalendar.syncError': `APIエラー: ${response.status}`,
          });
          continue;
        }

        // 同期成功
        await db.doc(`users/${uid}`).update({
          'googleCalendar.syncError': null,
          'googleCalendar.lastSyncedAt': new Date(),
        });

        logger.info(`Googleカレンダー同期成功: ${uid}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : '不明なエラー';
        await db.doc(`users/${uid}`).update({
          'googleCalendar.syncError': message,
        });
        logger.error(`Googleカレンダー同期エラー: ${uid}`, err);
      }
    }
  }
);
