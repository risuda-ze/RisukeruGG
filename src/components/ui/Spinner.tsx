/* ローディングスピナー */
import { cn } from '@/lib/utils/cn';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'size-4 border-2',
  md: 'size-6 border-2',
  lg: 'size-10 border-[3px]',
};

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <div
      data-slot="spinner"
      className={cn('animate-spin rounded-full border-brand-2/30 border-t-brand-2', sizeClasses[size], className)}
      role="status"
      aria-label="読み込み中"
    />
  );
}
