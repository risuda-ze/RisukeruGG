'use client';

import { ReactNode, useEffect } from 'react';

export interface ModalProps {
  /** モーダル表示フラグ */
  open: boolean;
  /** 閉じるコールバック（Escキー・オーバーレイクリック） */
  onClose: () => void;
  /** モーダルタイトル */
  title?: string;
  children: ReactNode;
  /** フッターエリア（OK/キャンセルボタン等） */
  footer?: ReactNode;
  /** モーダルサイズ */
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'max-w-[360px]',
  md: 'max-w-[480px]',
  lg: 'max-w-[640px]',
};

export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  /* ESCキーで閉じる */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`w-full ${sizeClasses[size]} rounded-lg bg-card border border-border shadow-lg`}>
        {title && (
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-base font-semibold text-text">{title}</h2>
          </div>
        )}
        <div className="px-6 py-4 text-sm text-text">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-border flex justify-end gap-3">{footer}</div>
        )}
      </div>
    </div>
  );
}
