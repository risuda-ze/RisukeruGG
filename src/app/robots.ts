import type { MetadataRoute } from 'next';

// robots.txt を動的生成する（App Router 規約ファイル）。
// 認証保護ルート（(protected) 配下）・API・ログイン画面はクロール対象外とする。

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://risukeru.gg';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/login',
        '/dashboard',
        '/schedule',
        '/tasks',
        '/collabs',
        '/team',
        '/notifications',
        '/settings',
        '/chat',
        '/integrations',
      ],
    },
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
