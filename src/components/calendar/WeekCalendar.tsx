'use client';

import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { ScheduleEntry, ScheduleCategory } from '@/types/entities';

interface WeekCalendarProps {
  currentDate: Date;
  schedules: ScheduleEntry[];
  categories: ScheduleCategory[];
  onEventClick: (schedule: ScheduleEntry) => void;
  onDateClick?: (date: Date) => void;
}

const DOW_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const DEFAULT_EVENT_COLOR = '#7F77DD';
const GCAL_EVENT_COLOR = '#4ade80';

function getEventStyle(
  categoryId: string | null,
  categories: ScheduleCategory[],
  source?: 'google'
): { background: string; borderLeftColor: string } {
  if (source === 'google') {
    return {
      background: `${GCAL_EVENT_COLOR}28`,
      borderLeftColor: GCAL_EVENT_COLOR,
    };
  }
  const cat = categories.find((c) => c.id === categoryId);
  const color = cat?.color ?? DEFAULT_EVENT_COLOR;
  return {
    background: `${color}28`,
    borderLeftColor: color,
  };
}

export function WeekCalendar({
  currentDate,
  schedules,
  categories,
  onEventClick,
  onDateClick,
}: WeekCalendarProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="flex flex-col flex-1 bg-surface overflow-hidden">

      {/* ── 曜日ヘッダー（横並び・低め） ─────────────────────── */}
      {/* デスクトップのみ表示（モバイルはアジェンダ内に日付を表示） */}
      <div className="hidden md:grid grid-cols-7 border-b border-border bg-card shrink-0">
        {days.map((day, i) => {
          const isCurrentDay = isToday(day);
          return (
            <div
              key={day.toISOString()}
              className="flex items-center justify-center gap-1 py-2 border-r border-border last:border-r-0"
            >
              {/* "MON 5/" 部分（薄め・小さめ） */}
              <span
                className={`text-[9px] font-bold tracking-wide leading-none whitespace-nowrap ${
                  i === 5 ? 'text-purple-l/50' : i === 6 ? 'text-live/50' : 'text-muted/50'
                }`}
              >
                {DOW_LABELS[i]}&thinsp;{format(day, 'M/')}
              </span>
              {/* "13" 部分（強調） */}
              <span
                className={`text-[16px] font-bold font-num leading-none ${
                  isCurrentDay
                    ? 'text-purple-l'
                    : i === 5
                    ? 'text-purple-l'
                    : i === 6
                    ? 'text-live'
                    : 'text-text'
                }`}
              >
                {format(day, 'd')}
              </span>
              {/* 今日ドット */}
              {isCurrentDay && (
                <span className="w-1 h-1 rounded-full bg-purple-l shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* ── モバイル: アジェンダリスト表示 ──────────────────── */}
      <div className="md:hidden flex-1 overflow-y-auto divide-y divide-border/60">
        {days.map((day, i) => {
          const daySchedules = schedules
            .filter((s) => isSameDay(s.startAt, day))
            .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
          const isCurrentDay = isToday(day);

          return (
            <div key={day.toISOString()}>
              {/* 日付ヘッダー行 */}
              <div
                className={`flex items-center gap-2 px-4 py-2 ${
                  isCurrentDay ? 'bg-[rgba(127,119,221,0.08)]' : 'bg-card/40'
                }`}
              >
                <span
                  className={`text-[10px] font-bold tracking-widest ${
                    i === 5 ? 'text-purple-l/60' : i === 6 ? 'text-live/60' : 'text-muted/60'
                  }`}
                >
                  {DOW_LABELS[i]}
                </span>
                <span
                  className={`text-[14px] font-bold font-num ${
                    isCurrentDay
                      ? 'text-purple-l'
                      : i === 5
                      ? 'text-purple-l'
                      : i === 6
                      ? 'text-live'
                      : 'text-text'
                  }`}
                >
                  {format(day, 'M/d', { locale: ja })}
                </span>
                {isCurrentDay && (
                  <span className="text-[10px] font-semibold text-purple-l bg-purple-d/40 px-1.5 py-0.5 rounded-full">
                    今日
                  </span>
                )}
              </div>

              {/* イベントリスト */}
              {daySchedules.length === 0 ? (
                <div
                  className={`px-5 py-3 text-[12px] text-muted/40 ${onDateClick ? 'cursor-pointer' : ''}`}
                  onClick={() => onDateClick?.(day)}
                >
                  —
                </div>
              ) : (
                <div
                  className={`px-3 py-2 flex flex-col gap-1.5 ${onDateClick ? 'cursor-pointer' : ''}`}
                  onClick={() => onDateClick?.(day)}
                >
                  {daySchedules.map((s) => {
                    const style = getEventStyle(s.categoryId, categories, s.source);
                    return (
                      <button
                        key={s.id}
                        className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-[8px] border-l-[3px] transition-opacity active:opacity-70"
                        style={style}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(s);
                        }}
                      >
                        <span className="text-[11px] font-num text-white/60 shrink-0 w-10">
                          {format(s.startAt, 'HH:mm')}
                        </span>
                        <span className="text-[13px] font-semibold text-white truncate flex-1">
                          {s.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── デスクトップ: グリッド表示 ──────────────────────── */}
      <div className="hidden md:grid flex-1 grid-cols-7 overflow-y-auto">
        {days.map((day, i) => {
          const daySchedules = schedules
            .filter((s) => isSameDay(s.startAt, day))
            .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
          const isCurrentDay = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={[
                'border-r border-border last:border-r-0 p-2 flex flex-col gap-2',
                isCurrentDay ? 'bg-[rgba(127,119,221,0.05)]' : '',
                onDateClick ? 'cursor-pointer' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onDateClick?.(day)}
            >
              {daySchedules.length === 0 ? (
                <div
                  className={`text-[11px] text-center pt-6 select-none ${
                    i === 5 ? 'text-purple-l/30' : i === 6 ? 'text-live/30' : 'text-muted/30'
                  }`}
                >
                  —
                </div>
              ) : (
                daySchedules.map((s) => {
                  const style = getEventStyle(s.categoryId, categories, s.source);
                  return (
                    <button
                      key={s.id}
                      className="w-full text-left px-2 py-1.5 rounded-[6px] text-white border-l-[3px] transition-opacity hover:opacity-80 shrink-0"
                      style={style}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(s);
                      }}
                      title={s.title}
                    >
                      <div className="text-[10px] font-bold opacity-70 mb-0.5 font-num">
                        {format(s.startAt, 'HH:mm')} – {format(s.endAt, 'HH:mm')}
                      </div>
                      <div className="text-[12px] font-semibold leading-tight">{s.title}</div>
                    </button>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
