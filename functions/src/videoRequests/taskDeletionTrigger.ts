import { onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { db } from '../lib/admin';

/**
 * 動画依頼に紐づくタスクがクライアントから直接削除された場合も、動画依頼カードを残さない。
 * Callable Function以外（旧画面・管理操作）からの削除を後方互換で補う。
 */
export const deleteVideoRequestWithTask = onDocumentDeleted(
  { document: 'teams/{teamId}/tasks/{taskId}', region: 'asia-northeast1' },
  async (event) => {
    const task = event.data?.data();
    const videoRequestId = task?.videoRequestId as string | undefined;
    if (!videoRequestId) return;
    await db.doc(`teams/${event.params.teamId}/videoRequests/${videoRequestId}`).delete();
  }
);
