'use client';

import { format, startOfWeek, addDays, startOfDay, endOfDay, isToday } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { ScheduleEntry, ScheduleCategory } from '@/types/entities';

interface WeekCalendarProps {
  currentDate: Date;
  schedules: ScheduleEntry[];
  categories: ScheduleCategory[];
  onEventClick: (schedule: ScheduleEntry) => void;
  onDateClick?: (date: Date) => void;
}

/** 日曜始まりの曜日ヘッダーラベル */
const DOW_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const DEFAULT_EVENT_COLOR = '#7F77DD';
const GCAL_EVENT_COLOR = '#4ade80';

function getEventStyle(
  categoryId: string | null,
  categories: ScheduleCategory[],
  source?: 'google'
): { background: string; borderLeftColor: string } {
  if (source === 'google') {
    return { background: `${GCAL_EVENT_COLOR}28`, borderLeftColor: GCAL_EVENT_COLOR };
  }
  const cat = categories.find((c) => c.id === categoryId);
  const color = cat?.color ?? DEFAULT_EVENT_COLOR;
  return { background: `${color}28`, borderLeftColor: color };
}

/** 曜日インデックスから色クラスを返す（0=日, 6=土） */
function getDowColorClass(i: number): string {
  if (i === 0) return 'text-live';
  if (i === 6) return 'text-purple-l';
  return 'text-muted';
}

/** 予定が対象日に表示すべきかを判定する（複数日対応） */
function isEventOnDay(event: ScheduleEntry, day: Date): boolean {
  return event.startAt <= endOfDay(day) && event.endAt >= startOfDay(day);
}

/** 週内でイベントが占める列範囲を取得する（0-indexed, null = 週外） */
function getEventWeekCols(
  event: ScheduleEntry,
  days: Date[]
): { start: number; end: number } | null {
  let startCol = -1;
  let endCol = -1;
  for (let i = 0; i < days.length; i++) {
    if (event.startAt <= endOfDay(days[i]) && event.endAt >= startOfDay(days[i])) {
      if (startCol === -1) startCol = i;
      endCol = i;
    }
  }
  if (startCol === -1) return null;
  return { start: startCol, end: endCol };
}

