'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/components/ui/Icon';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Drawer, DrawerClose, DrawerContent, DrawerTitle } from '@/components/ui/Drawer';

/* ── ツールバーのアイテム定義 ─────────────────────────── */
interface ToolbarItem {
  key: string;
  label: string;
  icon: IconName;
  href: string;
  ai?: boolean; // AIに相談ボタンは強調表示
}

const TOOLBAR_ITEMS: ToolbarItem[] = [
  { key: 'schedule', label: 'スケジュール', icon: 'calendar_month', href: '/schedule' },
  { key: 'tasks',    label: 'タスク',       icon: 'list_bullet',    href: '/tasks' },
  { key: 'ai',       label: 'AIに相談',     icon: 'auto_awesome',   href: '/chat', ai: true },
  { key: 'collabs',  label: 'コラボ',       icon: 'handshake',      href: '/collabs' },
];

/* 「その他」ドロワーに表示する項目 */
interface DrawerItem {
  label: string;
  icon: IconName;
  href: string;
}

const DRAWER_ITEMS: DrawerItem[] = [
  { label: '対応不可時間',   icon: 'person_off',      href: '/unavailability' },
  { label: 'タスク管理 v2（β）', icon: 'event_available', href: '/briefs' },
  { label: 'チーム管理',      icon: 'groups',          href: '/team' },
  { label: 'カテゴリ設定', icon: 'task_alt',        href: '/settings/categories' },
  { label: 'AI設定',       icon: 'auto_awesome',    href: '/settings/ai' },
  { label: '個人設定',        icon: 'manage_accounts', href: '/settings/profile' },
  { label: 'Discord連携',   icon: 'discord',         href: '/integrations/discord' },
  { label: 'Youtube連携',   icon: 'smart_display',   href: '#' },
  { label: 'X（旧Twitter）', icon: 'tag',             href: '#' },
  { label: 'お問い合わせ', icon: 'mail_outline',     href: '/settings/contact' },
];

/**
 * モバイル用下部ツールバー。
 * md ブレークポイント以上では非表示（Sidebar が代替）。
 * 「その他」タップで右から Drawer を開く。
 */
export function MobileToolbar() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      {/* 「その他」メニュー（右から出る Drawer） */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} swipeDirection="right">
        <DrawerContent className="max-w-[300px] bg-surface">
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3.5 py-5">
            <div className="mb-2 flex items-center justify-between border-b border-border px-2 pb-4">
              <DrawerTitle className="text-[0.875rem] font-semibold tracking-normal">その他のメニュー</DrawerTitle>
              <DrawerClose
                aria-label="メニューを閉じる"
                className="flex size-9 cursor-pointer items-center justify-center rounded-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
              >
                <Icon name="close" size={18} />
              </DrawerClose>
            </div>
            {DRAWER_ITEMS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                className="flex min-h-11 items-center gap-3 rounded-sm px-3 py-3 text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
              >
                <Icon name={item.icon} size={18} />
                <span className="text-[14px] font-medium">{item.label}</span>
              </Link>
            ))}
            <div className="mt-2 border-t border-border pt-2">
              <ThemeToggle className="min-h-11 py-3" />
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* ツールバー本体 */}
      <nav
        className="flex md:hidden fixed bottom-0 left-0 right-0 z-40 items-stretch justify-around"
        style={{
          height: '66px',
          /* ホームインジケーター等のセーフエリア分を下に確保 */
          paddingBottom: 'env(safe-area-inset-bottom)',
          boxSizing: 'content-box',
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
        }}
        aria-label="モバイルナビゲーション"
      >
        {/* スケジュール・タスク・AI・コラボ */}
        {TOOLBAR_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');

          if (item.ai) {
            /* AIに相談は強調CTA（ナビバー上に飛び出す丸ボタン） */
            return (
              <Link
                key={item.key}
                href={item.href}
                className="flex-1 flex flex-col items-center justify-end pb-1.5 gap-1"
                aria-label={item.label}
              >
                <span
                  className="flex items-center justify-center w-[50px] h-[50px] rounded-[16px] -mt-5 text-white"
                  style={{
                    background: 'linear-gradient(135deg, var(--primary-hover), var(--primary-active))',
                    border: '3px solid var(--surface)',
                  }}
                >
                  <Icon name={item.icon} size={22} />
                </span>
                <span className="text-[10px] font-semibold" style={{ color: 'var(--brand-2)' }}>
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.key}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center gap-1 relative transition-colors"
              style={{ color: active ? 'var(--brand-2)' : 'var(--text-muted)' }}
              aria-label={item.label}
            >
              {/* アクティブインジケーター */}
              {active && (
                <span
                  className="absolute top-2 w-11 h-7 rounded-[14px] -z-10"
                  style={{ background: 'var(--surface-2)' }}
                />
              )}
              <Icon name={item.icon} size={21} />
              <span className="text-[10px] font-semibold whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}

        {/* その他ボタン */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-1 transition-colors"
          style={{ color: 'var(--text-muted)' }}
          aria-label="その他のメニュー"
        >
          <Icon name="more_horiz" size={21} />
          <span className="text-[10px] font-semibold whitespace-nowrap">その他</span>
        </button>
      </nav>
    </>
  );
}
