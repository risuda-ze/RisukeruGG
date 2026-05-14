'use client';

import { useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
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
    const s = event.resource;
    let backgroundColor = '#6366f1';
    if (s.status === 'live') backgroundColor = '#ef4444';
    else if (s.status === 'ended') backgroundColor = '#6b7280';
    else if (s.status === 'cancelled') backgroundColor = '#d1d5db';
    return { style: { backgroundColor } };
  }, []);

  return (
    <div className="h-[600px]">
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
