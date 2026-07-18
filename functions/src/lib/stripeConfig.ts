import Stripe from 'stripe';
import { defineSecret } from 'firebase-functions/params';

/**
 * Stripe 課金（T4）の共通設定。
 *
 * Secrets は Firebase Secret Manager に登録し、各 Function の `secrets` オプションに列挙する。
 *   STRIPE_SECRET_KEY     : Stripe のシークレットキー（sk_...）
 *   STRIPE_PRICE_ID       : PARTY プラン（月額500円税込）の Price ID（price_...）
 *   STRIPE_WEBHOOK_SECRET : Webhook 署名シークレット（whsec_...）
 *
 * Secrets 未設定でもモジュールの import・ビルドは壊れない。`.value()` は
 * Secret を宣言した Function の実行時にのみ呼び出す。
 */
export const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
export const stripePriceId = defineSecret('STRIPE_PRICE_ID');
export const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');

/** 無料トライアル日数（PL-008 / 2026-07-17 決定）。 */
export const TRIAL_PERIOD_DAYS = 14;

/** すべての課金 Function 共通のリージョン。 */
export const STRIPE_FUNCTION_REGION = 'asia-northeast1';

/**
 * 成功/キャンセル/戻り先 URL のベース。
 * Functions 環境変数 `NEXT_PUBLIC_APP_URL`（クライアントと同一値）を参照し、
 * 未設定時は本番ドメインにフォールバックする（アプリ側の既定と揃える）。
 */
export function getAppBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://risukeru.gg';
}

/** Secret から Stripe クライアントを生成する（実行時のみ呼び出すこと）。 */
export function getStripeClient(): Stripe {
  return new Stripe(stripeSecretKey.value());
}
