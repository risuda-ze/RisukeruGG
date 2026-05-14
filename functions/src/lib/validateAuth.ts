import { HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { db } from './admin';

export { db };
export { HttpsError };

export interface AuthContext {
  uid: string;
  teamId: string;
  role: 'owner' | 'editor' | 'viewer';
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
    role: memberSnap.data()!.role as 'owner' | 'editor' | 'viewer',
  };
}

export function requireOwner(ctx: AuthContext): void {
  if (ctx.role !== 'owner') {
    throw new HttpsError('permission-denied', 'Owner権限が必要です');
  }
}

export function requireOwnerOrEditor(ctx: AuthContext): void {
  if (ctx.role !== 'owner' && ctx.role !== 'editor') {
    throw new HttpsError('permission-denied', 'Owner または Editor 権限が必要です');
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
