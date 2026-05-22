'use client';

import { useState } from 'react';
import { useNotificationsStore } from '@/stores/notifications';
import { useAIStore } from '@/stores/ai';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';

interface TopBarProps {
  title: string;
  subtitle?: string;
  /** トップバー右側のアクションボタン（通知ベルの前に表示） */
  children?: React.ReactNode;
}

export function TopBar({ title, subtitle, children }: TopBarProps) {
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const { openExtract } = useAIStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="h-[54px] shrink-0 bg-surface border-b border-border flex items-center px-6 gap-4 relative z-10">
      {/* タイトル + サブタイトル */}
      <div className="flex-1 text-[16px] font-bold text-text">
        {title}
        {subtitle && (
          <small className="text-muted text-[12px] font-normal ml-2">{subtitle}</small>
        )}
      </div>

      {/* アクションボタン + 区切り + 通知ベル */}
      <div className="flex items-center gap-3">
        {children}
        {children && (
          <div className="w-px h-6 bg-border" />
        )}

        {/* AIで登録ボタン */}
        <button
          onClick={openExtract}
          aria-label="AIでテキストから登録"
          className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-purple/10 text-purple-l hover:bg-purple/20 transition-colors text-[12px] font-semibold"
        >
          <span className="material-icons text-[15px]">auto_awesome</span>
          <span className="hidden sm:inline">AIで登録</span>
        </button>

        {/* 通知ベル */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="relative w-10 h-10 rounded-full flex items-center justify-center text-muted hover:text-text hover:bg-[var(--purple-xs)] transition-colors"
            aria-label={`通知${unreadCount > 0 ? `（未読${unreadCount}件）` : ''}`}
          >
            <span className="material-icons text-[22px]">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-live rounded-full border-2 border-surface" />
            )}
          </button>
          <NotificationDropdown open={dropdownOpen} onClose={() => setDropdownOpen(false)} />
        </div>
      </div>
    </header>
  );
}
