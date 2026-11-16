'use client';

import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

/** Input / Textarea 共通の枠（docs/DESIGN.md「Input / Textarea / Select」） */
export const fieldClass =
  'w-full rounded-sm border border-border bg-card px-3 text-sm text-text outline-none transition-colors duration-(--duration-instant) ease-snap placeholder:text-text-muted focus:border-brand focus:ring-2 focus:ring-brand/25 disabled:cursor-not-allowed disabled:opacity-40 aria-invalid:border-danger aria-invalid:focus:ring-danger/25';

export const fieldLabelClass = 'eyebrow text-text-2';

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className={fieldLabelClass}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          data-slot="input"
          aria-invalid={error ? true : undefined}
          className={cn(fieldClass, 'h-11', className)}
          {...props}
        />
        {error && <p className="text-caption text-danger">{error}</p>}
        {hint && !error && <p className="text-caption text-text-muted">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
