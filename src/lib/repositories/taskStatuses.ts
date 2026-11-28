import {
  doc,
  collection,
  addDoc,
  updateDoc,
  onSnapshot,
  Unsubscribe,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { createdFields, updatedFields } from '@/lib/firebase/audit';
import type { TaskStatus } from '@/types/entities';

function toColumn(id: string, data: Record<string, unknown>): TaskStatus {
  return {
    id,
    name: data.name as string,
    order: data.order as number,
    color: data.color as string,
    role: (data.role as 'done' | null) ?? null,
    icon: (data.icon as string | null) ?? null,
    createdAt: (data.createdAt as Timestamp).toDate(),
    createdBy: (data.createdBy as string | null | undefined) ?? null,
    updatedAt: (data.updatedAt as Timestamp | null | undefined)?.toDate() ?? null,
    updatedBy: (data.updatedBy as string | null | undefined) ?? null,
  };
}

export async function createColumn(
  teamId: string,
  data: Omit<TaskStatus, 'id' | 'role' | 'createdAt' | 'icon' | 'createdBy' | 'updatedAt' | 'updatedBy'> & {
    icon?: string | null;
  }
): Promise<string> {
  const ref = await addDoc(collection(db, 'teams', teamId, 'taskStatuses'), {
    ...data,
    role: null,
    ...createdFields(),
  });
  return ref.id;
}

export async function updateColumn(
  teamId: string,
  columnId: string,
  data: Partial<TaskStatus>
): Promise<void> {
  await updateDoc(doc(db, 'teams', teamId, 'taskStatuses', columnId), {
    ...data,
    ...updatedFields(),
  });
}

/** カラムを削除して残タスクを先頭カラムへ移行する（最低1カラム制約） */
export async function deleteColumn(
  teamId: string,
  columnId: string,
  columns: TaskStatus[],
  taskIds: string[]
): Promise<void> {
  if (columns.length <= 1) {
    throw new Error('最低1つのカラムが必要です');
  }

  const fallbackColumn = columns.find((c) => c.id !== columnId);
  if (!fallbackColumn) throw new Error('移行先カラムが見つかりません');

  const batch = writeBatch(db);

  // タスクを先頭カラムへ移行
  for (const taskId of taskIds) {
    batch.update(doc(db, 'teams', teamId, 'tasks', taskId), { columnId: fallbackColumn.id, ...updatedFields() });
  }

  batch.delete(doc(db, 'teams', teamId, 'taskStatuses', columnId));
  await batch.commit();
}

export async function reorderColumns(
  teamId: string,
  columns: { id: string; order: number }[]
): Promise<void> {
  const batch = writeBatch(db);
  for (const col of columns) {
    batch.update(doc(db, 'teams', teamId, 'taskStatuses', col.id), { order: col.order, ...updatedFields() });
  }
  await batch.commit();
}

export function subscribeColumns(
  teamId: string,
  callback: (columns: TaskStatus[]) => void
): Unsubscribe {
  return onSnapshot(collection(db, 'teams', teamId, 'taskStatuses'), (snap) => {
    const cols = snap.docs
      .map((d) => toColumn(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => a.order - b.order);
    callback(cols);
  });
}


