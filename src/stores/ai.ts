import { create } from 'zustand';

interface AIState {
  extractOpen: boolean;
  chatOpen: boolean;
  openExtract: () => void;
  closeExtract: () => void;
  toggleChat: () => void;
  closeChat: () => void;
}

export const useAIStore = create<AIState>((set) => ({
  extractOpen: false,
  chatOpen: false,
  openExtract: () => set({ extractOpen: true }),
  closeExtract: () => set({ extractOpen: false }),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
  closeChat: () => set({ chatOpen: false }),
}));
