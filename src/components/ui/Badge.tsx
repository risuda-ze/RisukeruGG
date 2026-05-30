type BadgeVariant = 'purple' | 'amber' | 'live' | 'green' | 'muted' | 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface BadgeProps {
  variant?: BadgeVariant;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

const variantMap: Record<BadgeVariant, string> = {
  primary: 'ds-badge--primary',
  purple:  'ds-badge--primary',
  success: 'ds-badge--success',
  green:   'ds-badge--success',
  warning: 'ds-badge--warning',
  amber:   'ds-badge--amber',
  danger:  'ds-badge--danger',
  live:    'ds-badge--danger',
  info:    'ds-badge--info',
  muted:   'ds-badge--neutral',
  neutral: 'ds-badge--neutral',
  default: 'ds-badge--neutral',
};

export function Badge({ children, variant = 'default', dot = false, className = '' }: BadgeProps) {
  return (
    <span className={`ds-badge ${variantMap[variant]} ${className}`}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}
