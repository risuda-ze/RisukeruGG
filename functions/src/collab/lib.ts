import { HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../lib/validateAuth';
import { LIGHT_PLAN_LIMITS } from '../lib/constants';

type UserData = FirebaseFirestore.DocumentData;

/** LIGHTプランのコラボ作成上限に達していれば例外を投げる */
export function assertCollabQuota(userData: UserData): void {
  if (
    userData.plan === 'light' &&
    userData.monthlyCollabCount >= LIGHT_PLAN_LIMITS.monthlyCollabs
  ) {
    throw new HttpsError(
      'failed-precondition',
      `LIGHTプランのコラボ作成上限（月${LIGHT_PLAN_LIMITS.monthlyCollabs}件）に達しました。PARTYプランにアップグレードしてください`
    );
  }
}

/** 同時進行中とみなすステータス（調整が継続中のもの） */
const ACTIVE_COLLAB_STATUSES = ['draft', 'open'] as const;

/**
 * LIGHTプランの場合、チーム内で同時進行中（draft/open）のコラボ調整が
 * 上限に達していれば例外を投げる。PARTYプランは無制限。
 */
export async function assertActiveCollabLimit(teamId: string, userData: UserData): Promise<void> {
  if (userData.plan !== 'light') return;

  const snap = await db
    .collection(`teams/${teamId}/collabSessions`)
    .where('status', 'in', [...ACTIVE_COLLAB_STATUSES])
    .count()
    .get();

  if (snap.data().count >= LIGHT_PLAN_LIMITS.maxActiveCollabs) {
    throw new HttpsError(
      'failed-precondition',
      `LIGHTプランの同時進行コラボ上限（${LIGHT_PLAN_LIMITS.maxActiveCollabs}件）に達しました。進行中のコラボを完了・キャンセルするか、PARTYプランにアップグレードしてください`
    );
  }
}

/** LIGHTプランの場合、月次コラボ作成カウントを +1 する（トランザクション内で呼ぶ） */
export function incrementCollabCount(
  tx: FirebaseFirestore.Transaction,
  uid: string,
  userData: UserData
): void {
  if (userData.plan === 'light') {
    tx.update(db.doc(`users/${uid}`), {
      monthlyCollabCount: FieldValue.increment(1),
    });
  }
}
