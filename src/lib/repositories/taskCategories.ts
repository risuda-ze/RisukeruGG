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
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { TaskCategory } from '@/types/entities';

function toTaskCategory(id: string, data: Record<string, unknown>): TaskCategory {
  return {
    id,
    name: data.name as string,
    color: (data.color as string) ?? '#7F77DD',
    order: (data.order as number) ?? 0,
    createdAt: (data.createdAt as Timestamp).toDate(),
  };
}

export async function createTaskCategory(
  teamId: string,
  data: Omit<TaskCategory, 'id' | 'createdAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'teams', teamId, 'taskCategories'), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTaskCategory(
  teamId: string,
  categoryId: string,
  data: Partial<Pick<TaskCategory, 'name' | 'color' | 'order'>>
): Promise<void> {
  await updateDoc(doc(db, 'teams', teamId, 'taskCategories', categoryId), data);
}

/** カテゴリ削除時は関連タスクの categoryId を null に一括更新 */
export async function deleteTaskCategory(teamId: string, categoryId: string): Promise<void> {
  const batch = writeBatch(db);

  // 削除対象カテゴリを参照しているタスクを検索して categoryId を null に更新
  const tasksRef = collection(db, 'teams', teamId, 'tasks');
  const q = query(tasksRef, where('categoryId', '==', categoryId));
  const snap = await getDocs(q);
  for (const taskDoc of snap.docs) {
    batch.update(taskDoc.ref, { categoryId: null });
  }

  batch.delete(doc(db, 'teams', teamId, 'taskCategories', categoryId));
  await batch.commit();
}

export function subscribeTaskCategories(
  teamId: string,
  callback: (categories: TaskCategory[]) => void
): Unsubscribe {
  return onSnapshot(collection(db, 'teams', teamId, 'taskCategories'), (snap) => {
    const categories = snap.docs
      .map((d) => toTaskCategory(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => a.order - b.order);
    callback(categories);
  });
}
