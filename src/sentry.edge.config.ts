// Sentry Edge ランタイム（middleware・Edge Route）初期化設定。
// DSN 未設定時は Sentry.init が実質的な no-op となり、イベントは一切送信されない。
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// DSN が空の場合は初期化自体を行わず、完全に無効化する。
if (dsn) {
  Sentry.init({
    dsn,
    // トレースのサンプリングは控えめに設定（10%）。
    tracesSampleRate: 0.1,
    // 個人情報（IP アドレス・Cookie 等）を送信しない。
    sendDefaultPii: false,
    debug: false,
  });
}
