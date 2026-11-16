import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

type BadgeVariant =
  | 'purple' | 'amber' | 'live' | 'green' | 'muted' | 'default'
  | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface BadgeProps {
  variant?: BadgeVariant;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

const PRIMARY = 'border-primary bg-surface-2 text-text';
const SUCCESS = 'border-green-border bg-success-tint text-green-text';
const WARNING = 'border-orange-border bg-warning-tint text-orange-text';
const DANGER = 'border-danger bg-danger-tint text-danger';
const NEUTRAL = 'border-border bg-surface text-text-2';

/**
 * ピル型バッジ: tint 面 + 1px 同ファミリー枡線 + ファミリー文字（docs/DESIGN.md「Badge / Tag」）。
 * チップ状のボタン等にも `className={badgeVariants({ variant })}` で同じ見た目を当てられる。
 */
export const badgeVariants = cva(
  'eyebrow inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 whitespace-nowrap',
  {
    variants: {
      variant: {
        primary: PRIMARY,
        purple: PRIMARY,
        success: SUCCESS,
        green: SUCCESS,
        warning: WARNING,
        amber: WARNING,
        danger: DANGER,
        live: DANGER,
        // info の文字色は --text に固定する（ライトの --text-2 は info-tint 上で 4.3:1 しかない）
        info: 'border-blue-border bg-info-tint text-text',
        neutral: NEUTRAL,
        muted: NEUTRAL,
        default: NEUTRAL,
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export function Badge({ children, variant = 'default', dot = false, className }: BadgeProps) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)}>
      {dot && (
        <span
          className={cn(
            'size-1.5 shrink-0 rounded-full bg-current',
            // LIVE はドットだけ --live で点滅させる
            variant === 'live' && 'animate-live-pulse bg-live'
          )}
        />
      )}
      {children}
    </span>
  );
}
