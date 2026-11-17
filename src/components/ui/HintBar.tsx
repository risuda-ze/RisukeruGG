'use client';

import { Icon } from '@/components/ui/Icon';

interface HintBarProps {
  children: React.ReactNode;
  /** 閉じるボタン押下時のコールバック */
  onDismiss: () => void;
}

/**
 * 操作説明バー（info variant）。表示/非表示は親が useHintDismiss で管理し、onDismiss を渡す。
 * 文字色は --text に固定する（ライトの --text-2 は info-tint 上でコントラスト不足）。
 */
export function HintBar({ children, onDismiss }: HintBarProps) {
  return (
    <div
      data-slot="hint-bar"
      className="relative mx-4 mt-3 flex shrink-0 items-start gap-2.5 rounded-md border border-blue-border bg-info-tint py-2.5 pr-10 pl-3.5 text-[0.8125rem] leading-normal text-text md:mx-7 [&_b]:font-semibold"
    >
      <Icon name="info" size={16} className="mt-px shrink-0 text-blue-text" />
      <span className="flex-1">{children}</span>
      <button
        onClick={onDismiss}
        aria-label="ヒントを閉じる"
        className="absolute top-1.5 right-1.5 flex size-7 cursor-pointer items-center justify-center rounded-sm text-text transition-colors duration-(--duration-fast) hover:bg-surface-2"
      >
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}
