import { FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { db } from '../lib/admin';
import type { PlanType } from '../lib/plan';

/**
 * ユーザーのプランを更新し、所属する全チームの members スナップショットへ伝播する。
 *
 * 正本は `users/{uid}.plan`。`teams/{teamId}/members/{uid}.plan` は参照用スナップショット
 * （plan/model.md 参照）。両者を 1 バッチで更新して整合を保つ。
 * 既存の伝播パターン（functions/src/teams/*.ts）に合わせ、teamIds を辿って members を更新する。
 *
 * Stripe Webhook からの唯一の plan 書き込み経路。クライアントからの plan 書き換えは
 * Firestore ルールで禁止している。
 *
 * @param uid 対象ユーザー
 * @param plan 更新後のプラン
 * @param stripeCustomerId 指定時は users ドキュメントへ併せて保存（初回チェックアウト時）
 */
export async function applyPlanToUser(
  uid: string,
  plan: PlanType,
  stripeCustomerId?: string
): Promise<void> {
  const userRef = db.doc(`users/${uid}`);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    logger.warn('applyPlanToUser: users ドキュメントが見つかりません', { uid, plan });
    return;
  }

  const data = userSnap.data() as Record<string, unknown>;
  const teamIds: string[] = Array.isArray(data.teamIds)
    ? (data.teamIds as string[])
    : data.currentTeamId
      ? [data.currentTeamId as string]
      : [];

  const batch = db.batch();

  const userUpdate: Record<string, unknown> = {
    plan,
    planUpdatedAt: FieldValue.serverTimestamp(),
  };
  if (stripeCustomerId) {
    userUpdate.stripeCustomerId = stripeCustomerId;
  }
  batch.update(userRef, userUpdate);

  // members スナップショットへ伝播（存在するドキュメントのみ更新し、孤立 teamId は無視）
  if (teamIds.length > 0) {
    const memberRefs = teamIds.map((teamId) => db.doc(`teams/${teamId}/members/${uid}`));
    const memberSnaps = await db.getAll(...memberRefs);
    for (const memberSnap of memberSnaps) {
      if (memberSnap.exists) {
        batch.update(memberSnap.ref, { plan });
      }
    }
  }

  await batch.commit();
  logger.info('プランを更新しました', { uid, plan, teamCount: teamIds.length });
}
