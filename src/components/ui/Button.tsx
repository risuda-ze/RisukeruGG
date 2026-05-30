'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'amber' | 'danger' | 'ghost' | 'success' | 'subtle';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantMap: Record<ButtonVariant, string> = {
  primary:   'btn--primary',
  secondary: 'btn--secondary',
  amber:     'btn--amber',
  danger:    'btn--danger',
  ghost:     'btn--ghost',
  success:   'btn--success',
  subtle:    'btn--subtle',
};

const sizeMap: Record<ButtonSize, string> = {
  sm:   'btn--sm',
  md:   '',
  lg:   'btn--lg',
  icon: 'btn--icon',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, className = '', children, disabled, ...props }, ref) => {
    const cls = ['btn', variantMap[variant], sizeMap[size], className].filter(Boolean).join(' ');
    return (
      <button ref={ref} disabled={disabled || loading} className={cls} {...props}>
        {loading && (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
