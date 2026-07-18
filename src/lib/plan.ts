import type { PlanType } from '@/types/entities';

/**
 * プラン判定の一元化モジュール（クライアント側）。
 *
 * サーバー側の同等実装は `functions/src/lib/plan.ts`。
 * Functions は src/ を import できないため二重定義になっている。
 * ロジックを変更する際は必ず両方を更新すること。
 *
 * 「試用モード」（FREE_PARTY_MODE）については
 * `docs/仕様・計画/plan/requirements.md` PL-011 を参照。
 */

/**
 * 試用モードが有効かどうか。
 * `NEXT_PUBLIC_FREE_PARTY_MODE === 'true'` のとき、実プラン値に関わらず
 * 全ユーザーを PARTY プラン相当として扱う。
 */
export function isFreePartyMode(): boolean {
  return process.env.NEXT_PUBLIC_FREE_PARTY_MODE === 'true';
}

/**
 * 実効プランを返す。
 * 試用モード中は常に 'party'。それ以外は実プラン値（未設定は 'light' 扱い）。
 */
export function getEffectivePlan(plan: PlanType | null | undefined): PlanType {
  if (isFreePartyMode()) return 'party';
  return plan === 'party' ? 'party' : 'light';
}

/**
 * PARTY プラン相当かどうか。試用モード中は常に true。
 */
export function isPartyPlan(plan: PlanType | null | undefined): boolean {
  return getEffectivePlan(plan) === 'party';
}
