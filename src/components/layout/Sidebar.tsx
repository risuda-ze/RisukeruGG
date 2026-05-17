'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { useSidebarStore } from '@/stores/sidebar';
import { useNotificationsStore } from '@/stores/notifications';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';

/* ── ナビゲーション定義 ─────────────────────────────────────── */
interface NavItem {
  href: string;
  label: string;
  icon: string;
  disabled?: boolean;
}

interface NavSection {
  label: string;
  icon: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'メイン',
    icon: 'dashboard',
    items: [
      { href: '/schedule', label: 'スケジュール', icon: 'calendar_month' },
      { href: '/tasks', label: 'タスク管理', icon: 'task_alt' },
      { href: '/collabs', label: 'コラボ調整', icon: 'handshake' },
    ],
  },
  {
    label: 'チーム管理',
    icon: 'groups',
    items: [
      { href: '/team', label: 'メンバー', icon: 'person' },
      { href: '/notifications', label: '通知設定', icon: 'notifications' },
      { href: '/settings', label: 'チャンネル設定', icon: 'settings' },
    ],
  },
  {
    label: '各種連携',
    icon: 'integration_instructions',
    items: [
      { href: '#', label: 'Googleカレンダー', icon: 'event', disabled: true },
      { href: '#', label: 'Discord', icon: 'forum', disabled: true },
      { href: '#', label: 'YouTube', icon: 'smart_display', disabled: true },
      { href: '#', label: 'X (Twitter)', icon: 'tag', disabled: true },
    ],
  },
];

