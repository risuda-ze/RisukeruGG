import { create } from 'zustand';
import { subscribeTaskCategories } from '@/lib/repositories/taskCategories';
import type { TaskCategory } from '@/types/entities';

interface TaskCategoryState {
  taskCategories: TaskCategory[];
  loading: boolean;
  subscribe: (teamId: string) => () => void;
}

export const useTaskCategoryStore = create<TaskCategoryState>((set) => ({
  taskCategories: [],
  loading: true,

  subscribe: (teamId) => {
    set({ loading: true });
    const unsubscribe = subscribeTaskCategories(teamId, (taskCategories) => {
      set({ taskCategories, loading: false });
    });
    return unsubscribe;
  },
}));
