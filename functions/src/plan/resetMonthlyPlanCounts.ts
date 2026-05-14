import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../lib/admin';

/** 毎月1日 0:00 JST（UTC 15:00 前日）に月次カウントをリセットする */
export const resetMonthlyPlanCounts = onSchedule(
  { schedule: '15 0 1 * *', timeZone: 'UTC', region: 'asia-northeast1' },
  async () => {
    const now = FieldValue.serverTimestamp();
    let count = 0;

    const usersQuery = db.collection('users').where('plan', '==', 'light');
    const snapshot = await usersQuery.get();

    const batchSize = 400;
    let currentBatch = db.batch();
    let batchCount = 0;
    const batches: FirebaseFirestore.WriteBatch[] = [];

    for (const doc of snapshot.docs) {
      currentBatch.update(doc.ref, {
        monthlyTaskCount: 0,
        monthlyCollabCount: 0,
        countResetAt: now,
      });
      batchCount++;
      count++;

      if (batchCount >= batchSize) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) batches.push(currentBatch);

    await Promise.all(batches.map((b) => b.commit()));

    logger.info(`月次カウントリセット完了: ${count}件`);
  }
);
