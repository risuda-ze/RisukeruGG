'use client';

import { useState } from 'react';
import { useNotificationsStore } from '@/stores/notifications';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';

interface TopBarProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function TopBar({ title, subtitle, children }: TopBarProps) {
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header
      className="h-[54px] shrink-0 flex items-center px-6 gap-4 relative z-10"
      style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--card-border)',
      }}
    >
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

      <div className="flex items-center gap-3">
        {children}
        {children && <div className="w-px h-5" style={{ background: 'var(--border)' }} />}

        <div className="relative">
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="relative w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
              (e.currentTarget as HTMLElement).style.background = 'var(--card-raised)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
              (e.currentTarget as HTMLElement).style.background = '';
            }}
            aria-label={`通知${unreadCount > 0 ? `（未読${unreadCount}件）` : ''}`}
          >
            <span className="material-icons text-[20px]">notifications</span>
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
      </div>
    </header>
  );
}
