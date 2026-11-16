'use client';

import { useState, useRef, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Dropdown } from '@/components/ui/Dropdown';

interface MiniCalendarProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  min?: Date;
  allDay?: boolean;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: String(i).padStart(2, '0'),
  label: String(i).padStart(2, '0') + '時',
}));
const MINUTES = ['00', '15', '30', '45'].map((m) => ({ value: m, label: m + '分' }));

/** Date → 表示テキスト */
function toText(date: Date, allDay: boolean): string {
  const wd = WEEKDAYS[date.getDay()];
  const base = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}（${wd}）`;
  if (allDay) return base;
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${base} ${h}:${m}`;
}

/**
 * テキストから Date をパース。
 * 受け入れ形式: YYYY/M/D 、YYYY/M/D（曜）、YYYY/M/D（曜） HH:mm など
 */
function parseText(text: string): Date | null {
  const m = text.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[^0-9]+(\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  const d = new Date(
    parseInt(m[1]),
    parseInt(m[2]) - 1,
    parseInt(m[3]),
    m[4] ? parseInt(m[4]) : 0,
    m[5] ? parseInt(m[5]) : 0,
  );
  return isNaN(d.getTime()) ? null : d;
}

export function MiniCalendar({ value, onChange, min, allDay = false }: MiniCalendarProps) {
  const today = new Date();
  const [ym, setYm] = useState({
    y: value?.getFullYear() ?? today.getFullYear(),
    m: (value?.getMonth() ?? today.getMonth()) + 1,
  });
  const [hour, setHour] = useState(value ? String(value.getHours()).padStart(2, '0') : '19');
  const [minute, setMinute] = useState(() => {
    if (!value) return '00';
    const raw = value.getMinutes();
    return raw < 8 ? '00' : raw < 23 ? '15' : raw < 38 ? '30' : '45';
  });

  /* readout テキスト状態（編集中は独立して管理） */
  const [readoutText, setReadoutText] = useState(value ? toText(value, allDay) : '');
  const [readoutEditing, setReadoutEditing] = useState(false);

  /* value 外部変更を同期 */
  const prevValueRef = useRef<Date | null>(null);
  useEffect(() => {
    const prev = prevValueRef.current;
    prevValueRef.current = value;
    if (!value) { setReadoutText(''); return; } // eslint-disable-line react-hooks/set-state-in-effect
    if (prev && prev.getTime() === value.getTime()) return;
    setYm({ y: value.getFullYear(), m: value.getMonth() + 1 }); // eslint-disable-line react-hooks/set-state-in-effect
    setHour(String(value.getHours()).padStart(2, '0')); // eslint-disable-line react-hooks/set-state-in-effect
    const rawMin = value.getMinutes();
    setMinute(rawMin < 8 ? '00' : rawMin < 23 ? '15' : rawMin < 38 ? '30' : '45'); // eslint-disable-line react-hooks/set-state-in-effect
    if (!readoutEditing) setReadoutText(toText(value, allDay)); // eslint-disable-line react-hooks/set-state-in-effect
  }, [value, allDay, readoutEditing]);

  /* allDay 切替でreadout を同期 */
  useEffect(() => {
    if (value && !readoutEditing) setReadoutText(toText(value, allDay)); // eslint-disable-line react-hooks/set-state-in-effect
  }, [allDay]); // eslint-disable-line react-hooks/exhaustive-deps

  /* 月ナビ */
  const shift = (delta: number) => {
    setYm(({ y, m }) => {
      let nm = m + delta;
      let ny = y;
      if (nm < 1) { nm = 12; ny--; }
      else if (nm > 12) { nm = 1; ny++; }
      return { y: ny, m: nm };
    });
  };

  /* グリッド生成 */
  const firstDow = new Date(ym.y, ym.m - 1, 1).getDay();
  const daysInMonth = new Date(ym.y, ym.m, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  /* 日付選択 */
  const handleDayClick = (day: number) => {
    const newDate = new Date(ym.y, ym.m - 1, day, parseInt(hour), parseInt(minute));
    onChange(newDate);
  };

  /* 時刻変更 */
  const handleTimeChange = (newHour: string, newMinute: string) => {
    const base = value ?? new Date(ym.y, ym.m - 1, today.getDate());
    const newDate = new Date(base);
    newDate.setHours(parseInt(newHour));
    newDate.setMinutes(parseInt(newMinute));
    onChange(newDate);
  };

  /* readout 確定（Enter / blur） */
  const commitReadout = () => {
    const parsed = parseText(readoutText);
    if (parsed) {
      onChange(parsed);
      setReadoutText(toText(parsed, allDay));
    } else if (value) {
      /* 無効な入力はリセット */
      setReadoutText(toText(value, allDay));
    } else {
      setReadoutText('');
    }
    setReadoutEditing(false);
  };

  const selDay =
    value && value.getFullYear() === ym.y && value.getMonth() + 1 === ym.m
      ? value.getDate() : null;
  const todayDay =
    today.getFullYear() === ym.y && today.getMonth() + 1 === ym.m
      ? today.getDate() : null;
  const minDay =
    min && min.getFullYear() === ym.y && min.getMonth() + 1 === ym.m
      ? min.getDate() : null;

  return (
    <div className="minical" data-testid="mini-calendar">
      {/* ── 月ナビ（全幅） ── */}
      <div className="minical__head">
        <button type="button" className="minical__nav" onClick={() => shift(-1)} title="前の月">
          <Icon name="chevron_left" size={15} />
        </button>
        <span className="minical__title">{ym.y}年 {ym.m}月</span>
        <button type="button" className="minical__nav" onClick={() => shift(1)} title="次の月">
          <Icon name="chevron_right" size={15} />
        </button>
      </div>

      {/* ── 左右分割ボディ ── */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>

        {/* 左: カレンダーグリッド（flex:1 で広く） */}
        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
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
              if (day === null) return <span key={`e${idx}`} />;
              const cls = [
                'minical__day',
                day === todayDay ? 'is-today' : '',
                day === selDay  ? 'is-sel'   : '',
                minDay !== null && day < minDay ? 'is-disabled' : '',
              ].filter(Boolean).join(' ');
              return (
                <button
                  key={day}
                  type="button"
                  className={cls}
                  onClick={() => !(minDay !== null && day < minDay) && handleDayClick(day)}
                  disabled={minDay !== null && day < minDay}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* 右: 時刻入力 + readout（終日でない場合のみ） */}
        {!allDay && (
          <div
            style={{
              flex: '0 0 auto',
              width: 200,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              paddingTop: 4,
            }}
          >
            {/* 時刻ラベル */}
            <span className="minical__time-label" style={{ fontSize: '0.76rem' }}>
              <Icon name="event" size={14} className="ic" />
              時刻
            </span>

            {/* 時・分を横並び */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
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
              </div>
              <span className="minical__colon" style={{ fontSize: '0.9rem', flexShrink: 0 }}>:</span>
              <div style={{ flex: 1, minWidth: 0 }}>
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

            {/* readout — 編集可能テキストボックス */}
            <div
              style={{
                marginTop: 6,
                background: 'var(--surface-2)',
                border: `1px solid ${readoutEditing ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
                transition: 'border-color 150ms, box-shadow 150ms',
              }}
            >
              <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
                確定日時
              </span>
              <input
                type="text"
                value={readoutText}
                placeholder="例: 2026/6/4 21:00"
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  color: readoutText ? 'var(--text)' : 'var(--text-muted)',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  width: '100%',
                  cursor: 'text',
                }}
                onChange={(e) => { setReadoutText(e.target.value); setReadoutEditing(true); }}
                onFocus={() => setReadoutEditing(true)}
                onBlur={commitReadout}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitReadout(); } }}
              />
            </div>
          </div>
        )}
      </div>

      {/* allDay 時のみ readout を下に表示 */}
      {allDay && (
        <label className="minical__readout" style={{ marginTop: 12 }}>
          <Icon name="calendar_month" size={15} />
          <input
            type="text"
            value={readoutText}
            placeholder="日付を選択"
            readOnly
            style={{
              flex: 1, minWidth: 0, border: 'none', outline: 'none',
              background: 'transparent',
              color: readoutText ? 'var(--text)' : 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600,
              cursor: 'default',
            }}
          />
        </label>
      )}
    </div>
  );
}
