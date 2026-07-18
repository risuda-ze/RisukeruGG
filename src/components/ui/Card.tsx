import { HTMLAttributes, ReactNode } from 'react';

/** アクセントレール（左3px）の色バリアント */
export type CardAccent = 'primary' | 'success' | 'warning' | 'danger';

const ACCENT_VAR: Record<CardAccent, string> = {
  primary: 'var(--primary)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  /** 標準 padding(16px) を無効化 */
  noPadding?: boolean;
  /** ホバーでリフト＋グロー */
  hover?: boolean;
  /** raised バリアント */
  raised?: boolean;
  /** 左3pxのステータスレール */
  accent?: CardAccent;
  /** クリック可能カード。ホバーでborder強調＋カーソル */
  interactive?: boolean;
}

export interface CardHeaderProps {
  title: string;
  action?: ReactNode;
}

export function Card({
  children,
  className = '',
  noPadding = false,
  hover = false,
  raised = false,
  accent,
  interactive = false,
  style,
  ...rest
}: CardProps) {
  const cls = [
    'ds-card',
    raised ? 'ds-card--raised' : '',
    hover ? 'ds-card--hover' : '',
    interactive ? 'ds-card--interactive' : '',
    // 標準 padding は 16px（4pxグリッド整合）
    noPadding ? '' : 'p-4',
    'overflow-hidden',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // アクセントレールは外枠 border の左辺を上書きして表現する
  const accentStyle = accent
    ? {
        borderLeftWidth: '3px',
        borderLeftStyle: 'solid' as const,
        borderLeftColor: ACCENT_VAR[accent],
      }
    : undefined;

  return (
    <div className={cls} style={{ ...accentStyle, ...style }} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, action }: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between px-[18px] py-[14px]" style={{ borderBottom: '1px solid var(--card-border)' }}>
      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-head)' }}>{title}</h3>
      {action && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{action}</div>}
    </div>
  );
}
