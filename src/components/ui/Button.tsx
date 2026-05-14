'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

/* ボタンのスタイルバリアント */
type ButtonVariant = 'primary' | 'secondary' | 'amber' | 'danger' | 'ghost';
type ButtonSize    = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** trueのときスピナー表示＋disabled */
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:   'bg-purple-d text-purple-l hover:bg-purple',
  secondary: 'bg-surface border border-border text-text hover:bg-card',
  amber:     'bg-amber-d text-white hover:bg-amber',
  danger:    'bg-live/10 border border-live/30 text-live hover:bg-live/20',
  ghost:     'text-muted hover:bg-surface',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, className = '', children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple opacity-100 disabled:opacity-40 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {loading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
