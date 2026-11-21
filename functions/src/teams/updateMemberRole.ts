import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { db, getAuthContext, requireOperator } from '../lib/validateAuth';

type UserRole = 'operator' | 'member' | 'staff' | 'rom';

interface UpdateMemberRoleData {
  teamId: string;
  targetUserId: string;
  role: UserRole;
}

/**
 * メンバーのロールを変更する（Admin SDK 経由で Security Rules をバイパス）
 * 呼び出し元がオペレーター権限を持つことを Cloud Function 側で検証する
 */
export const updateMemberRole = onCall(
  { region: 'asia-northeast1' },
  async (request: CallableRequest<UpdateMemberRoleData>) => {
    const { teamId, targetUserId, role } = request.data;

    if (!teamId || !targetUserId || !role) {
      throw new HttpsError('invalid-argument', 'teamId・targetUserId・role が必要です');
    }

    if (!['operator', 'member', 'staff', 'rom'].includes(role)) {
      throw new HttpsError('invalid-argument', '無効なロールです');
    }

    // 呼び出し元がオペレーター以上か確認
    const ctx = await getAuthContext(request, teamId);
    requireOperator(ctx);

    if (ctx.uid === targetUserId && role !== 'operator') {
      throw new HttpsError('invalid-argument', '自分自身をオペレーター以外に変更することはできません');
    }

    // Admin SDK で書き込み（Security Rules をバイパス）
    await db.doc(`teams/${teamId}/members/${targetUserId}`).update({ role });

    return { success: true };
  }
);
