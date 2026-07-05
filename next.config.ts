import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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

export default nextConfig;
