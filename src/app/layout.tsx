import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/components/AuthProvider';
import { AnalyticsListener } from '@/components/AnalyticsListener';
import './globals.css';

// 本番 URL（OGP の絶対 URL 生成に使用）。未設定環境でもビルドが壊れないようフォールバックする。
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://risukeru.gg';

const APP_NAME = 'リスケるGG';
const APP_DESCRIPTION =
  'ゲーム配信者（Twitch・YouTube）とその制作チーム向けの配信者特化型チームスケジュール管理アプリ。配信枠の管理・コラボ日程調整・制作タスク管理を一元化します。';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  keywords: [
    '配信者',
    'スケジュール管理',
    'チーム',
    'コラボ',
    '配信枠',
    'タスク管理',
    'Twitch',
    'YouTube',
    'ゲーム配信',
  ],
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: appUrl,
    siteName: APP_NAME,
    title: `${APP_NAME} — 撮影も、コラボも、編集もGGなスケジュールを`,
    description: APP_DESCRIPTION,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'リスケるGG — 配信者特化のチームスケジュール管理アプリ',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${APP_NAME} — 撮影も、コラボも、編集もGGなスケジュールを`,
    description: APP_DESCRIPTION,
    images: ['/og-image.png'],
  },
};

export const viewport: Viewport = {
  // DESIGN.md の canvas（dark）
  themeColor: '#100c1c',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full">
      <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" precedence="default" />
      <body className="min-h-full flex flex-col antialiased">
        <AnalyticsListener />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
