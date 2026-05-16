import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarState {
  collapsed: boolean;
  openSections: string[];
  toggleCollapsed: () => void;
  toggleSection: (label: string) => void;
  openSection: (label: string) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set, get) => ({
      collapsed: false,
      openSections: ['メイン'],

      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),

      toggleSection: (label) => {
        const { openSections } = get();
        const isOpen = openSections.includes(label);
        set({
          openSections: isOpen ? openSections.filter((s) => s !== label) : [...openSections, label],
        });
      },

      openSection: (label) => {
        const { openSections } = get();
        if (!openSections.includes(label)) {
          set({ openSections: [...openSections, label] });
        }
      },
    }),
    { name: 'risukeru-sidebar' }
  )
);
