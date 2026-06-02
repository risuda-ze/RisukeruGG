'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
 * - position: fixed でポップアップを表示（親の overflow: hidden を脱出）
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
  const triggerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number; openUpward?: boolean }>({ top: 0, left: 0 });

  const popupWidth = hideTime ? 300 : 500;

  /* 外側クリックで閉じる（トリガーとポップアップ両方を除外） */
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        (triggerRef.current && triggerRef.current.contains(target)) ||
        (popupRef.current && popupRef.current.contains(target))
      ) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  /* ポップアップの fixed 座標を計算してから開く */
  function handleOpen() {
    if (open) { setOpen(false); return; }
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - popupWidth - 8));
      /* 下に空きがなければ上に開く */
      const spaceBelow = window.innerHeight - rect.bottom - 12;
      const spaceAbove = rect.top - 12;
      const openUpward = spaceBelow < 300 && spaceAbove > spaceBelow;
      setPopupPos({
        top: openUpward ? rect.top - 8 : rect.bottom + 8,
        left,
        openUpward,
      });
    }
    setOpen(true);
  }

  const displayText = value ? formatValue(value, hideTime) : '';

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <div ref={triggerRef} className="relative">
        {/* トリガー（テキストボックス） */}
        <div
          className="flex items-center h-[46px] gap-2 px-3 rounded-[10px] border cursor-pointer transition-colors"
          style={{
            background: 'var(--surface)',
            borderColor: open ? 'var(--primary)' : 'var(--border)',
            boxShadow: open ? 'var(--glow-primary)' : 'none',
          }}
          onClick={handleOpen}
        >
          <Icon
            name="calendar_month"
            size={16}
            style={{ color: 'var(--text-accent)', flexShrink: 0 } as React.CSSProperties}
          />
          <span
            className="flex-1 text-[13px] font-semibold font-num truncate"
            style={{ color: displayText ? 'var(--text-primary)' : 'var(--text-muted)' }}
          >
            {displayText || placeholder}
          </span>
          <Icon
            name={open ? 'expand_less' : 'expand_more'}
            size={16}
            style={{
              color: open ? 'var(--primary-300)' : 'var(--text-muted)',
              flexShrink: 0,
            } as React.CSSProperties}
          />
        </div>
      </div>

      {/* MiniCalendar ポップアップ（portal で transform コンテキスト外に配置） */}
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={popupRef}
          className="animate-pop-modal"
          style={{
            position: 'fixed',
            top: popupPos.top,
            left: popupPos.left,
            transform: popupPos.openUpward ? 'translateY(-100%)' : undefined,
            width: popupWidth,
            zIndex: 9999,
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
              /* 日付を変更しても自動で閉じない（時刻も右パネルで調整できるように） */
              if (d) onChange(d);
            }}
            min={min}
            allDay={hideTime}
          />
        </div>,
        document.body,
      )}
    </div>
  );
}
