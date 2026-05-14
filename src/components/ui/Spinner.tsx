/* ローディングスピナー — パープル系カラー */

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
};

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <div
      className={`animate-spin rounded-full border-purple-l/30 border-t-purple-l ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="読み込み中"
    />
  );
}
