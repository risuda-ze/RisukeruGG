import { create } from 'zustand';
import { subscribeCategories } from '@/lib/repositories/categories';
import type { Category } from '@/types/entities';

interface CategoryState {
  categories: Category[];
  loading: boolean;
  subscribe: (teamId: string) => () => void;
}

export const useCategoryStore = create<CategoryState>((set) => ({
  categories: [],
  loading: true,

  subscribe: (teamId) => {
    set({ loading: true });
    const unsubscribe = subscribeCategories(teamId, (categories) => {
      set({ categories, loading: false });
    });
    return unsubscribe;
  },
}));
