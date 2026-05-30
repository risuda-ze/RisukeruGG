'use client';

import { useState, useRef, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Dropdown } from '@/components/ui/Dropdown';

interface MiniCalendarProps {
  /** 現在の値 */
  value: Date | null;
  /** 変更コールバック */
  onChange: (date: Date | null) => void;
  /** 選択可能な最小日 */
  min?: Date;
  /** true のとき時刻選択を非表示（終日イベント） */
  allDay?: boolean;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: String(i).padStart(2, '0'),
  label: String(i).padStart(2, '0') + '時',
}));
const MINUTES = ['00', '15', '30', '45'].map((m) => ({ value: m, label: m + '分' }));

/** Date を YYYY/M/D（曜日） HH:mm 形式に変換 */
function formatReadout(date: Date): string {
  const wd = WEEKDAYS[date.getDay()];
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}（${wd}） ${h}:${m}`;
}

/** Date から YYYY/M/D（曜日） 形式に変換（allDay） */
function formatReadoutDate(date: Date): string {
  const wd = WEEKDAYS[date.getDay()];
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}（${wd}）`;
}

export function MiniCalendar({ value, onChange, min, allDay = false }: MiniCalendarProps) {
  const today = new Date();
  const [ym, setYm] = useState({
    y: value?.getFullYear() ?? today.getFullYear(),
    m: (value?.getMonth() ?? today.getMonth()) + 1,
  });
  const [hour, setHour] = useState(
    value ? String(value.getHours()).padStart(2, '0') : '19'
  );
  const [minute, setMinute] = useState(
    value ? (value.getMinutes() < 8 ? '00' : value.getMinutes() < 23 ? '15' : value.getMinutes() < 38 ? '30' : '45') : '00'
  );

  // value 外部変更を同期（prevValue と比較して不要な setState を抑制）
  const prevValueRef = useRef<Date | null>(null);
  useEffect(() => {
    const prev = prevValueRef.current;
    prevValueRef.current = value;
    if (!value) return;
    if (prev && prev.getTime() === value.getTime()) return;
    setYm({ y: value.getFullYear(), m: value.getMonth() + 1 });
    setHour(String(value.getHours()).padStart(2, '0'));
    const rawMin = value.getMinutes();
    const snapMin = rawMin < 8 ? '00' : rawMin < 23 ? '15' : rawMin < 38 ? '30' : '45';
    setMinute(snapMin);
  }, [value]);

  /* ── 月ナビ ── */
  const shift = (delta: number) => {
    setYm(({ y, m }) => {
      let nm = m + delta;
      let ny = y;
      if (nm < 1) { nm = 12; ny--; }
      else if (nm > 12) { nm = 1; ny++; }
      return { y: ny, m: nm };
    });
  };

  /* ── グリッド生成 ── */
  const firstDow = new Date(ym.y, ym.m - 1, 1).getDay(); // 0=日
  const daysInMonth = new Date(ym.y, ym.m, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  /* ── 日付選択 ── */
  const handleDayClick = (day: number) => {
    const newDate = new Date(ym.y, ym.m - 1, day, parseInt(hour), parseInt(minute));
    onChange(newDate);
  };

  /* ── 時刻変更 ── */
  const handleTimeChange = (newHour: string, newMinute: string) => {
    if (!value) return;
    const newDate = new Date(value);
    newDate.setHours(parseInt(newHour));
    newDate.setMinutes(parseInt(newMinute));
    onChange(newDate);
  };

  /* ── readout テキスト ── */
  const readoutText = value
    ? allDay
      ? formatReadoutDate(value)
      : formatReadout(value)
    : '';

  /* ── 選択・今日・min の判定 ── */
  const selDay = value && value.getFullYear() === ym.y && value.getMonth() + 1 === ym.m
    ? value.getDate() : null;
  const todayDay = today.getFullYear() === ym.y && today.getMonth() + 1 === ym.m
    ? today.getDate() : null;
  const minDay = min && min.getFullYear() === ym.y && min.getMonth() + 1 === ym.m
    ? min.getDate() : null;

  return (
    <div className="minical">
      {/* ── 月ナビ ── */}
      <div className="minical__head">
        <button type="button" className="minical__nav" onClick={() => shift(-1)} title="前の月">
          <Icon name="chevron_left" size={15} />
        </button>
        <span className="minical__title">{ym.y}年 {ym.m}月</span>
        <button type="button" className="minical__nav" onClick={() => shift(1)} title="次の月">
          <Icon name="chevron_right" size={15} />
        </button>
      </div>

      {/* ── 曜日ヘッダー + 日付グリッド ── */}
      <div className="minical__grid">
        {WEEKDAYS.map((wd, i) => (
          <span
            key={wd}
            className={`minical__wd${i === 0 ? ' is-sun' : i === 6 ? ' is-sat' : ''}`}
          >
            {wd}
          </span>
        ))}
        {cells.map((day, idx) => {
          if (day === null) return <span key={`empty-${idx}`} />;
          const isToday = day === todayDay;
          const isSel = day === selDay;
          const isDisabled = minDay !== null && day < minDay;
          const cls = [
            'minical__day',
            isToday ? 'is-today' : '',
            isSel ? 'is-sel' : '',
            isDisabled ? 'is-disabled' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={day}
              type="button"
              className={cls}
              onClick={() => !isDisabled && handleDayClick(day)}
              disabled={isDisabled}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* ── 時刻選択（終日でない場合） ── */}
      {!allDay && (
        <div className="minical__time">
          <span className="minical__time-label">
            <Icon name="event" size={14} className="ic" />
            時刻
          </span>
          <div className="minical__time-fields">
            <Dropdown
              options={HOURS}
              value={hour}
              size="sm"
              scroll
              up
              onChange={(v) => {
                setHour(v);
                handleTimeChange(v, minute);
              }}
            />
            <span className="minical__colon">:</span>
            <Dropdown
              options={MINUTES}
              value={minute}
              size="sm"
              up
              onChange={(v) => {
                setMinute(v);
                handleTimeChange(hour, v);
              }}
            />
          </div>
        </div>
      )}

      {/* ── readout ── */}
      <label className="minical__readout">
        <Icon name="calendar_month" size={15} stroke={2} />
        <input
          type="text"
          value={readoutText}
          placeholder="日付を選択"
          readOnly
          style={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: readoutText ? 'var(--text-primary)' : 'var(--text-muted)',
            fontFamily: 'var(--font-head)',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'default',
          }}
        />
      </label>
    </div>
  );
}
