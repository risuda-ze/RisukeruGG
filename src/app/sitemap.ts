import type { MetadataRoute } from 'next';

// sitemap.xml を動的生成する（App Router 規約ファイル）。
// 現存する公開ルートのみを列挙する。
// TODO: 別エージェントが作成中の /terms・/tokushoho を、公開後にここへ追加すること。

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://risukeru.gg';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: `${appUrl}/`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${appUrl}/privacy-policy`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
