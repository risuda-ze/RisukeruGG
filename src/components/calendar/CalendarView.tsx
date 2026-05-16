'use client';

import { useCallback } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { ScheduleEntry } from '@/types/entities';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { ja };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: ja }),
  getDay,
  locales,
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: ScheduleEntry;
}

interface CalendarViewProps {
  schedules: ScheduleEntry[];
  view: 'week' | 'month';
  date: Date;
  onViewChange: (view: 'week' | 'month') => void;
  onDateChange: (date: Date) => void;
  onSelectEvent: (schedule: ScheduleEntry) => void;
  onSelectSlot?: (slotInfo: { start: Date; end: Date }) => void;
}

/* ステータス別イベント背景色（デザイントークンに準拠） */
function getEventBgColor(status: string): string {
  if (status === 'live') return 'var(--live)';
  if (status === 'ended') return 'var(--muted)';
  if (status === 'cancelled') return 'var(--border)';
  return 'var(--purple-d)';
}

export function CalendarView({
  schedules,
  view,
  date,
  onViewChange,
  onDateChange,
  onSelectEvent,
  onSelectSlot,
}: CalendarViewProps) {
  const events: CalendarEvent[] = schedules.map((s) => ({
    id: s.id,
    title: s.title,
    start: s.startAt,
    end: s.endAt,
    resource: s,
  }));

  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      onSelectEvent(event.resource);
    },
    [onSelectEvent]
  );

  const eventPropGetter = useCallback((event: CalendarEvent) => {
    return {
      style: {
        backgroundColor: getEventBgColor(event.resource.status),
        border: 'none',
        borderRadius: '6px',
        color: 'var(--text)',
        fontSize: '12px',
      },
    };
  }, []);

  return (
    /* ── ダークテーマ CSS オーバーライド ────────────────────── */
    <div
      className="h-[600px] rounded-lg overflow-hidden border border-border"
      style={{
        /* カレンダー全体背景 */
        ['--' as string]: '',
      }}
    >
      <style>{`
        .rbc-calendar { background: var(--card); color: var(--text); }
        .rbc-header { background: var(--surface); border-color: var(--border); color: var(--muted); font-size: 12px; padding: 8px 4px; }
        .rbc-month-view, .rbc-time-view { border-color: var(--border); }
        .rbc-day-bg, .rbc-time-slot, .rbc-time-header-content, .rbc-time-content { border-color: var(--border) !important; }
        .rbc-off-range-bg { background: var(--bg); }
        .rbc-today { background: rgba(127,119,221,.08); }
        .rbc-selected-cell { background: rgba(127,119,221,.12); }
        .rbc-toolbar { background: var(--surface); padding: 10px 14px; border-bottom: 1px solid var(--border); gap: 8px; flex-wrap: wrap; }
        .rbc-toolbar button { background: var(--card); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 4px 12px; font-size: 12px; transition: background .15s; }
        .rbc-toolbar button:hover { background: var(--surface); }
        .rbc-toolbar button.rbc-active { background: var(--purple-d); color: var(--purple-l); border-color: var(--purple-d); }
        .rbc-toolbar-label { color: var(--text); font-weight: 600; font-size: 14px; }
        .rbc-date-cell { color: var(--muted); font-size: 11px; }
        .rbc-date-cell.rbc-now { color: var(--purple-l); }
        .rbc-show-more { color: var(--purple-l); font-size: 11px; background: transparent; }
        .rbc-current-time-indicator { background: var(--live); }
      `}</style>
      <Calendar
        localizer={localizer}
        events={events}
        view={view as 'week' | 'month'}
        date={date}
        onView={(v) => onViewChange(v as 'week' | 'month')}
        onNavigate={onDateChange}
        onSelectEvent={handleSelectEvent}
        onSelectSlot={onSelectSlot}
        selectable={!!onSelectSlot}
        eventPropGetter={eventPropGetter}
        culture="ja"
        messages={{
          week: '週',
          month: '月',
          today: '今日',
          previous: '前へ',
          next: '次へ',
        }}
      />
    </div>
  );
}
