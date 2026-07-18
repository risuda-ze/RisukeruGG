import { onRequest, Request } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { FieldValue } from 'firebase-admin/firestore';
import Stripe from 'stripe';
import { db } from '../lib/admin';
import {
  getStripeClient,
  stripeSecretKey,
  stripeWebhookSecret,
  STRIPE_FUNCTION_REGION,
} from '../lib/stripeConfig';
import { applyPlanToUser } from '../plan/applyPlan';
import { handleStripeEvent, StripeEventLike, StripeWebhookPort } from './webhookLogic';

/**
 * Stripe Webhook 受信エンドポイント（v2 onRequest）。
 *
 * - `STRIPE_WEBHOOK_SECRET` で署名を検証し、なりすましイベントを拒否する。
 * - 冪等性: 処理済みイベント ID を `stripeEvents/{eventId}` に記録し、再送を無視する。
 * - プラン遷移ロジックは webhookLogic.ts（テスト対象）に委譲する。
 */
export const stripeWebhook = onRequest(
  {
    region: STRIPE_FUNCTION_REGION,
    secrets: [stripeSecretKey, stripeWebhookSecret],
  },
  async (req: Request, res): Promise<void> => {
    const signature = req.headers['stripe-signature'];
    if (typeof signature !== 'string') {
      res.status(400).send('missing stripe-signature header');
      return;
    }

    let event: Stripe.Event;
    try {
      const stripe = getStripeClient();
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        stripeWebhookSecret.value()
      );
    } catch (err) {
      logger.error('Stripe 署名検証に失敗', {
        error: err instanceof Error ? err.message : String(err),
      });
      res.status(400).send('signature verification failed');
      return;
    }

    const port: StripeWebhookPort = {
      isEventProcessed: async (eventId) => (await db.doc(`stripeEvents/${eventId}`).get()).exists,
      markEventProcessed: async (eventId, eventType) => {
        await db.doc(`stripeEvents/${eventId}`).set({
          type: eventType,
          processedAt: FieldValue.serverTimestamp(),
        });
      },
      findUidByStripeCustomerId: async (customerId) => {
        const snap = await db
          .collection('users')
          .where('stripeCustomerId', '==', customerId)
          .limit(1)
          .get();
        return snap.empty ? null : snap.docs[0].id;
      },
      applyPlan: (uid, plan, stripeCustomerId) => applyPlanToUser(uid, plan, stripeCustomerId),
    };

    // Stripe.Event の data.object はイベント種別ごとの具体型のユニオンだが、
    // webhookLogic 側は必要なフィールドのみを Record として参照するため橋渡しする。
    const eventLike: StripeEventLike = {
      id: event.id,
      type: event.type,
      data: { object: event.data.object as unknown as Record<string, unknown> },
    };

    try {
      const result = await handleStripeEvent(eventLike, port);
      logger.info('Stripe Webhook 処理完了', {
        eventId: event.id,
        type: event.type,
        result,
      });
      res.status(200).json({ received: true });
    } catch (err) {
      logger.error('Stripe Webhook 処理に失敗', {
        eventId: event.id,
        type: event.type,
        error: err instanceof Error ? { message: err.message, stack: err.stack } : String(err),
      });
      // 非 2xx を返して Stripe に再送させる
      res.status(500).send('webhook handler failed');
      return;
    }
  }
);
