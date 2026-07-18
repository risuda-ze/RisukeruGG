/**
 * プラン判定の一元化モジュール（サーバー側 / Cloud Functions）。
 *
 * クライアント側の同等実装は `src/lib/plan.ts`。
 * Functions は src/ を import できないため二重定義になっている。
 * ロジックを変更する際は必ず両方を更新すること。
 *
 * 「試用モード」（FREE_PARTY_MODE）については
 * `docs/仕様・計画/plan/requirements.md` PL-011 を参照。
 *
 * サーバー側では Firestore の DocumentData から渡される plan 値が
 * 型上は string になり得るため、引数を緩めに受け取る。
 */

export type PlanType = 'light' | 'party';

/**
 * 試用モードが有効かどうか。
 * `FREE_PARTY_MODE === 'true'` のとき、実プラン値に関わらず
 * 全ユーザーを PARTY プラン相当として扱う。
 * クライアントだけで迂回されないよう、サーバー側の判定にも適用する（PL-009 / NFR-006）。
 */
export function isFreePartyMode(): boolean {
  return process.env.FREE_PARTY_MODE === 'true';
}

/**
 * 実効プランを返す。
 * 試用モード中は常に 'party'。それ以外は実プラン値（'party' 以外は 'light' 扱い）。
 */
export function getEffectivePlan(plan: string | null | undefined): PlanType {
  if (isFreePartyMode()) return 'party';
  return plan === 'party' ? 'party' : 'light';
}

/**
 * PARTY プラン相当かどうか。試用モード中は常に true。
 */
export function isPartyPlan(plan: string | null | undefined): boolean {
  return getEffectivePlan(plan) === 'party';
}
