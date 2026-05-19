import {
  doc,
  collection,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Unsubscribe,
  Timestamp,
  runTransaction,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase/client';
import type { Task, CollabComment } from '@/types/entities';

const functions = getFunctions(undefined, 'asia-northeast1');

function toTask(id: string, data: Record<string, unknown>): Task {
  const rawComments = (data.comments as Array<Record<string, unknown>> | null) ?? [];
  const comments: CollabComment[] = rawComments.map((c) => ({
    id: c.id as string,
    authorId: c.authorId as string,
    authorName: c.authorName as string,
    text: c.text as string,
    createdAt: (c.createdAt as Timestamp).toDate(),
    parentId: (c.parentId as string | undefined) ?? undefined,
  }));
  return {
    id,
    title: data.title as string,
    columnId: data.columnId as string,
    categoryId: (data.categoryId as string | null) ?? null,
    description: (data.description as string | null) ?? null,
    assigneeId: (data.assigneeId as string | null) ?? null,
    dueDate: data.dueDate ? (data.dueDate as Timestamp).toDate() : null,
    linkedScheduleId: (data.linkedScheduleId as string | null) ?? null,
    comments,
    updatedAt: (data.updatedAt as Timestamp).toDate(),
    createdBy: data.createdBy as string,
    createdAt: (data.createdAt as Timestamp).toDate(),
  };
}

export const createTask = httpsCallable<
  {
    teamId: string;
    title: string;
    columnId: string;
    categoryId?: string | null;
    assigneeId?: string | null;
    dueDate?: string | null;
    linkedScheduleId?: string | null;
  },
  { taskId: string }
>(functions, 'createTask');

/** 楽観的ロック: updatedAt が一致しない場合はエラー */
export async function updateTask(
  teamId: string,
  taskId: string,
  data: Partial<Task>,
  expectedUpdatedAt?: Date
): Promise<void> {
  const ref = doc(db, 'teams', teamId, 'tasks', taskId);

  if (expectedUpdatedAt) {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('タスクが見つかりません');
      const currentUpdatedAt = (snap.data().updatedAt as Timestamp).toDate();
      if (currentUpdatedAt.getTime() !== expectedUpdatedAt.getTime()) {
        throw new Error('CONFLICT');
      }
      tx.update(ref, { ...data, updatedAt: serverTimestamp() });
    });
  } else {
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  }
}

export async function addTaskComment(
  teamId: string,
  taskId: string,
  comment: { id: string; authorId: string; authorName: string; text: string; createdAt: Timestamp; parentId?: string }
): Promise<void> {
  const ref = doc(db, 'teams', teamId, 'tasks', taskId);
  await updateDoc(ref, { comments: arrayUnion(comment) });
}

export async function deleteTask(teamId: string, taskId: string): Promise<void> {
  await deleteDoc(doc(db, 'teams', teamId, 'tasks', taskId));
}

export function subscribeTasksByTeam(
  teamId: string,
  callback: (tasks: Task[]) => void
): Unsubscribe {
  return onSnapshot(collection(db, 'teams', teamId, 'tasks'), (snap) => {
    callback(snap.docs.map((d) => toTask(d.id, d.data() as Record<string, unknown>)));
  });
}
