import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { db, requireAuth } from '../lib/validateAuth';
import {
  getStripeClient,
  getAppBaseUrl,
  stripeSecretKey,
  STRIPE_FUNCTION_REGION,
} from '../lib/stripeConfig';

/**
 * Stripe Customer Portal のセッションを作成する（callable）。
 *
 * 解約・支払い方法変更・請求履歴確認は Portal に委譲する。
 * stripeCustomerId が未登録（＝一度も課金導線を通っていない）の場合はエラーを返す。
 */
export const createStripePortalSession = onCall(
  {
    region: STRIPE_FUNCTION_REGION,
    secrets: [stripeSecretKey],
  },
  async (request: CallableRequest): Promise<{ url: string }> => {
    const uid = requireAuth(request);

    const userSnap = await db.doc(`users/${uid}`).get();
    const customerId = userSnap.exists
      ? (userSnap.data() as Record<string, unknown>).stripeCustomerId
      : undefined;
    if (typeof customerId !== 'string' || !customerId) {
      throw new HttpsError('failed-precondition', '支払い情報が見つかりません');
    }

    const stripe = getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${getAppBaseUrl()}/settings/profile`,
    });

    return { url: session.url };
  }
);
