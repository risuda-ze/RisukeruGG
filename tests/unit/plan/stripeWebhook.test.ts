import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlanType } from '../../../functions/src/lib/plan';
import {
  handleStripeEvent,
  planForStripeEvent,
  type StripeEventLike,
  type StripeWebhookPort,
} from '../../../functions/src/stripe/webhookLogic';

/**
 * Stripe Webhook のプラン遷移ロジック（functions/src/stripe/webhookLogic.ts）のテスト。
 * Stripe SDK / Firestore は StripeWebhookPort をモックして排除し、
 * イベント種別 → plan 遷移と冪等性（同一イベント再送）を検証する。
 */

/** applyPlan / 冪等性ストアをインメモリで再現するモックポート。 */
function createMockPort(customerToUid: Record<string, string> = {}) {
  const processedEvents = new Set<string>();
  const applyPlan = vi.fn(async (_uid: string, _plan: PlanType, _customerId?: string) => {});

  const port: StripeWebhookPort = {
    isEventProcessed: async (eventId) => processedEvents.has(eventId),
    markEventProcessed: async (eventId) => {
      processedEvents.add(eventId);
    },
    findUidByStripeCustomerId: async (customerId) => customerToUid[customerId] ?? null,
    applyPlan,
  };

  return { port, applyPlan, processedEvents };
}

function checkoutCompletedEvent(overrides?: Partial<Record<string, unknown>>): StripeEventLike {
  return {
    id: 'evt_checkout_1',
    type: 'checkout.session.completed',
    data: {
      object: {
        client_reference_id: 'user-1',
        customer: 'cus_123',
        ...overrides,
      },
    },
  };
}

function subscriptionDeletedEvent(): StripeEventLike {
  return {
    id: 'evt_deleted_1',
    type: 'customer.subscription.deleted',
    data: { object: { customer: 'cus_123' } },
  };
}

describe('planForStripeEvent（イベント種別 → 目標プラン）', () => {
  it('checkout.session.completed は party', () => {
    expect(planForStripeEvent('checkout.session.completed')).toBe('party');
  });

  it('customer.subscription.deleted は light', () => {
    expect(planForStripeEvent('customer.subscription.deleted')).toBe('light');
  });

  it('invoice.payment_failed はプラン変更なし（猶予は Stripe 任せ）', () => {
    expect(planForStripeEvent('invoice.payment_failed')).toBeNull();
  });

  it('未対応イベントは null', () => {
    expect(planForStripeEvent('customer.subscription.updated')).toBeNull();
  });
});

describe('handleStripeEvent（プラン遷移）', () => {
  let mock: ReturnType<typeof createMockPort>;

  beforeEach(() => {
    mock = createMockPort({ cus_123: 'user-1' });
  });

  it('checkout.session.completed で party へアップグレードし customerId を保存する', async () => {
    const result = await handleStripeEvent(checkoutCompletedEvent(), mock.port);
    expect(result).toEqual({ action: 'upgraded', uid: 'user-1' });
    expect(mock.applyPlan).toHaveBeenCalledWith('user-1', 'party', 'cus_123');
  });

  it('customer.subscription.deleted で customerId から uid を解決し light へ降格する', async () => {
    const result = await handleStripeEvent(subscriptionDeletedEvent(), mock.port);
    expect(result).toEqual({ action: 'downgraded', uid: 'user-1' });
    expect(mock.applyPlan).toHaveBeenCalledWith('user-1', 'light');
  });

  it('invoice.payment_failed は無視され plan を変更しない', async () => {
    const event: StripeEventLike = {
      id: 'evt_failed_1',
      type: 'invoice.payment_failed',
      data: { object: { customer: 'cus_123' } },
    };
    const result = await handleStripeEvent(event, mock.port);
    expect(result.action).toBe('ignored');
    expect(mock.applyPlan).not.toHaveBeenCalled();
  });

  it('client_reference_id が無い checkout は無視する', async () => {
    const event = checkoutCompletedEvent({ client_reference_id: undefined });
    const result = await handleStripeEvent(event, mock.port);
    expect(result.action).toBe('ignored');
    expect(mock.applyPlan).not.toHaveBeenCalled();
  });

  it('未知の customerId の subscription.deleted は無視する', async () => {
    mock = createMockPort({}); // 対応 uid なし
    const result = await handleStripeEvent(subscriptionDeletedEvent(), mock.port);
    expect(result.action).toBe('ignored');
    expect(mock.applyPlan).not.toHaveBeenCalled();
  });
});

describe('handleStripeEvent（冪等性）', () => {
  it('同一イベント ID の再送は duplicate となり applyPlan を再実行しない', async () => {
    const mock = createMockPort({ cus_123: 'user-1' });

    const first = await handleStripeEvent(checkoutCompletedEvent(), mock.port);
    expect(first).toEqual({ action: 'upgraded', uid: 'user-1' });

    const second = await handleStripeEvent(checkoutCompletedEvent(), mock.port);
    expect(second).toEqual({ action: 'duplicate' });

    // 2 回目は副作用なし（applyPlan は初回の 1 回だけ）
    expect(mock.applyPlan).toHaveBeenCalledTimes(1);
  });
});
