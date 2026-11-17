import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DesignGallery } from './DesignGallery';

export const metadata: Metadata = {
  title: 'デザインシステム確認',
  robots: { index: false, follow: false },
};

/** デザインシステム v3 の部品を一覧する確認用ページ。開発時（pnpm dev）のみ表示する */
export default function DesignPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <DesignGallery />;
}
