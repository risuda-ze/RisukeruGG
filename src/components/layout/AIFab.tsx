'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';

/** 全画面右下に固定表示する AI 相談フローティングボタン。/chat ページでは非表示。 */
export function AIFab() {
  const pathname = usePathname();

  if (pathname === '/chat') return null;

  return (
    // モバイルでは FAB を出さず、AI 導線を MobileToolbar 中央 CTA に一本化
    <Link
      href="/chat"
      aria-label="AIに相談"
      className="group fixed right-5.5 bottom-5.5 z-70 hidden size-12.5 items-center justify-center rounded-full bg-primary text-text-on-primary transition-transform duration-(--duration-fast) ease-spring hover:scale-110 hover:rotate-8 md:flex"
    >
      <Icon name="auto_awesome" size={24} />
      <span className="pointer-events-none absolute top-1/2 right-[calc(100%+10px)] -translate-y-1/2 rounded-sm bg-text px-2.75 py-1.5 text-[0.78rem] font-semibold whitespace-nowrap text-canvas opacity-0 transition-opacity duration-(--duration-fast) ease-out group-hover:opacity-100">
        AIに相談
      </span>
    </Link>
  );
}
