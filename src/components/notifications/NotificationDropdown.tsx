'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useNotificationsStore } from '@/stores/notifications';

interface NotificationDropdownProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationDropdown({ open, onClose }: NotificationDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);
  const notifications = useNotificationsStore((s) => s.notifications);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);

  /* ドロップダウン外クリックで閉じる */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const preview = notifications.slice(0, 4);

  return (
    <div
      ref={ref}
      className="absolute top-full right-0 mt-1 bg-card border border-border rounded-[12px] shadow-lg w-[340px] z-50"
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-semibold text-text">通知</span>
        <button
          onClick={() => markAllRead()}
          className="text-[11px] text-purple-l hover:text-purple transition-colors"
        >
          既読にする
        </button>
      </div>

      {/* 通知リスト */}
      <ul className="py-2">
        {preview.length === 0 ? (
          <li className="px-4 py-4 text-[12px] text-muted text-center">通知はありません</li>
        ) : (
          preview.map((n) => (
            <li
              key={n.id}
              className={`flex items-start gap-2.5 px-4 py-2.5 ${!n.isRead ? 'bg-purple/5' : ''}`}
            >
              {/* 未読ドット */}
              <span
                className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                  n.isRead ? 'bg-transparent' : 'bg-purple'
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-text leading-snug">{n.body}</p>
                <p className="text-[10px] text-muted font-num mt-0.5">
                  {format(n.createdAt, 'M/d HH:mm', { locale: ja })}
                </p>
              </div>
            </li>
          ))
        )}
      </ul>

      {/* フッター */}
      <div className="border-t border-border px-4 py-2.5">
        <Link
          href="/notifications"
          onClick={onClose}
          className="text-[12px] text-purple-l hover:text-purple transition-colors"
        >
          すべて見る →
        </Link>
      </div>
    </div>
  );
}
