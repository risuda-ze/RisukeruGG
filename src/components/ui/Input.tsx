'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium"
            style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-head)' }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`rounded-[6px] px-3 py-2 text-sm outline-none transition-all disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
          style={{
            background: 'var(--surface)',
            border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-body)',
          }}
          onFocus={e => {
            if (!error) {
              (e.target as HTMLElement).style.borderColor = 'var(--primary)';
              (e.target as HTMLElement).style.boxShadow = 'var(--glow-primary)';
            }
          }}
          onBlur={e => {
            (e.target as HTMLElement).style.borderColor = error ? 'var(--danger)' : 'var(--border)';
            (e.target as HTMLElement).style.boxShadow = '';
          }}
          {...props}
        />
        {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
        {hint && !error && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
