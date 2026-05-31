'use client';

import { Icon } from '@/components/ui/Icon';
import { useHintDismiss } from '@/hooks/useHintDismiss';

interface HintBarProps {
  /** localStorage のキー（画面ごとに一意） */
  storageKey: string;
  children: React.ReactNode;
}

/** 一度閉じると localStorage で非表示状態を永続化できる操作説明バー */
export function HintBar({ storageKey, children }: HintBarProps) {
  const { visible, dismiss } = useHintDismiss(storageKey);

  if (!visible) return null;

  return (
    <div
      className="flex items-start gap-2.5 px-4 py-2.5 text-[12px] leading-relaxed shrink-0"
      style={{
        background: 'var(--primary-950)',
        borderBottom: '1px solid var(--primary-800)',
        color: 'var(--text-secondary)',
      }}
    >
      <Icon name="info" size={15} className="shrink-0 mt-[1px]" style={{ color: 'var(--text-accent)' } as React.CSSProperties} />
      <span className="flex-1">{children}</span>
      <button
        onClick={dismiss}
        aria-label="ヒントを閉じる"
        className="shrink-0 flex items-center justify-center w-5 h-5 rounded transition-colors"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
      >
        <Icon name="close" size={13} />
      </button>
    </div>
  );
}
