'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSidebarStore } from '@/stores/sidebar';
import { Icon, type IconName } from '@/components/ui/Icon';
import { TeamSwitcher } from '@/components/layout/TeamSwitcher';
import { badgeVariants } from '@/components/ui/Badge';
import { cn } from '@/lib/utils/cn';

/* ── ナビゲーション定義 ─────────────────────────────────────── */
interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  disabled?: boolean;
  /** ラベル横の小バッジ（β など） */
  badge?: string;
}

interface NavSection {
  label: string;
  icon: IconName;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'メイン',
    icon: 'dashboard',
    items: [
      { href: '/chat',         label: 'AIに相談',  icon: 'auto_awesome' },
      { href: '/schedule',     label: 'スケジュール', icon: 'calendar_month' },
      { href: '/tasks',        label: 'タスク管理', icon: 'list_bullet' },
      { href: '/briefs',       label: 'タスク管理 v2', icon: 'event_available', badge: 'β' },
      { href: '/collabs',      label: 'コラボ調整', icon: 'handshake' },
    ],
  },
  {
    label: '設定',
    icon: 'settings',
    items: [
      { href: '/team',              label: 'チーム管理',   icon: 'groups' },
      { href: '/settings/categories', label: 'カテゴリ設定', icon: 'task_alt' },
      { href: '/settings/ai',       label: 'AI設定',       icon: 'auto_awesome' },
      { href: '/settings/profile',  label: '個人設定',     icon: 'manage_accounts' },
    ],
  },
  {
    label: '各種連携',
    icon: 'integration_instructions',
    items: [
      { href: '/integrations/discord', label: 'Discord連携',  icon: 'discord' },
      { href: '#', label: 'Youtube連携',  icon: 'smart_display', disabled: true },
      { href: '#', label: 'X（旧Twitter）', icon: 'tag',          disabled: true },
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
  const collapsed = useSidebarStore((s) => s.collapsed);
  const openSections = useSidebarStore((s) => s.openSections);
  const toggleCollapsed = useSidebarStore((s) => s.toggleCollapsed);
  const toggleSection = useSidebarStore((s) => s.toggleSection);

  return (
    <aside
      className={`shrink-0 hidden md:flex flex-col h-screen sticky top-0 transition-[width] duration-300 overflow-hidden ${
        collapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
      style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
    >
      {/* ── ヘッダー ────────────────────────────────────────── */}
      <div
        className={`py-4 flex items-center min-w-0 ${collapsed ? 'px-2 justify-between' : 'px-4 gap-3'}`}
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <Link href="/schedule" className="shrink-0" aria-label="スケジュールへ">
          <Image
            src="/icon-192x192.png"
            alt="リスケるGG"
            width={32}
            height={26}
            className="h-7 w-auto rounded-[6px]"
            priority
          />
        </Link>

        <span
          className={`text-sm font-bold tracking-tight whitespace-nowrap transition-[opacity,width] duration-300 ${
            collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 flex-1'
          }`}
          style={{ color: 'var(--text)' }}
        >
          リスケるGG
        </span>

        <button
          onClick={toggleCollapsed}
          className="shrink-0 p-1 rounded-[6px] transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'var(--text)';
            (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
            (e.currentTarget as HTMLElement).style.background = '';
          }}
          aria-label={collapsed ? 'サイドバーを展開' : 'サイドバーを折りたたむ'}
        >
          <Icon name={collapsed ? 'menu' : 'menu_open'} size={20} />
        </button>
      </div>

      {/* ── ナビゲーション ───────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {NAV_SECTIONS.map((section, idx) => {
          const isOpen = openSections.includes(section.label);
          return (
            /* 最初のセクション以外の上端に区切りボーダーを表示 */
            <div
              key={section.label}
              style={idx > 0 ? { borderTop: '1px solid var(--border)', paddingTop: '4px', marginTop: '4px' } : undefined}
            >
              <button
                onClick={() => toggleSection(section.label)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[6px] transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
              >
                <Icon name={section.icon} size={18} />
                <span
                  className={`flex-1 text-left text-[10px] font-bold tracking-widest uppercase whitespace-nowrap transition-[opacity,width] duration-300 ${
                    collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
                  }`}
                >
                  {section.label}
                </span>
                <span
                  className={`shrink-0 transition-all duration-200 ${
                    collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
                  } ${isOpen ? 'rotate-90' : ''}`}
                >
                  <Icon name="chevron_right" size={15} />
                </span>
              </button>

              {isOpen && !collapsed && (
                <ul className="mt-0.5 space-y-0.5">
                  {section.items.map((item) => {
                    const active = item.href === activeHref;
                    return (
                      <li key={item.label}>
                        {item.disabled ? (
                          <span
                            className="flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-sm pointer-events-none select-none"
                            style={{ color: 'var(--text-disabled)' }}
                          >
                            <Icon name={item.icon} size={18} />
                            <span className="whitespace-nowrap">{item.label}</span>
                          </span>
                        ) : (
                          <Link
                            href={item.href}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                              'flex items-center gap-3 rounded-sm px-3.5 py-2.5 text-[0.9375rem] no-underline transition-colors duration-(--duration-fast) ease-out',
                              active ? 'bg-card font-semibold text-text' : 'font-medium text-text-2 hover:bg-surface-2 hover:text-text'
                            )}
                          >
                            <Icon name={item.icon} size={18} />
                            <span className="flex-1 whitespace-nowrap">{item.label}</span>
                            {item.badge && (
                              <span className={cn(badgeVariants({ variant: 'info' }), 'text-[10px] px-1.5 py-0')} aria-label={item.badge}>
                                {item.badge}
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
                            <Icon name={item.icon} size={18} />
                          </span>
                        ) : (
                          <Link
                            href={item.href}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                              'flex justify-center rounded-sm py-2 transition-colors duration-(--duration-fast) ease-out',
                              active ? 'bg-card text-text' : 'text-text-muted hover:bg-surface-2 hover:text-text'
                            )}
                            aria-label={item.label}
                          >
                            <Icon name={item.icon} size={18} />
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* 設定グループの直後にお問い合わせを大項目として配置 */}
              {section.label === '設定' && !collapsed && (
                <Link
                  href="/settings/contact"
                  className="flex items-center gap-2 w-full px-2 py-[13px] mt-2 text-[10px] font-bold tracking-widest uppercase transition-colors"
                  style={{
                    borderTop: '1px solid var(--border)',
                    color: pathname === '/settings/contact' ? 'var(--brand-2)' : 'var(--text-muted)',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-2)'; }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color =
                      pathname === '/settings/contact' ? 'var(--brand-2)' : 'var(--text-muted)';
                  }}
                >
                  <Icon name="mail_outline" size={14} style={{ opacity: 0.7, flexShrink: 0 } as React.CSSProperties} />
                  <span className="flex-1">お問い合わせ</span>
                  <Icon name="chevron_right" size={14} style={{ color: 'var(--text-disabled)' } as React.CSSProperties} />
                </Link>
              )}
              {/* 折りたたみ時のお問い合わせアイコン */}
              {section.label === '設定' && collapsed && (
                <Link
                  href="/settings/contact"
                  className="flex justify-center py-2 rounded-[6px] transition-colors"
                  style={{ color: pathname === '/settings/contact' ? 'var(--brand-2)' : 'var(--text-muted)' }}
                  aria-label="お問い合わせ"
                >
                  <Icon name="mail_outline" size={18} />
                </Link>
              )}
            </div>
          );
        })}
      </nav>

      {/* ── チームスイッチャー ──────────────────────────── */}
      <div className="px-2 py-2" style={{ borderTop: '1px solid var(--border)' }}>
        <TeamSwitcher collapsed={collapsed} />
      </div>
    </aside>
  );
}
