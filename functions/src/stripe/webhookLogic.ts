import type { PlanType } from '../lib/plan';

/**
 * Stripe Webhook のプラン遷移ロジック（副作用なしの純粋部分 + 依存注入ポート）。
 *
 * Firestore / Stripe SDK に直接依存させず、ポート（StripeWebhookPort）越しに副作用を行うことで
 * ユニットテスト可能にしている。署名検証・実 Firestore アクセスは呼び出し側
 * （functions/src/stripe/stripeWebhook.ts）が担う。
 */

/** テストしやすいよう Stripe.Event の必要部分だけを抽象化した型。 */
export interface StripeEventLike {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

/**
 * Webhook イベント種別 → 目標プラン。
 *
 * - `checkout.session.completed`      → party（アップグレード）
 * - `customer.subscription.deleted`   → light（降格）
 * - それ以外（`invoice.payment_failed` 含む） → null（プラン変更なし）
 *
 * 支払い失敗時の猶予は Stripe 側に委ね、実際の降格は subscription.deleted の受信時のみ行う
 * （release-preparation.md T4 決定）。
 */
export function planForStripeEvent(eventType: string): PlanType | null {
  switch (eventType) {
    case 'checkout.session.completed':
      return 'party';
    case 'customer.subscription.deleted':
      return 'light';
    default:
      return null;
  }
}

/** Webhook 処理で必要な副作用を注入するポート。 */
export interface StripeWebhookPort {
  /** 既に処理済みのイベント ID かどうか（冪等性判定）。 */
  isEventProcessed(eventId: string): Promise<boolean>;
  /** イベント ID を処理済みとして記録する。 */
  markEventProcessed(eventId: string, eventType: string): Promise<void>;
  /** stripeCustomerId から uid を解決する（見つからなければ null）。 */
  findUidByStripeCustomerId(customerId: string): Promise<string | null>;
  /** users/{uid}.plan と所属チームの members/{uid}.plan を更新する。 */
  applyPlan(uid: string, plan: PlanType, stripeCustomerId?: string): Promise<void>;
}

/** Webhook 処理結果。 */
export type WebhookResult =
  | { action: 'duplicate' }
  | { action: 'ignored'; reason: string }
  | { action: 'upgraded'; uid: string }
  | { action: 'downgraded'; uid: string };

/**
 * 検証済み Stripe イベントを処理してプランへ反映する。
 *
 * 冪等性: 同一イベント ID が再送された場合は `duplicate` を返して副作用を行わない。
 * applyPlan はいずれも固定プランへの set 相当で冪等なため、二重適用されても結果は変わらない。
 */
export async function handleStripeEvent(
  event: StripeEventLike,
  port: StripeWebhookPort
): Promise<WebhookResult> {
  if (await port.isEventProcessed(event.id)) {
    return { action: 'duplicate' };
  }

  const result = await applyEventToPlan(event, port);
  await port.markEventProcessed(event.id, event.type);
  return result;
}

/** イベント種別ごとの実処理（冪等性判定は handleStripeEvent 側で完了済み）。 */
async function applyEventToPlan(
  event: StripeEventLike,
  port: StripeWebhookPort
): Promise<WebhookResult> {
  const targetPlan = planForStripeEvent(event.type);
  if (!targetPlan) {
    return { action: 'ignored', reason: `未対応イベント: ${event.type}` };
  }

  const obj = event.data.object;

  if (event.type === 'checkout.session.completed') {
    const uid = typeof obj.client_reference_id === 'string' ? obj.client_reference_id : undefined;
    const customerId = typeof obj.customer === 'string' ? obj.customer : undefined;
    if (!uid) {
      return { action: 'ignored', reason: 'client_reference_id が無いためユーザーを特定できません' };
    }
    await port.applyPlan(uid, 'party', customerId);
    return { action: 'upgraded', uid };
  }

  // customer.subscription.deleted
  const customerId = typeof obj.customer === 'string' ? obj.customer : undefined;
  if (!customerId) {
    return { action: 'ignored', reason: 'customer が無いためユーザーを特定できません' };
  }
  const uid = await port.findUidByStripeCustomerId(customerId);
  if (!uid) {
    return { action: 'ignored', reason: `customer ${customerId} に対応するユーザーが見つかりません` };
  }
  await port.applyPlan(uid, 'light');
  return { action: 'downgraded', uid };
}
