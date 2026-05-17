import { create } from 'zustand';
import { subscribeScheduleCategories } from '@/lib/repositories/scheduleCategories';
import type { ScheduleCategory } from '@/types/entities';

interface ScheduleCategoryState {
  categories: ScheduleCategory[];
  loading: boolean;
  subscribe: (teamId: string) => () => void;
}

export const useScheduleCategoryStore = create<ScheduleCategoryState>((set) => ({
  categories: [],
  loading: true,

  subscribe: (teamId) => {
    set({ loading: true });
    const unsubscribe = subscribeScheduleCategories(teamId, (categories) => {
      set({ categories, loading: false });
    });
    return unsubscribe;
  },
}));
