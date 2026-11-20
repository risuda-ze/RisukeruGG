import { onCall, type CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { db, getAuthContext, requireOwnerOrEditor } from '../lib/validateAuth';

/**
 * タスクを削除する。
 * 動画依頼から作られたタスクには videoRequestId があるため、対応する動画依頼カードも同時に削除する。
 */
export const deleteTask = onCall(
  { region: 'asia-northeast1' },
  async (request: CallableRequest<{ teamId: string; taskId: string }>) => {
    const { teamId, taskId } = request.data;
    if (!teamId || !taskId) throw new HttpsError('invalid-argument', 'タスクが指定されていません');
    const ctx = await getAuthContext(request, teamId);
    requireOwnerOrEditor(ctx);
    const taskRef = db.doc(`teams/${teamId}/tasks/${taskId}`);

    await db.runTransaction(async (tx) => {
      const task = await tx.get(taskRef);
      if (!task.exists) throw new HttpsError('not-found', 'タスクが見つかりません');
      const videoRequestId = task.data()?.videoRequestId as string | undefined;
      if (videoRequestId) {
        const ref = db.doc(`teams/${teamId}/videoRequests/${videoRequestId}`);
        const linked = (await tx.get(ref)).data();
        if (linked?.taskId === taskId) {
          if (linked.thumbnailTaskId)
            tx.delete(db.doc(`teams/${teamId}/tasks/${linked.thumbnailTaskId}`));
          tx.delete(ref);
        }
      } else if (task.get('thumbnailRequestId')) {
        const ref = db
          .collection('teams')
          .doc(teamId)
          .collection('videoRequests')
          .doc(task.get('thumbnailRequestId'));
        if ((await tx.get(ref)).get('thumbnailTaskId') === taskId)
          tx.update(ref, { thumbnailTaskId: null, thumbnailStatus: null });
      }
      tx.delete(taskRef);
    });
  }
);
