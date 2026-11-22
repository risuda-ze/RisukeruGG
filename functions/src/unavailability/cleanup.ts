import { logger } from 'firebase-functions/v2';
import { db } from '../lib/admin';

/** 1 バッチの上限（Firestore は 500 件まで） */
const BATCH_SIZE = 400;

/** ドキュメントをバッチに分けて削除し、削除件数を返す */
export async function deleteInBatches(
  docs: FirebaseFirestore.QueryDocumentSnapshot[]
): Promise<number> {
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const doc of docs.slice(i, i + BATCH_SIZE)) batch.delete(doc.ref);
    await batch.commit();
  }
  return docs.length;
}

/**
 * 退出・Kick・アカウント削除の後に、対象ユーザーのそのチームの対応不可を消す（UN-023）。
 * 失敗しても呼び出し元の処理は成立させ、エラーログに残す。残った分は月次削除で消える。
 */
export async function deleteUserUnavailability(teamId: string, userId: string): Promise<void> {
  try {
    const snap = await db
      .collection(`teams/${teamId}/unavailability`)
      .where('userId', '==', userId)
      .get();
    await deleteInBatches(snap.docs);
  } catch (error) {
    logger.error('対応不可の削除に失敗', { teamId, userId, error });
  }
}
