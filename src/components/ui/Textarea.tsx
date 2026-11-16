'use client';

import { TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';
import { fieldClass, fieldLabelClass } from './Input';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** 入力欄上部ラベル */
  label?: string;
  /** エラーメッセージ（表示時は枡線を danger に変更） */
  error?: string;
  /** ヒントテキスト */
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className={fieldLabelClass}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          data-slot="textarea"
          aria-invalid={error ? true : undefined}
          className={cn(fieldClass, 'min-h-20 resize-y py-2.5 leading-relaxed', className)}
          {...props}
        />
        {error && <p className="text-caption text-danger">{error}</p>}
        {hint && !error && <p className="text-caption text-text-muted">{hint}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
