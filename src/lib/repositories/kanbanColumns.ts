import {
  doc,
  collection,
  addDoc,
  updateDoc,
  onSnapshot,
  Unsubscribe,
  Timestamp,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { KanbanColumn } from '@/types/entities';

function toColumn(id: string, data: Record<string, unknown>): KanbanColumn {
  return {
    id,
    name: data.name as string,
    order: data.order as number,
    color: data.color as string,
    createdAt: (data.createdAt as Timestamp).toDate(),
  };
}

export async function createColumn(
  teamId: string,
  data: Omit<KanbanColumn, 'id' | 'createdAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'teams', teamId, 'kanbanColumns'), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateColumn(
  teamId: string,
  columnId: string,
  data: Partial<KanbanColumn>
): Promise<void> {
  await updateDoc(doc(db, 'teams', teamId, 'kanbanColumns', columnId), data);
}

/** カラムを削除して残タスクを先頭カラムへ移行する（最低1カラム制約） */
export async function deleteColumn(
  teamId: string,
  columnId: string,
  columns: KanbanColumn[],
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
    batch.update(doc(db, 'teams', teamId, 'tasks', taskId), { columnId: fallbackColumn.id });
  }

  batch.delete(doc(db, 'teams', teamId, 'kanbanColumns', columnId));
  await batch.commit();
}

export async function reorderColumns(
  teamId: string,
  columns: { id: string; order: number }[]
): Promise<void> {
  const batch = writeBatch(db);
  for (const col of columns) {
    batch.update(doc(db, 'teams', teamId, 'kanbanColumns', col.id), { order: col.order });
  }
  await batch.commit();
}

export function subscribeColumns(
  teamId: string,
  callback: (columns: KanbanColumn[]) => void
): Unsubscribe {
  return onSnapshot(collection(db, 'teams', teamId, 'kanbanColumns'), (snap) => {
    const cols = snap.docs
      .map((d) => toColumn(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => a.order - b.order);
    callback(cols);
  });
}
