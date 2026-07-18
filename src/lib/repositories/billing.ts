import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase/client';

/**
 * Stripe 課金（T4）関連の callable ラッパー。
 *
 * - createStripeCheckoutSession: PARTY プランの Checkout セッションを作成し、遷移先 URL を返す。
 * - createStripePortalSession: 解約・支払い方法変更用の Customer Portal セッションを作成する。
 */
export const createStripeCheckoutSession = httpsCallable<
  Record<string, never>,
  { url: string | null }
>(functions, 'createStripeCheckoutSession');

export const createStripePortalSession = httpsCallable<
  Record<string, never>,
  { url: string }
>(functions, 'createStripePortalSession');
