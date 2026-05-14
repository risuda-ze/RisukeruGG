import { create } from 'zustand';
import { subscribeSchedules } from '@/lib/repositories/schedules';
import type { ScheduleEntry } from '@/types/entities';

type CalendarView = 'week' | 'month';

interface ScheduleState {
  schedules: ScheduleEntry[];
  currentView: CalendarView;
  selectedDate: Date;
  loading: boolean;

  setView: (view: CalendarView) => void;
  setSelectedDate: (date: Date) => void;
  subscribe: (teamId: string) => () => void;
}

export const useScheduleStore = create<ScheduleState>((set) => ({
  schedules: [],
  currentView: 'week',
  selectedDate: new Date(),
  loading: true,

  setView: (view) => set({ currentView: view }),
  setSelectedDate: (date) => set({ selectedDate: date }),

  subscribe: (teamId) => {
    set({ loading: true });
    const unsubscribe = subscribeSchedules(teamId, (schedules) => {
      set({ schedules, loading: false });
    });
    return unsubscribe;
  },
}));