export function WeekCalendar({
  currentDate,
  schedules,
  categories,
  onEventClick,
  onDateClick,
}: WeekCalendarProps) {
  /* 日曜始まり（weekStartsOn: 0）*/
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  /* 複数日イベント（開始日 ≠ 終了日）と単日イベントに分類 */
  const multiDaySchedules = schedules.filter(
    (s) => startOfDay(s.startAt).getTime() < startOfDay(s.endAt).getTime()
  );
  const singleDaySchedules = schedules.filter(
    (s) => startOfDay(s.startAt).getTime() === startOfDay(s.endAt).getTime()
  );
  /* 今週に表示すべき複数日イベント */
  const multiDayInWeek = multiDaySchedules.filter((s) => getEventWeekCols(s, days) !== null);

  return (
    <div className="flex flex-col flex-1 bg-surface overflow-hidden">

      {/* ── 曜日ヘッダー（デスクトップ） ────────────────────── */}
      <div className="hidden md:grid grid-cols-7 border-b border-border bg-card shrink-0">
        {days.map((day, i) => {
          const isCurrentDay = isToday(day);
          return (
            <div
              key={day.toISOString()}
              className="flex items-center justify-center gap-1 py-2 border-r border-border last:border-r-0"
            >
              <span
                className={`text-[9px] font-bold tracking-wide leading-none whitespace-nowrap ${getDowColorClass(i)}/50`}
              >
                {DOW_LABELS[i]}&thinsp;{format(day, 'M/')}
              </span>
              <span
                className={`text-[16px] font-bold font-num leading-none ${
                  isCurrentDay ? 'text-purple-l' : getDowColorClass(i)
                }`}
              >
                {format(day, 'd')}
              </span>
              {isCurrentDay && <span className="w-1 h-1 rounded-full bg-purple-l shrink-0" />}
            </div>
          );
        })}
      </div>

      {/* ── 複数日イベント用 all-day ストリップ（デスクトップ） ── */}
      {multiDayInWeek.length > 0 && (
        <div
          className="hidden md:grid grid-cols-7 border-b border-border shrink-0 bg-card/20 py-1 gap-y-0.5"
          style={{ gridAutoRows: '22px' }}
        >
          {multiDayInWeek.map((event) => {
            const cols = getEventWeekCols(event, days)!;
            const evStyle = getEventStyle(event.categoryId, categories, event.source);
            const cat = categories.find((c) => c.id === event.categoryId);
            /* 週の外に伸びている場合は角丸/ボーダーを調整 */
            const startsBefore = startOfDay(event.startAt) < startOfDay(days[0]);
            const endsAfter = startOfDay(event.endAt) > startOfDay(days[6]);

            return (
              <button
                key={event.id}
                className={[
                  'flex items-center gap-1 text-[11px] font-semibold text-white',
                  'transition-opacity hover:opacity-80 overflow-hidden border-l-[3px]',
                  'animate-puni',
                  !startsBefore ? 'ml-1 rounded-l-[4px]' : 'ml-0 border-l-transparent',
                  !endsAfter ? 'mr-1 rounded-r-[4px]' : 'mr-0',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{
                  gridColumn: `${cols.start + 1} / ${cols.end + 2}`,
                  background: evStyle.background,
                  borderLeftColor: !startsBefore ? evStyle.borderLeftColor : 'transparent',
                  paddingLeft: !startsBefore ? '6px' : '4px',
                  paddingRight: '6px',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick(event);
                }}
                title={event.title}
              >
                {cat?.icon && (
                  <span className="material-icons text-[10px] opacity-80 shrink-0">{cat.icon}</span>
                )}
                <span className="truncate">{event.title}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── モバイル: アジェンダリスト表示 ──────────────────── */}
      <div className="md:hidden flex-1 overflow-y-auto divide-y divide-border/60">
        {days.map((day, i) => {
          /* 複数日対応: 当日の範囲内にある全イベントを取得 */
          const daySchedules = schedules
            .filter((s) => isEventOnDay(s, day))
            .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
          const isCurrentDay = isToday(day);

          return (
            <div key={day.toISOString()}>
              <div
                className={`flex items-center gap-2 px-4 py-2 ${
                  isCurrentDay ? 'bg-[rgba(127,119,221,0.08)]' : 'bg-card/40'
                }`}
              >
                <span className={`text-[10px] font-bold tracking-widest ${getDowColorClass(i)}/60`}>
                  {DOW_LABELS[i]}
                </span>
                <span
                  className={`text-[14px] font-bold font-num ${
                    isCurrentDay ? 'text-purple-l' : getDowColorClass(i)
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
                    const cat = categories.find((c) => c.id === s.categoryId);
                    return (
                      <button
                        key={s.id}
                        className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-[8px] border-l-[3px] transition-opacity active:opacity-70 min-h-[40px]"
                        style={style}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(s);
                        }}
                      >
                        {cat?.icon && (
                          <span className="material-icons text-[14px] opacity-80 shrink-0">
                            {cat.icon}
                          </span>
                        )}
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

      {/* ── デスクトップ: 単日イベントのグリッド ────────────── */}
      <div className="hidden md:grid flex-1 grid-cols-7 overflow-y-auto">
        {days.map((day, i) => {
          /* 単日イベントのみ表示（複数日は all-day ストリップで表示済み） */
          const daySingleSchedules = singleDaySchedules
            .filter((s) => isEventOnDay(s, day))
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
              {daySingleSchedules.length === 0 ? (
                <div
                  className={`text-[11px] text-center pt-6 select-none ${getDowColorClass(i)}/30`}
                >
                  —
                </div>
              ) : (
                daySingleSchedules.map((s) => {
                  const style = getEventStyle(s.categoryId, categories, s.source);
                  const cat = categories.find((c) => c.id === s.categoryId);
                  return (
                    <button
                      key={s.id}
                      className="w-full text-left px-2 py-1.5 rounded-[6px] text-white border-l-[3px] transition-opacity hover:opacity-80 shrink-0 min-h-[44px] flex flex-col justify-center"
                      style={style}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(s);
                      }}
                      title={s.title}
                    >
                      {/* 時刻 */}
                      <div className="text-[10px] font-bold opacity-70 mb-0.5 font-num">
                        {format(s.startAt, 'HH:mm')} – {format(s.endAt, 'HH:mm')}
                      </div>
                      {/* アイコン + タイトル */}
                      <div className="flex items-center gap-1">
                        {cat?.icon && (
                          <span className="material-icons text-[13px] opacity-80 shrink-0">
                            {cat.icon}
                          </span>
                        )}
                        <div className="text-[12px] font-semibold leading-tight truncate">
                          {s.title}
                        </div>
                      </div>
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
