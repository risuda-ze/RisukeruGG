import type { Metadata, Viewport } from 'next';
import { Zen_Kaku_Gothic_New, Space_Grotesk } from 'next/font/google';
import { AuthProvider } from '@/components/AuthProvider';
import './globals.css';

/* 日本語本文・見出しフォント */
const zenKaku = Zen_Kaku_Gothic_New({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-ja',
  display: 'swap',
});

/* 数値・英字ラベルフォント */
const spaceGrotesk = Space_Grotesk({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-num',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'リスケるGG',
  description: '配信者向けチームスケジュール管理アプリ',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#534AB7',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`h-full ${zenKaku.variable} ${spaceGrotesk.variable}`}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" precedence="default" />
      <body className="min-h-full flex flex-col antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
