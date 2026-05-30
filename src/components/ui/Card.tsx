import { ReactNode } from 'react';

export interface CardProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
  /** ホバーでリフト＋グロー */
  hover?: boolean;
  /** raised バリアント */
  raised?: boolean;
}

export interface CardHeaderProps {
  title: string;
  action?: ReactNode;
}

export function Card({ children, className = '', noPadding = false, hover = false, raised = false }: CardProps) {
  const cls = [
    'ds-card',
    raised ? 'ds-card--raised' : '',
    hover  ? 'ds-card--hover'  : '',
    noPadding ? '' : 'p-[18px]',
    'overflow-hidden',
    className,
  ].filter(Boolean).join(' ');
  return <div className={cls}>{children}</div>;
}

export function CardHeader({ title, action }: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between px-[18px] py-[14px]" style={{ borderBottom: '1px solid var(--card-border)' }}>
      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-head)' }}>{title}</h3>
      {action && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{action}</div>}
    </div>
  );
}
