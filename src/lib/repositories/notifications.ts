import {
  doc,
  collection,
  query,
  where,
  onSnapshot,
  Unsubscribe,
  Timestamp,
  updateDoc,
  getCountFromServer,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Notification } from '@/types/entities';

function toNotification(id: string, data: Record<string, unknown>): Notification {
  return {
    id,
    recipientId: data.recipientId as string,
    category: data.category as Notification['category'],
    type: data.type as string,
    title: data.title as string,
    body: data.body as string,
    refType: (data.refType as Notification['refType']) ?? null,
    refId: (data.refId as string | null) ?? null,
    isRead: data.isRead as boolean,
    createdAt: (data.createdAt as Timestamp).toDate(),
  };
}

export function subscribeNotifications(
  teamId: string,
  recipientId: string,
  callback: (notifications: Notification[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'teams', teamId, 'notifications'),
    where('recipientId', '==', recipientId)
  );
  return onSnapshot(q, (snap) => {
    const notifications = snap.docs
      .map((d) => toNotification(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    callback(notifications);
  });
}

export async function markAsRead(teamId: string, notificationId: string): Promise<void> {
  await updateDoc(doc(db, 'teams', teamId, 'notifications', notificationId), { isRead: true });
}

export async function getUnreadCount(teamId: string, recipientId: string): Promise<number> {
  const q = query(
    collection(db, 'teams', teamId, 'notifications'),
    where('recipientId', '==', recipientId),
    where('isRead', '==', false)
  );
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
}
