// Next.js instrumentation エントリ。ランタイムに応じて Sentry 設定を読み込む。
// DSN 未設定時は各 config 内で初期化がスキップされるため完全に無効となる。
import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// サーバーコンポーネント・Route Handler のエラーを Sentry に捕捉させる（DSN 未設定時は no-op）。
export const onRequestError = Sentry.captureRequestError;
