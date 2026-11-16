import { HTMLAttributes, ReactNode } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

/** アクセントレール（左3px）の色バリアント */
export type CardAccent = 'primary' | 'success' | 'warning' | 'danger';

/** カラーファミリー（docs/DESIGN.md 1.1）。specimen カードの面と枡線を決める */
export type ColorFamily = 'pink' | 'orange' | 'green' | 'blue' | 'teal';

const ACCENT_CLASS: Record<CardAccent, string> = {
  primary: 'border-l-primary',
  success: 'border-l-success',
  warning: 'border-l-warning',
  danger: 'border-l-danger',
};

/** specimen: ファミリーの tint 面 + 2px 同ファミリー枡線 */
export const FAMILY_CLASS: Record<ColorFamily, string> = {
  pink: 'bg-pink-tint border-pink-border',
  orange: 'bg-orange-tint border-orange-border',
  green: 'bg-green-tint border-green-border',
  blue: 'bg-blue-tint border-blue-border',
  teal: 'bg-teal-tint border-teal-border',
};

// 影は使わない。hover は枡線の色だけ変える（浮かせない）
const cardVariants = cva('overflow-hidden rounded-lg transition-colors duration-(--duration-fast) ease-out', {
  variants: {
    variant: {
      default: 'border border-border bg-card',
      specimen: 'border-2',
      flat: 'bg-surface',
    },
    interactive: { true: 'cursor-pointer hover:border-border-strong' },
    padded: { true: 'p-4 md:p-6' },
  },
  defaultVariants: { variant: 'default' },
});

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** default: 一般カード / specimen: カテゴリ付き・統計・強調 / flat: セクション背景 */
  variant?: 'default' | 'specimen' | 'flat';
  /** specimen の配色（既定 blue） */
  family?: ColorFamily;
  /** 標準 padding（16px、md 以上 24px）を無効化 */
  noPadding?: boolean;
  /** 左3pxのステータスレール */
  accent?: CardAccent;
  /** クリック可能カード。ホバーで枡線強調＋カーソル */
  interactive?: boolean;
}

export interface CardHeaderProps {
  title: string;
  action?: ReactNode;
}

export function Card({
  children,
  className,
  variant = 'default',
  family = 'blue',
  noPadding = false,
  accent,
  interactive = false,
  ...rest
}: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(
        cardVariants({ variant, interactive, padded: !noPadding }),
        variant === 'specimen' && FAMILY_CLASS[family],
        accent && ['border-l-[3px]', ACCENT_CLASS[accent]],
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, action }: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-border px-[18px] py-[14px]">
      <h3 className="text-sm font-semibold tracking-normal text-text">{title}</h3>
      {action && <div className="text-xs text-text-muted">{action}</div>}
    </div>
  );
}
