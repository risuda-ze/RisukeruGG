'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** 入力欄上部ラベル */
  label?: string;
  /** エラーメッセージ（表示時はボーダーをliveカラーに変更） */
  error?: string;
  /** ヒントテキスト */
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-text">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`rounded-sm border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted transition-colors outline-none focus:ring-1 focus:ring-purple disabled:cursor-not-allowed disabled:opacity-40 ${
            error ? 'border-live' : 'border-border focus:border-purple'
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-live">{error}</p>}
        {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
