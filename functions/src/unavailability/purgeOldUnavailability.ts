import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import { db } from '../lib/admin';
import { deleteInBatches } from './cleanup';
import { purgeBeforeMonth } from './month';

/** 毎月 1 日 0:00 JST に、前々月以前の対応不可を全チームから削除する（UN-022） */
export const purgeOldUnavailability = onSchedule(
  { schedule: '0 0 1 * *', timeZone: 'Asia/Tokyo', region: 'asia-northeast1' },
  async () => {
    const before = purgeBeforeMonth(new Date());
    const snap = await db.collectionGroup('unavailability').where('month', '<', before).get();
    const count = await deleteInBatches(snap.docs);
    logger.info(`対応不可の月次削除完了: ${count}件（${before} より前）`);
  }
);
