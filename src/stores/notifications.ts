import { create } from 'zustand';
import { subscribeNotifications } from '@/lib/repositories/notifications';
import type { Notification } from '@/types/entities';

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;

  subscribe: (teamId: string, recipientId: string) => () => void;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  notifications: [],
  unreadCount: 0,
  loading: true,

  subscribe: (teamId, recipientId) => {
    set({ loading: true });
    const unsubscribe = subscribeNotifications(teamId, recipientId, (notifications) => {
      const unreadCount = notifications.filter((n) => !n.isRead).length;
      set({ notifications, unreadCount, loading: false });
    });
    return unsubscribe;
  },
}));
