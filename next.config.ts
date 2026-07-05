// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require('next-pwa') as (config: object) => (nextConfig: object) => object;
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {},
  turbopack: {},
  async redirects() {
    return [
      // カテゴリ統合(#77)で削除・改名された旧設定ルートの互換リダイレクト。
      // 旧バージョンのPWAキャッシュ・ブックマーク・セッション復元からの
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
};

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      // スケジュールデータAPIをStale-While-Revalidateでキャッシュ
      urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'firestore-schedule-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 5,
        },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-cache',
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 60 * 60 * 24 * 365,
        },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        },
      },
    },
  ],
})(nextConfig);
