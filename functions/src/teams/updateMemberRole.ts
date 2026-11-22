import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { db, getAuthContext, requireMemberRole } from '../lib/validateAuth';
import type { TeamRole } from '../lib/role';

/** 新しい要求形式の版。旧 `member`（編集者）と新 `member`（全権限）は同じ文字列で意味が逆のため、版が無い要求は拒否する */
const SCHEMA_VERSION = 2;

interface UpdateMemberRoleData {
  teamId: string;
  targetUserId: string;
  role: TeamRole;
  schemaVersion: number;
}

/**
 * 所属者のロールを変更する（Admin SDK 経由で Security Rules をバイパス）
 * 呼び出し元がメンバー権限を持つことを Cloud Function 側で検証する
 */
export const updateMemberRole = onCall(
  { region: 'asia-northeast1' },
  async (request: CallableRequest<UpdateMemberRoleData>) => {
    const { teamId, targetUserId, role, schemaVersion } = request.data;

    if (!teamId || !targetUserId || !role) {
      throw new HttpsError('invalid-argument', 'teamId・targetUserId・role が必要です');
    }

    // 古いタブからの要求（旧 member / rom / operator の意味での送信）を拒否する
    if (schemaVersion !== SCHEMA_VERSION) {
      throw new HttpsError('failed-precondition', 'ページを再読み込みしてからやり直してください');
    }

    if (role !== 'member' && role !== 'staff') {
      throw new HttpsError('invalid-argument', '無効なロールです');
    }

    // 呼び出し元がメンバーか確認
    const ctx = await getAuthContext(request, teamId);
    requireMemberRole(ctx);

    if (ctx.uid === targetUserId) {
      throw new HttpsError('invalid-argument', '自分自身のロールは変更できません');
    }

    const targetSnap = await db.doc(`teams/${teamId}/members/${targetUserId}`).get();
    if (!targetSnap.exists) {
      throw new HttpsError('not-found', '対象の所属者が見つかりません');
    }

    // 自分以外のロールだけを変更するため、呼び出し元（メンバー）は残り、メンバーが 0 人になることはない

    // Admin SDK で書き込み（Security Rules をバイパス）
    await db.doc(`teams/${teamId}/members/${targetUserId}`).update({ role });

    return { success: true };
  }
);
