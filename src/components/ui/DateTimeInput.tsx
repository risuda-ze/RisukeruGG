'use client';

import { useState, useRef, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { MiniCalendar } from '@/components/ui/MiniCalendar';

/** Date | null と日時選択を一元管理するポップオーバーコンポーネント */

interface DateTimeInputProps {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  min?: Date;
  /** true のとき時刻選択を非表示（終日イベント） */
  allDay?: boolean;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

/** Date を表示文字列に変換 */
function formatDisplay(date: Date, allDay: boolean): string {
  const wd = WEEKDAYS[date.getDay()];
  if (allDay) {
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}（${wd}）`;
  }
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}（${wd}） ${h}:${m}`;
}

export function DateTimeInput({
  label,
  value,
  onChange,
  min,
  allDay = false,
  required,
  error,
  hint,
  className,
}: DateTimeInputProps) {
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

  const displayText = value ? formatDisplay(value, allDay) : '';

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

      {/* トリガーボタン（ds-field スタイル） */}
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

      {/* MiniCalendar ドロップダウン */}
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
            minWidth: '280px',
            animation: 'slide-up 120ms ease-out both',
          }}
        >
          <MiniCalendar
            value={value}
            onChange={(date) => {
              onChange(date);
              // 日付が選択されたら自動で閉じない（時刻も設定させる）
            }}
            min={min}
            allDay={allDay}
          />
          {/* 確定ボタン */}
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn--primary"
              style={{ height: 32, fontSize: '0.8rem', padding: '0 16px' }}
              onClick={() => setOpen(false)}
            >
              確定
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
