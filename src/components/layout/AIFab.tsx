'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';

/** 全画面右下に固定表示する AI 相談フローティングボタン。/chat ページでは非表示。 */
export function AIFab() {
  const pathname = usePathname();

  if (pathname === '/chat') return null;

  return (
    <Link
      href="/chat"
      aria-label="AIに相談"
      className="fixed z-[70] flex items-center justify-center w-[50px] h-[50px] rounded-full text-white"
      style={{
        bottom: '22px',
        right: '22px',
        background: 'linear-gradient(135deg, var(--primary-400), var(--primary-700))',
        boxShadow: 'var(--glow-primary), var(--shadow-lg)',
        animation: 'glow-pulse 2.6s linear infinite',
        transition: 'transform 150ms var(--ease-spring)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'scale(1.1) rotate(8deg)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = '';
      }}
    >
      <Icon name="auto_awesome" size={24} />
      {/* ホバー時 tooltip */}
      <span
        className="absolute right-[calc(100%+10px)] top-1/2 -translate-y-1/2 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100"
        style={{
          background: 'var(--card-raised)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-sm)',
          padding: '6px 11px',
          fontFamily: 'var(--font-head)',
          fontWeight: 600,
          fontSize: '0.78rem',
          color: 'var(--text-primary)',
          boxShadow: 'var(--shadow-lg)',
          transition: 'opacity 150ms var(--ease-out)',
        }}
      >
        AIに相談
      </span>
    </Link>
  );
}
