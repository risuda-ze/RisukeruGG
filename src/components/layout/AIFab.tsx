'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';

/** 全画面右下に固定表示する AI 相談フローティングボタン。/chat ページでは非表示。 */
export function AIFab() {
  const pathname = usePathname();

  if (pathname === '/chat') return null;

  return (
    <Link href="/chat" aria-label="AIに相談" className="aifab">
      <Icon name="auto_awesome" size={24} />
      <span className="aifab__tip">AIに相談</span>
    </Link>
  );
}
