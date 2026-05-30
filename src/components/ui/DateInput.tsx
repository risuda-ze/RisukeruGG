'use client';

import { useState, useRef, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { MiniCalendar } from '@/components/ui/MiniCalendar';

/** date 専用の入力コンポーネント（"yyyy-MM-dd" 文字列インターフェース・終日版） */

interface DateInputProps {
  label: string;
  value: string; // "yyyy-MM-dd"
  onChange: (value: string) => void;
  min?: string; // "yyyy-MM-dd"
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

/** "yyyy-MM-dd" → Date */
function parseDate(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Date → "yyyy-MM-dd" */
function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Date → 表示文字列 */
function formatDisplay(d: Date): string {
  const wd = WEEKDAYS[d.getDay()];
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}（${wd}）`;
}

export function DateInput({
  label,
  value,
  onChange,
  min,
  required,
  error,
  hint,
  className,
}: DateInputProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 外側クリックで閉じる
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const dateValue = parseDate(value);
  const minDate = parseDate(min ?? '');
  const displayText = dateValue ? formatDisplay(dateValue) : '';

  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ''}`} ref={ref} style={{ position: 'relative' }}>
      {/* ラベル */}
      <label
        className="text-sm font-medium"
        style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-head)' }}
      >
        {label}
        {required && <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>}
      </label>

      {/* トリガーボタン */}
      <button
        type="button"
        className="ds-field"
        style={{
          borderColor: error ? 'var(--danger)' : undefined,
          justifyContent: 'flex-start',
          gap: 10,
          cursor: 'pointer',
          width: '100%',
        }}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="calendar_month" size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <span
          style={{
            flex: 1,
            textAlign: 'left',
            fontSize: '0.875rem',
            color: displayText ? 'var(--text-primary)' : 'var(--text-muted)',
            fontFamily: 'var(--font-body)',
          }}
        >
          {displayText || '日付を選択…'}
        </span>
        <Icon
          name="chevron_down"
          size={14}
          style={{
            color: 'var(--text-muted)',
            flexShrink: 0,
            transform: open ? 'rotate(180deg)' : undefined,
            transition: 'transform 120ms ease-out',
          }}
        />
      </button>

      {/* エラー・ヒント */}
      {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
      {hint && !error && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{hint}</p>}

      {/* MiniCalendar ドロップダウン（allDay） */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 60,
            background: 'var(--card-raised)',
            border: '1px solid var(--card-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
            padding: '16px',
            minWidth: '260px',
            animation: 'slide-up 120ms ease-out both',
          }}
        >
          <MiniCalendar
            value={dateValue}
            min={minDate ?? undefined}
            allDay
            onChange={(date) => {
              if (date) onChange(formatDate(date));
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
