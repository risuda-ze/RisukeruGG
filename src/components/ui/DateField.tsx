'use client';

import { useState, useRef, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { MiniCalendar } from '@/components/ui/MiniCalendar';

interface DateFieldProps {
  value: Date | null;
  onChange: (d: Date) => void;
  /** true のとき時刻表示を非表示（終日モード） */
  hideTime?: boolean;
  placeholder?: string;
  label?: string;
  /** 選択可能な最小日 */
  min?: Date;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

/** Date を表示テキストに変換 */
function formatValue(date: Date, hideTime: boolean): string {
  const wd = WEEKDAYS[date.getDay()];
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if (hideTime) return `${y}/${m}/${d}（${wd}）`;
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}/${m}/${d}（${wd}） ${h}:${min}`;
}

/**
 * テキストボックス＋カレンダーアイコンで MiniCalendar をポップアップ表示する日付入力フィールド
 * - hideTime=true のとき時刻選択を非表示
 * - 外側クリックでポップアップを閉じる
 */
export function DateField({
  value,
  onChange,
  hideTime = false,
  placeholder = '日付を選択',
  label,
  min,
}: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  /* 外側クリックで閉じる */
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const displayText = value ? formatValue(value, hideTime) : '';

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <div ref={ref} className="relative">
        {/* テキストボックス行 */}
        <div
          className="flex items-center h-[46px] gap-2 px-3 rounded-[10px] border cursor-pointer transition-colors"
          style={{
            background: 'var(--surface)',
            borderColor: open ? 'var(--primary)' : 'var(--border)',
            boxShadow: open ? 'var(--glow-primary)' : 'none',
          }}
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name="calendar_month" size={16} style={{ color: 'var(--text-accent)', flexShrink: 0 } as React.CSSProperties} />
          <span
            className="flex-1 text-[13px] font-semibold font-num truncate"
            style={{ color: displayText ? 'var(--text-primary)' : 'var(--text-muted)' }}
          >
            {displayText || placeholder}
          </span>
          <Icon
            name={open ? 'expand_less' : 'expand_more'}
            size={16}
            style={{ color: open ? 'var(--primary-300)' : 'var(--text-muted)', flexShrink: 0 } as React.CSSProperties}
          />
        </div>

        {/* MiniCalendar ポップアップ */}
        {open && (
          <div
            className="absolute z-[90] left-0 animate-pop-modal"
            style={{
              top: 'calc(100% + 8px)',
              width: '300px',
              background: 'var(--card-raised)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-xl)',
              padding: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <MiniCalendar
              value={value}
              onChange={(d) => {
                if (d) {
                  onChange(d);
                  setOpen(false);
                }
              }}
              min={min}
              allDay={hideTime}
            />
          </div>
        )}
      </div>
    </div>
  );
}
