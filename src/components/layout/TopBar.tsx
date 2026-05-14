'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { useNotificationsStore } from '@/stores/notifications';

/* ページタイトルマッピング（パス → 日本語タイトル） */
const PAGE_TITLES: Record<string, string> = {
  '/dashboard':    'ダッシュボード',
  '/schedule':     'スケジュール',
  '/tasks':        'タスク管理',
  '/collabs':      'コラボ調整',
  '/team':         'チーム管理',
  '/notifications':'通知',
  '/settings':     '設定',
};

/* 今日の日付を日本語表記で返す */
function getTodayLabel() {
  return new Date().toLocaleDateString('ja-JP', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

/* ベルアイコン */
const BellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
  </svg>
);

export function TopBar() {
  const pathname  = usePathname();
  const { currentTeam } = useAuthStore();
  const unreadCount = useNotificationsStore((s) => s.unreadCount);

  /* 最初のパスセグメントでページタイトルを決定 */
  const firstSegment = '/' + (pathname.split('/')[1] ?? '');
  const pageTitle = PAGE_TITLES[firstSegment] ?? 'リスケるGG';

  return (
    <header className="sticky top-0 z-40 h-[56px] bg-surface border-b border-border flex items-center px-4 md:px-6 gap-4">

      {/* ── モバイル: ロゴ ─────────────────────────────────── */}
      <Link href="/dashboard" className="md:hidden flex items-center gap-2 mr-auto">
        <svg viewBox="0 0 32 32" fill="none" className="h-7 w-7 shrink-0">
          <rect width="32" height="32" rx="8" fill="var(--purple-d)" />
          <path d="M8 16c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8-8-3.6-8-8Z" fill="var(--purple)" opacity=".3"/>
          <rect x="13" y="12" width="2" height="6" rx="1" fill="var(--purple-l)"/>
          <rect x="11" y="14" width="6" height="2" rx="1" fill="var(--purple-l)"/>
          <circle cx="22" cy="14" r="1.2" fill="var(--amber)"/>
          <circle cx="19" cy="17" r="1.2" fill="var(--amber)"/>
        </svg>
        <span className="text-sm font-bold text-text">リスケるGG</span>
      </Link>

      {/* ── デスクトップ: ページタイトル + 日付 ─────────── */}
      <div className="hidden md:flex flex-col min-w-0">
        <h1 className="text-base font-semibold text-text leading-tight">{pageTitle}</h1>
        <p className="text-[11px] text-muted">{getTodayLabel()}</p>
      </div>

      {/* ── チーム名（デスクトップ） ───────────────────────── */}
      {currentTeam && (
        <span className="hidden md:block text-xs text-muted truncate max-w-40 ml-2">
          {currentTeam.name}
        </span>
      )}

      {/* スペーサー */}
      <div className="flex-1" />

      {/* ── 通知ベル ────────────────────────────────────────── */}
      <Link
        href="/notifications"
        className="relative p-2 rounded-[8px] text-muted hover:text-text hover:bg-card transition-colors"
        aria-label={`通知${unreadCount > 0 ? `（未読${unreadCount}件）` : ''}`}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-live px-0.5 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Link>
    </header>
  );
}
