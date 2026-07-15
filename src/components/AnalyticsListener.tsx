'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView } from '@/lib/analytics';

/**
 * App Router のルート変更を検知してページビューを計測するクライアントコンポーネント。
 * Analytics が無効な環境では trackPageView が no-op になるため、何も送信しない。
 */
export function AnalyticsListener() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    trackPageView(pathname);
  }, [pathname]);

  return null;
}
