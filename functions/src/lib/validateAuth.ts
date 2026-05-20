import { HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { db } from './admin';

export { db };
export { HttpsError };

export interface AuthContext {
  uid: string;
  teamId: string;
  role: 'operator' | 'member' | 'rom';
}

function normalizeRole(raw: string): 'operator' | 'member' | 'rom' {
  if (raw === 'owner') return 'operator';
  if (raw === 'editor') return 'member';
  if (raw === 'viewer') return 'rom';
  return raw as 'operator' | 'member' | 'rom';
}

/** 認証済みユーザーのチームメンバー情報を取得する */
export async function getAuthContext(
  callableRequest: CallableRequest,
  teamId: string
): Promise<AuthContext> {
  if (!callableRequest.auth) {
    throw new HttpsError('unauthenticated', '認証が必要です');
  }

  const uid = callableRequest.auth.uid;
  const memberSnap = await db.doc(`teams/${teamId}/members/${uid}`).get();

  if (!memberSnap.exists) {
    throw new HttpsError('permission-denied', 'チームメンバーではありません');
  }

  return {
    uid,
    teamId,
    role: normalizeRole(memberSnap.data()!.role as string),
  };
}

export function requireOperator(ctx: AuthContext): void {
  if (ctx.role !== 'operator') {
    throw new HttpsError('permission-denied', 'オペレーター権限が必要です');
  }
}

export function requireOperatorOrMember(ctx: AuthContext): void {
  if (ctx.role !== 'operator' && ctx.role !== 'member') {
    throw new HttpsError('permission-denied', 'オペレーターまたはメンバー権限が必要です');
  }
}

export function requireAuth(callableRequest: CallableRequest): string {
  if (!callableRequest.auth) {
    throw new HttpsError('unauthenticated', '認証が必要です');
  }
  return callableRequest.auth.uid;
}

export async function getUserDoc(uid: string) {
  const snap = await db.doc(`users/${uid}`).get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'ユーザーが見つかりません');
  }
  return snap.data()!;
}
