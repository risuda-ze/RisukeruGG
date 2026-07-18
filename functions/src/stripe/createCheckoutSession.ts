import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { db, requireAuth } from '../lib/validateAuth';
import {
  getStripeClient,
  getAppBaseUrl,
  stripeSecretKey,
  stripePriceId,
  TRIAL_PERIOD_DAYS,
  STRIPE_FUNCTION_REGION,
} from '../lib/stripeConfig';

/**
 * PARTY プランの Stripe Checkout セッションを作成する（callable）。
 *
 * - 認証必須。subscription モード・14日トライアル付き。
 * - 既存 stripeCustomerId があれば再利用し、無ければ Customer を作成して保存する。
 * - client_reference_id に uid を渡し、Webhook でユーザーを特定できるようにする。
 */
export const createStripeCheckoutSession = onCall(
  {
    region: STRIPE_FUNCTION_REGION,
    secrets: [stripeSecretKey, stripePriceId],
  },
  async (request: CallableRequest): Promise<{ url: string | null }> => {
    const uid = requireAuth(request);
    const stripe = getStripeClient();

    const userRef = db.doc(`users/${uid}`);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      throw new HttpsError('not-found', 'ユーザーが見つかりません');
    }
    const userData = userSnap.data() as Record<string, unknown>;

    // 既存 customer の再利用（重複課金対象の作成を避ける）
    let customerId =
      typeof userData.stripeCustomerId === 'string' ? userData.stripeCustomerId : undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: typeof userData.email === 'string' ? userData.email : undefined,
        metadata: { firebaseUID: uid },
      });
      customerId = customer.id;
      await userRef.set({ stripeCustomerId: customerId }, { merge: true });
    }

    const baseUrl = getAppBaseUrl();
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: uid,
      line_items: [{ price: stripePriceId.value(), quantity: 1 }],
      subscription_data: { trial_period_days: TRIAL_PERIOD_DAYS },
      success_url: `${baseUrl}/settings/profile?checkout=success`,
      cancel_url: `${baseUrl}/settings/profile?checkout=cancel`,
    });

    return { url: session.url };
  }
);
