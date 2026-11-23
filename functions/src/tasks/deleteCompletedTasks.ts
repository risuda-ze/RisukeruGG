import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import { Timestamp } from 'firebase-admin/firestore';
import { db } from '../lib/admin';

/** 完了タスクの保持期間（日数）。この日数を過ぎた完了タスクは自動削除する。 */
const RETENTION_DAYS = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Firestore の 1 バッチあたりの書き込み上限 */
const BATCH_LIMIT = 500;

/**
 * 完了ステータス（taskStatuses.role === 'done'）のカラムにあるタスクのうち、
 * 最終更新（updatedAt）から RETENTION_DAYS 日以上経過したものを物理削除する。
 *
 * 毎日 0:30 JST（UTC 15:30 前日）に実行する。
 */
export const deleteCompletedTasks = onSchedule(
  { schedule: '30 15 * * *', timeZone: 'UTC', region: 'asia-northeast1' },
  async () => {
    const cutoff = Timestamp.fromMillis(Date.now() - RETENTION_DAYS * MS_PER_DAY);

    const teamsSnap = await db.collection('teams').get();

    let deletedCount = 0;

    for (const teamDoc of teamsSnap.docs) {
      const teamId = teamDoc.id;

      // 完了ステータス（role === 'done'）のカラム ID を取得
      const doneStatusesSnap = await db
        .collection(`teams/${teamId}/taskStatuses`)
        .where('role', '==', 'done')
        .get();

      if (doneStatusesSnap.empty) continue;

      const doneColumnIds = doneStatusesSnap.docs.map((d) => d.id);

      // 削除対象タスクの ref を収集
      const staleTaskRefs: FirebaseFirestore.DocumentReference[] = [];
      const staleVideoRequestRefs = new Map<string, FirebaseFirestore.DocumentReference>();

      for (const columnId of doneColumnIds) {
        // 複合インデックスを避けるため columnId の等価条件のみで取得し、
        // updatedAt の判定はメモリ上で行う。
        const tasksSnap = await db
          .collection(`teams/${teamId}/tasks`)
          .where('columnId', '==', columnId)
          .get();

        for (const taskDoc of tasksSnap.docs) {
          const updatedAt = taskDoc.get('updatedAt') as Timestamp | undefined;
          if (updatedAt && updatedAt.toMillis() < cutoff.toMillis()) {
            const requestId = taskDoc.get('videoRequestId') ?? taskDoc.get('thumbnailRequestId');
            if (requestId) {
              const request = (
                await teamDoc.ref.collection('videoRequests').doc(requestId).get()
              ).data();
              if (
                request?.thumbnailTaskId &&
                (request.status !== 'completed' || request.thumbnailStatus !== 'completed')
              )
                continue;
              if (taskDoc.get('videoRequestId')) {
                staleVideoRequestRefs.set(
                  requestId,
                  teamDoc.ref.collection('videoRequests').doc(requestId)
                );
              }
            }
            staleTaskRefs.push(taskDoc.ref);
          }
        }
      }

      if (staleTaskRefs.length === 0) continue;

      // BATCH_LIMIT 件ずつバッチ削除
      for (let i = 0; i < staleTaskRefs.length; i += BATCH_LIMIT) {
        const batch = db.batch();
        for (const ref of staleTaskRefs.slice(i, i + BATCH_LIMIT)) {
          batch.delete(ref);
        }
        await batch.commit();
      }
      const requestRefs = [...staleVideoRequestRefs.values()];
      for (let i = 0; i < requestRefs.length; i += BATCH_LIMIT) {
        const batch = db.batch();
        for (const ref of requestRefs.slice(i, i + BATCH_LIMIT)) batch.delete(ref);
        await batch.commit();
      }

      deletedCount += staleTaskRefs.length;
    }

    logger.info(`完了から${RETENTION_DAYS}日経過したタスクを削除: ${deletedCount}件`);
  }
);