/* ── Sidebarコンポーネント ──────────────────────────────────── */
export function Sidebar() {
  const pathname = usePathname();
  const { currentUser, signOut } = useAuthStore();
  const { collapsed, openSections, toggleCollapsed, toggleSection } = useSidebarStore();
  const unreadCount = useNotificationsStore((s) => s.unreadCount);

  /* ユーザーのイニシャルを生成 */
  const initials = currentUser?.displayName
    ? currentUser.displayName.slice(0, 2).toUpperCase()
    : '?';

  return (
    <aside
      className={`shrink-0 bg-surface border-r border-border hidden md:flex flex-col h-screen sticky top-0 transition-[width] duration-300 overflow-hidden ${
        collapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
    >
      {/* ── ヘッダー ────────────────────────────────────────── */}
      <div className={`py-4 border-b border-border flex items-center min-w-0 ${collapsed ? 'px-2 justify-between' : 'px-4 gap-3'}`}>
        {/* ロゴアイコン（クリックでダッシュボードへ） */}
        <Link href="/dashboard" className="shrink-0" aria-label="ダッシュボードへ">
          <svg viewBox="0 0 32 32" fill="none" className="h-7 w-7">
            <rect width="32" height="32" rx="8" fill="var(--purple-d)" />
            <path
              d="M8 16c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8-8-3.6-8-8Z"
              fill="var(--purple)"
              opacity=".3"
            />
            <rect x="13" y="12" width="2" height="6" rx="1" fill="var(--purple-l)" />
            <rect x="11" y="14" width="6" height="2" rx="1" fill="var(--purple-l)" />
            <circle cx="22" cy="14" r="1.2" fill="var(--amber)" />
            <circle cx="19" cy="17" r="1.2" fill="var(--amber)" />
          </svg>
        </Link>

        {/* アプリ名（折りたたみ時は非表示） */}
        <span
          className={`text-sm font-bold text-text tracking-tight whitespace-nowrap transition-[opacity,width] duration-300 ${
            collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 flex-1'
          }`}
        >
          リスケるGG
        </span>

        {/* トグルボタン */}
        <button
          onClick={toggleCollapsed}
          className="shrink-0 p-1 rounded-[6px] text-muted hover:text-text hover:bg-purple/8 transition-colors"
          aria-label={collapsed ? 'サイドバーを展開' : 'サイドバーを折りたたむ'}
        >
          <span className="material-icons text-[20px]">{collapsed ? 'menu' : 'menu_open'}</span>
        </button>
      </div>

      {/* ── ナビゲーション ───────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {NAV_SECTIONS.map((section) => {
          const isOpen = openSections.includes(section.label);
          return (
            <div key={section.label}>
              {/* セクションヘッダー（クリックでアコーディオン開閉） */}
              <button
                onClick={() => toggleSection(section.label)}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-[8px] text-muted hover:text-text hover:bg-purple/8 transition-colors"
              >
                <span className="material-icons text-[20px] shrink-0">{section.icon}</span>
                <span
                  className={`flex-1 text-left text-[11px] font-bold tracking-widest uppercase whitespace-nowrap transition-[opacity,width] duration-300 ${
                    collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
                  }`}
                >
                  {section.label}
                </span>
                {/* 展開矢印（折りたたみ時は非表示） */}
                <span
                  className={`material-icons text-[16px] shrink-0 transition-all duration-200 ${
                    collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
                  } ${isOpen ? 'rotate-90' : ''}`}
                >
                  chevron_right
                </span>
              </button>

              {/* セクション子アイテム（アコーディオン） */}
              {isOpen && !collapsed && (
                <ul className="mt-0.5 space-y-0.5">
                  {section.items.map((item) => {
                    const active = !item.disabled && pathname.startsWith(item.href);
                    const showBadge = item.href === '/collabs' && unreadCount > 0;
                    return (
                      <li key={item.label}>
                        {item.disabled ? (
                          <span className="flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-sm text-muted/50 pointer-events-none select-none">
                            <span className="material-icons text-[20px] shrink-0">{item.icon}</span>
                            <span className="whitespace-nowrap">{item.label}</span>
                          </span>
                        ) : (
                          <Link
                            href={item.href}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-sm transition-colors ${
                              active
                                ? 'bg-purple/12 text-purple-l border-l-2 border-purple -ml-[2px] pl-[22px]'
                                : 'text-muted hover:text-text hover:bg-purple/8'
                            }`}
                          >
                            <span className="material-icons text-[20px] shrink-0">{item.icon}</span>
                            <span className="flex-1 whitespace-nowrap">{item.label}</span>
                            {showBadge && (
                              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-live px-0.5 text-[10px] font-bold text-white">
                                {unreadCount > 9 ? '9+' : unreadCount}
                              </span>
                            )}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* 折りたたみ時: アイコンのみ表示（アコーディオン状態に関わらず） */}
              {collapsed && (
                <ul className="mt-0.5 space-y-0.5">
                  {section.items.map((item) => {
                    const active = !item.disabled && pathname.startsWith(item.href);
                    return (
                      <li key={item.label}>
                        {item.disabled ? (
                          <span className="flex justify-center py-2 rounded-[8px] text-muted/50 pointer-events-none select-none">
                            <span className="material-icons text-[20px]">{item.icon}</span>
                          </span>
                        ) : (
                          <Link
                            href={item.href}
                            className={`flex justify-center py-2 rounded-[8px] transition-colors ${
                              active
                                ? 'bg-purple/12 text-purple-l'
                                : 'text-muted hover:text-text hover:bg-purple/8'
                            }`}
                            aria-label={item.label}
                          >
                            <span className="material-icons text-[20px]">{item.icon}</span>
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      {/* ── フッター（ユーザー情報） ─────────────────────── */}
      <div className="border-t border-border px-3 py-3 flex items-center gap-2 min-w-0">
        <Avatar initials={initials} bgClass="bg-purple-d/30" textClass="text-purple-l" size="sm" />
        {/* 名前・プランバッジ（折りたたみ時は非表示） */}
        <div
          className={`flex-1 min-w-0 transition-[opacity,width] duration-300 ${
            collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
          }`}
        >
          <p className="text-[11px] text-text truncate leading-tight">
            {currentUser?.displayName ?? 'ユーザー'}
          </p>
          <Badge variant="purple" className="mt-0.5">
            PARTY
          </Badge>
        </div>
        {/* サインアウトボタン（折りたたみ時は非表示） */}
        {!collapsed && (
          <button
            onClick={() => signOut()}
            className="shrink-0 p-1.5 rounded-[6px] text-muted hover:text-text hover:bg-surface transition-colors"
            aria-label="サインアウト"
          >
            <span className="material-icons text-[20px]">logout</span>
          </button>
        )}
      </div>
    </aside>
  );
}
