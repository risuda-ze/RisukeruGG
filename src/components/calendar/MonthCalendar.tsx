'use client';

import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import type { ScheduleEntry, ScheduleCategory } from '@/types/entities';

interface MonthCalendarProps {
  year: number;
  month: number; // 1-12
  schedules: ScheduleEntry[];
  categories: ScheduleCategory[];
  onEventClick: (schedule: ScheduleEntry) => void;
  onDateClick?: (date: Date) => void;
}

const DOW_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const DEFAULT_EVENT_COLOR = '#7F77DD';

function getEventStyle(
  categoryId: string | null,
  categories: ScheduleCategory[]
): { background: string; borderLeftColor: string } {
  const cat = categories.find((c) => c.id === categoryId);
  const color = cat?.color ?? DEFAULT_EVENT_COLOR;
  return {
    background: `${color}28`,
    borderLeftColor: color,
  };
}

export function MonthCalendar({
  year,
  month,
  schedules,
  categories,
  onEventClick,
  onDateClick,
}: MonthCalendarProps) {
  const firstDay = new Date(year, month - 1, 1);

  /* 月曜始まりのカレンダー範囲 */
  const calStart = startOfWeek(startOfMonth(firstDay), { weekStartsOn: 1 });
  const calEnd = endOfWeek(endOfMonth(firstDay), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const weekCount = days.length / 7;

  function getSchedulesForDay(date: Date): ScheduleEntry[] {
    return schedules.filter((s) => isSameDay(s.startAt, date));
  }

  return (
    <div className="flex flex-col flex-1 bg-surface overflow-hidden">
      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 border-b border-border bg-card shrink-0">
        {DOW_LABELS.map((d, i) => (
          <div
            key={d}
            className={`text-center py-2.5 text-[11px] font-bold tracking-widest ${
              i === 5 ? 'text-purple-l' : i === 6 ? 'text-live' : 'text-muted'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* カレンダーグリッド */}
      <div
        className="flex-1 grid grid-cols-7 overflow-hidden"
        style={{ gridTemplateRows: `repeat(${weekCount}, 1fr)` }}
      >
        {days.map((day) => {
          const isCurrentMonth = isSameMonth(day, firstDay);
          const isCurrentDay = isToday(day);
          const daySchedules = getSchedulesForDay(day);

          return (
            <div
              key={day.toISOString()}
              className={[
                'border-r border-b border-border flex flex-col gap-1 overflow-y-auto p-1.5 transition-colors',
                !isCurrentMonth ? 'opacity-40 bg-bg' : '',
                isCurrentDay ? 'bg-[rgba(127,119,221,0.05)]' : '',
                onDateClick ? 'cursor-pointer' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onDateClick?.(day)}
            >
              {/* 日付番号 */}
              <div className="mb-0.5">
                <span
                  className={[
                    'inline-flex items-center justify-center w-6 h-6 rounded-full text-[12px] font-bold',
                    isCurrentDay ? 'bg-purple-d text-purple-l' : 'text-muted',
                  ].join(' ')}
                >
                  {format(day, 'd')}
                </span>
              </div>

              {/* イベントバー */}
              {daySchedules.map((s) => {
                const style = getEventStyle(s.categoryId, categories);
                return (
                  <button
                    key={s.id}
                    className="w-full text-left px-1.5 h-[25px] rounded-[4px] text-[11px] font-semibold text-white whitespace-nowrap overflow-hidden text-ellipsis shrink-0 border-l-[3px] transition-opacity hover:opacity-80 flex items-center gap-1"
                    style={style}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(s);
                    }}
                    title={s.title}
                  >
                    <span className="opacity-75 shrink-0">{format(s.startAt, 'HH:mm')}</span>
                    <span className="truncate">{s.title}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
