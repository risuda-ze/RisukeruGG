import { onCall, CallableRequest } from 'firebase-functions/v2/https';
import { db, requireAuth } from '../lib/validateAuth';

/**
 * 一回限りの移行 CF: Firestore の全メンバードキュメントを新ロールスキーマへ更新する
 *
 * 旧スキーマ → 新スキーマ:
 *   'owner'  → 'operator'
 *   'editor' → 'member'
 *   'viewer' → 'rom'
 *
 * 呼び出し元は Firebase 認証済みである必要がある。
 * 1度実行すれば全ドキュメントが新スキーマになるため、以後は不要になる CF。
 */
export const migrateRoles = onCall(
  { region: 'asia-northeast1', timeoutSeconds: 540 },
  async (request: CallableRequest) => {
    // 認証チェック（誰でも呼べると危険なためログインユーザーのみ許可）
    requireAuth(request);

    const ROLE_MAP: Record<string, string> = {
      owner: 'operator',
      editor: 'member',
      viewer: 'rom',
    };

    let totalScanned = 0;
    let totalUpdated = 0;

    // 全チームを取得
    const teamsSnap = await db.collection('teams').get();

    for (const teamDoc of teamsSnap.docs) {
      const membersSnap = await db
        .collection(`teams/${teamDoc.id}/members`)
        .get();

      const batch = db.batch();
      let batchCount = 0;

      for (const memberDoc of membersSnap.docs) {
        totalScanned++;
        const currentRole = memberDoc.data().role as string | undefined;

        if (currentRole && ROLE_MAP[currentRole]) {
          batch.update(memberDoc.ref, { role: ROLE_MAP[currentRole] });
          batchCount++;
          totalUpdated++;
        }
      }

      // バッチに更新がある場合のみコミット
      if (batchCount > 0) {
        await batch.commit();
      }
    }

    return {
      success: true,
      totalScanned,
      totalUpdated,
      message: `移行完了: ${totalScanned} ドキュメントをスキャン、${totalUpdated} ドキュメントを更新しました`,
    };
  }
);
