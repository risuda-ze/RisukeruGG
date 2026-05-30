'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { useSidebarStore } from '@/stores/sidebar';
import { useNotificationsStore } from '@/stores/notifications';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { TeamSwitcher } from '@/components/layout/TeamSwitcher';

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
      { href: '/chat', label: 'AIに相談', icon: 'auto_awesome' },
      { href: '/schedule', label: 'スケジュール', icon: 'calendar_month' },
      { href: '/tasks', label: 'タスク管理', icon: 'task_alt' },
      { href: '/collabs', label: 'コラボ調整', icon: 'handshake' },
    ],
  },
  {
    label: '設定',
    icon: 'settings',
    items: [
      { href: '/team', label: 'チーム管理', icon: 'groups' },
      { href: '/notifications', label: '通知', icon: 'notifications' },
      { href: '/settings', label: 'チャンネル設定', icon: 'settings' },
      { href: '/settings/profile', label: '個人設定', icon: 'manage_accounts' },
      { href: '/settings/contact', label: 'お問い合わせ', icon: 'mail_outline' },
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
  /* 最長一致アルゴリズム: 現在パスに最も長くマッチするナビアイテムのみをアクティブにする */
  const activeHref = NAV_SECTIONS.flatMap((s) => s.items)
    .filter((i) => !i.disabled && (pathname === i.href || pathname.startsWith(i.href + '/')))
    .reduce((longest, i) => (i.href.length > longest.length ? i.href : longest), '');
  const { currentUser, signOut } = useAuthStore();
  const { collapsed, openSections, toggleCollapsed, toggleSection } = useSidebarStore();
  const unreadCount = useNotificationsStore((s) => s.unreadCount);

  /* ユーザーのイニシャルを生成 */
  const initials = currentUser?.displayName
    ? currentUser.displayName.slice(0, 2).toUpperCase()
    : '?';

  return (
    <aside
      className={`shrink-0 hidden md:flex flex-col h-screen sticky top-0 transition-[width] duration-300 overflow-hidden ${
        collapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
      style={{ background: 'var(--surface)', borderRight: '1px solid var(--card-border)' }}
    >
      {/* ── ヘッダー ────────────────────────────────────────── */}
      <div className={`py-4 flex items-center min-w-0 ${collapsed ? 'px-2 justify-between' : 'px-4 gap-3'}`} style={{ borderBottom: '1px solid var(--card-border)' }}>
        {/* ロゴアイコン（クリックでダッシュボードへ） */}
        <Link href="/dashboard" className="shrink-0" aria-label="ダッシュボードへ">
          <Image
            src="/icon-192x192.png"
            alt="リスケるGG"
            width={32}
            height={26}
            className="h-7 w-auto rounded-[6px]"
            priority
          />
        </Link>

        {/* アプリ名（折りたたみ時は非表示） */}
        <span
          className={`text-sm font-bold tracking-tight whitespace-nowrap transition-[opacity,width] duration-300 ${
            collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 flex-1'
          }`}
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-head)' }}
        >
          リスケるGG
        </span>

        {/* トグルボタン */}
        <button
          onClick={toggleCollapsed}
          className="shrink-0 p-1 rounded-[6px] transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLElement).style.background = 'var(--card-raised)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.background = ''; }}
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
              <button
                onClick={() => toggleSection(section.label)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[6px] transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
              >
                <span className="material-icons text-[18px] shrink-0">{section.icon}</span>
                <span
                  className={`flex-1 text-left text-[10px] font-bold tracking-widest uppercase whitespace-nowrap transition-[opacity,width] duration-300 ${
                    collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
                  }`}
                >
                  {section.label}
                </span>
                <span
                  className={`material-icons text-[15px] shrink-0 transition-all duration-200 ${
                    collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
                  } ${isOpen ? 'rotate-90' : ''}`}
                >
                  chevron_right
                </span>
              </button>

              {isOpen && !collapsed && (
                <ul className="mt-0.5 space-y-0.5">
                  {section.items.map((item) => {
                    const active = item.href === activeHref;
                    const showBadge = item.href === '/collabs' && unreadCount > 0;
                    return (
                      <li key={item.label}>
                        {item.disabled ? (
                          <span
                            className="flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-sm pointer-events-none select-none"
                            style={{ color: 'var(--text-disabled)' }}
                          >
                            <span className="material-icons text-[18px] shrink-0">{item.icon}</span>
                            <span className="whitespace-nowrap">{item.label}</span>
                          </span>
                        ) : (
                          <Link
                            href={item.href}
                            className={`navlink${active ? ' navlink--active' : ''}`}
                          >
                            <span className="material-icons text-[18px] shrink-0">{item.icon}</span>
                            <span className="flex-1 whitespace-nowrap">{item.label}</span>
                            {showBadge && (
                              <span
                                className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                                style={{ background: active ? 'rgba(255,255,255,0.22)' : 'var(--danger)' }}
                              >
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

              {collapsed && (
                <ul className="mt-0.5 space-y-0.5">
                  {section.items.map((item) => {
                    const active = item.href === activeHref;
                    return (
                      <li key={item.label}>
                        {item.disabled ? (
                          <span
                            className="flex justify-center py-2 rounded-[6px] pointer-events-none select-none"
                            style={{ color: 'var(--text-disabled)' }}
                          >
                            <span className="material-icons text-[18px]">{item.icon}</span>
                          </span>
                        ) : (
                          <Link
                            href={item.href}
                            className="flex justify-center py-2 rounded-[6px] transition-colors"
                            style={{
                              background: active ? 'var(--primary)' : undefined,
                              color: active ? '#fff' : 'var(--text-muted)',
                              boxShadow: active ? 'var(--glow-primary)' : undefined,
                            }}
                            aria-label={item.label}
                          >
                            <span className="material-icons text-[18px]">{item.icon}</span>
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

      {/* ── チームスイッチャー ──────────────────────────── */}
      <div className="px-2 pt-2" style={{ borderTop: '1px solid var(--card-border)' }}>
        <TeamSwitcher collapsed={collapsed} />
      </div>

      {/* ── フッター（ユーザー情報） ─────────────────────── */}
      <div className="px-3 py-3 flex items-center gap-2 min-w-0" style={{ borderTop: '1px solid var(--card-border)' }}>
        <Avatar initials={initials} src={currentUser?.photoURL} bgClass="bg-purple-d/30" textClass="text-purple-l" size="sm" />
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
