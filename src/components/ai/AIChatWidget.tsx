'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';

/**
 * フローティングAIボタン
 * クリックで /chat に遷移する。/chat ページでは非表示。
 */
export function AIChatWidget() {
  const pathname = usePathname();

  // /chat ページではフローティングボタンを表示しない
  if (pathname === '/chat') return null;

  return (
    <Link
      href="/chat"
      aria-label="AIに相談"
      className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-14 h-14 rounded-full bg-purple text-white shadow-lg flex items-center justify-center hover:bg-purple-l transition-colors"
    >
      <Icon name="auto_awesome" size={24} />
    </Link>
  );
}
