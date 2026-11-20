import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  // AGENTS.mdはリポジトリ独自の日本語ガイドを維持する。
  agentRules: false,
  experimental: {},
  turbopack: {},
  async redirects() {
    return [
      // カテゴリ統合(#77)で削除・改名された旧設定ルートの互換リダイレクト。
      // 旧バージョンのキャッシュ・ブックマーク・セッション復元からの
      // アクセスが404になるのを防ぐ。
      {
        source: '/settings',
        destination: '/settings/categories',
        permanent: false,
      },
      {
        source: '/settings/tasks',
        destination: '/settings/categories',
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        // リセットSW(public/sw.js)は常に最新を取得させ、
        // 旧next-pwa SWを確実に置き換えるためキャッシュさせない。
        source: '/sw.js',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
      },
    ];
  },
};

// Sentry は DSN が設定されている場合のみ有効化する。
// DSN 未設定時は素の Next.js 設定を返すため、ビルドに一切影響しない。
const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
// ソースマップのアップロードは認証トークンがある場合のみ実行する（トークン無しでも build が通る）。
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;

export default sentryDsn
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: sentryAuthToken,
      // CI 以外ではビルドログを抑制する。
      silent: !process.env.CI,
      // 認証トークンが無い環境ではソースマップのアップロードを無効化する。
      sourcemaps: { disable: !sentryAuthToken },
      // クライアントバンドルのアップロード範囲を広げ、スタックトレースの解決精度を上げる。
      widenClientFileUpload: true,
      // Sentry ロガーをツリーシェイクしてバンドルサイズを削減する。
      disableLogger: true,
    })
  : nextConfig;
