/* バッジコンポーネント — カラーバリアント定義 */

type BadgeVariant = 'purple' | 'amber' | 'live' | 'green' | 'muted' | 'default';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  purple: 'bg-purple/15 text-purple-l',
  amber: 'bg-amber/15 text-amber-l',
  live: 'bg-live/15 text-live',
  green: 'bg-green/15 text-green',
  muted: 'bg-surface text-muted',
  default: 'bg-surface border border-border text-text',
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
