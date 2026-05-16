import { create } from 'zustand';
import { subscribeNotifications } from '@/lib/repositories/notifications';
import type { Notification } from '@/types/entities';

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;

  subscribe: (teamId: string, recipientId: string) => () => void;
  markAllRead: () => void;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
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

  // フェーズ1: Firestore 書き込みなしのローカル state 更新のみ
  // 本実装（Firestore write）は将来の通知機能チケットで行う
  markAllRead: () => {
    set({
      unreadCount: 0,
      notifications: get().notifications.map((n) => ({ ...n, isRead: true })),
    });
  },
}));
