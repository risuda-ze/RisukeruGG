import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  writeBatch,
  query,
  where,
  getDocs,
  Unsubscribe,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { createdFields, updatedFields } from '@/lib/firebase/audit';
import type { Category } from '@/types/entities';

function toCategory(id: string, data: Record<string, unknown>): Category {
  return {
    id,
    name: data.name as string,
    color: (data.color as string) ?? '#7F77DD',
    order: (data.order as number) ?? 0,
    icon: (data.icon as string | null) ?? null,
    createdAt: (data.createdAt as Timestamp).toDate(),
    createdBy: (data.createdBy as string | null | undefined) ?? null,
    updatedAt: (data.updatedAt as Timestamp | null | undefined)?.toDate() ?? null,
    updatedBy: (data.updatedBy as string | null | undefined) ?? null,
  };
}

export async function createCategory(
  teamId: string,
  data: Omit<Category, 'id' | 'createdAt' | 'icon' | 'createdBy' | 'updatedAt' | 'updatedBy'> & {
    icon?: string | null;
  }
): Promise<string> {
  const ref = await addDoc(collection(db, 'teams', teamId, 'categories'), {
    ...data,
    icon: data.icon ?? null,
    ...createdFields(),
  });
  return ref.id;
}

export async function updateCategory(
  teamId: string,
  categoryId: string,
  data: Partial<Pick<Category, 'name' | 'color' | 'order' | 'icon'>>
): Promise<void> {
  await updateDoc(doc(db, 'teams', teamId, 'categories', categoryId), {
    ...data,
    ...updatedFields(),
  });
}

/**
 * カテゴリ削除時は、このカテゴリを参照しているタスクとスケジュール両方の
 * categoryId を null に一括更新してから削除する。
 */
export async function deleteCategory(teamId: string, categoryId: string): Promise<void> {
  const batch = writeBatch(db);

  const tasksRef = collection(db, 'teams', teamId, 'tasks');
  const taskSnap = await getDocs(query(tasksRef, where('categoryId', '==', categoryId)));
  for (const taskDoc of taskSnap.docs) {
    batch.update(taskDoc.ref, { categoryId: null, ...updatedFields() });
  }

  const schedulesRef = collection(db, 'teams', teamId, 'schedules');
  const scheduleSnap = await getDocs(query(schedulesRef, where('categoryId', '==', categoryId)));
  for (const scheduleDoc of scheduleSnap.docs) {
    batch.update(scheduleDoc.ref, { categoryId: null, ...updatedFields() });
  }

  batch.delete(doc(db, 'teams', teamId, 'categories', categoryId));
  await batch.commit();
}

export function subscribeCategories(
  teamId: string,
  callback: (categories: Category[]) => void
): Unsubscribe {
  return onSnapshot(collection(db, 'teams', teamId, 'categories'), (snap) => {
    const categories = snap.docs
      .map((d) => toCategory(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => a.order - b.order);
    callback(categories);
  });
}
