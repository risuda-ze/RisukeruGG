'use client';

import { Icon } from '@/components/ui/Icon';

interface HintBarProps {
  children: React.ReactNode;
  /** 閉じるボタン押下時のコールバック */
  onDismiss: () => void;
}

/** 操作説明バー。表示/非表示は親が useHintDismiss で管理し、onDismiss を渡す */
export function HintBar({ children, onDismiss }: HintBarProps) {
  return (
    <div className="hint hint--closable shrink-0 mx-4 md:mx-7 mt-3">
      <Icon name="info" size={16} className="shrink-0" style={{ color: 'var(--text-accent)', marginTop: 1 } as React.CSSProperties} />
      <span className="flex-1">{children}</span>
      <button onClick={onDismiss} aria-label="ヒントを閉じる" className="hint__x">
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}
