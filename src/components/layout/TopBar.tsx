'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useNotificationsStore } from '@/stores/notifications';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { AccountMenu } from '@/components/layout/AccountMenu';
import { Icon } from '@/components/ui/Icon';

interface TopBarProps {
  title: string;
  /** 画面の簡潔な説明文 */
  subtitle?: string;
  children?: React.ReactNode;
}

export function TopBar({ title, subtitle, children }: TopBarProps) {
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header
      className="shrink-0 flex items-center px-6 gap-4 relative z-10"
      style={{
        height: subtitle ? '60px' : '54px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--card-border)',
      }}
    >
      {/* 左: タイトル + 画面説明 */}
      <div className="flex-1 min-w-0">
        <span
          className="text-[15px] font-semibold truncate block"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-head)' }}
        >
          {title}
        </span>
        {subtitle && (
          <span
            className="text-[11px] font-normal block leading-tight"
            style={{ color: 'var(--text-muted)' }}
          >
            {subtitle}
          </span>
        )}
      </div>

      {/* 右: 画面固有アクション + 共通アクション */}
      <div className="flex items-center gap-2">
        {children}
        {children && <div className="w-px h-5" style={{ background: 'var(--border)' }} />}

        {/* お問い合わせボタン */}
        <Link
          href="/settings/contact"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-[12px] font-semibold transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
            (e.currentTarget as HTMLElement).style.background = 'var(--card-raised)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
            (e.currentTarget as HTMLElement).style.background = '';
          }}
          aria-label="お問い合わせ"
        >
          <Icon name="mail_outline" size={16} />
          <span className="hidden lg:inline">お問い合わせ</span>
        </Link>

        {/* 通知ベル */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="relative w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
              (e.currentTarget as HTMLElement).style.background = 'var(--card-raised)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
              (e.currentTarget as HTMLElement).style.background = '';
            }}
            aria-label={`通知${unreadCount > 0 ? `（未読${unreadCount}件）` : ''}`}
          >
            <Icon name="notifications" size={20} />
            {unreadCount > 0 && (
              <span
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2"
                style={{
                  background: 'var(--danger)',
                  borderColor: 'var(--surface)',
                  boxShadow: 'var(--glow-danger)',
                }}
              />
            )}
          </button>
          <NotificationDropdown open={dropdownOpen} onClose={() => setDropdownOpen(false)} />
        </div>

        {/* アカウントメニュー */}
        <AccountMenu />
      </div>
    </header>
  );
}
