import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Unsubscribe,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { ScheduleCategory } from '@/types/entities';

function toCategory(id: string, data: Record<string, unknown>): ScheduleCategory {
  return {
    id,
    name: data.name as string,
    icon: (data.icon as string) ?? 'event',
    color: (data.color as string) ?? '#7F77DD',
    order: (data.order as number) ?? 0,
    createdAt: (data.createdAt as Timestamp).toDate(),
  };
}

export async function createScheduleCategory(
  teamId: string,
  data: Omit<ScheduleCategory, 'id' | 'createdAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'teams', teamId, 'scheduleCategories'), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateScheduleCategory(
  teamId: string,
  categoryId: string,
  data: Partial<Pick<ScheduleCategory, 'name' | 'icon' | 'color' | 'order'>>
): Promise<void> {
  await updateDoc(doc(db, 'teams', teamId, 'scheduleCategories', categoryId), data);
}

export async function deleteScheduleCategory(
  teamId: string,
  categoryId: string
): Promise<void> {
  await deleteDoc(doc(db, 'teams', teamId, 'scheduleCategories', categoryId));
}

export function subscribeScheduleCategories(
  teamId: string,
  callback: (categories: ScheduleCategory[]) => void
): Unsubscribe {
  return onSnapshot(collection(db, 'teams', teamId, 'scheduleCategories'), (snap) => {
    const categories = snap.docs
      .map((d) => toCategory(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => a.order - b.order);
    callback(categories);
  });
}
