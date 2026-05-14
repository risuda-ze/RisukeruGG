import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'リスケるGG',
  description: '配信者向けチームスケジュール管理アプリ',
  manifest: '/manifest.json',
  themeColor: '#6366f1',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
