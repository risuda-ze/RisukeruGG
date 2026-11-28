import {
  doc,
  collection,
  updateDoc,
  onSnapshot,
  Unsubscribe,
  Timestamp,
  runTransaction,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase/client';
import { updatedFields } from '@/lib/firebase/audit';
import type { Task } from '@/types/entities';

const functions = getFunctions(undefined, 'asia-northeast1');

function toTask(id: string, data: Record<string, unknown>): Task {
  return {
    id,
    title: data.title as string,
    columnId: data.columnId as string,
    categoryId: (data.categoryId as string | null) ?? null,
    description: (data.description as string | null) ?? null,
    assigneeId: (data.assigneeId as string | null) ?? null,
    dueDate: data.dueDate ? (data.dueDate as Timestamp).toDate() : null,
    dueDateAllDay: (data.dueDateAllDay as boolean | undefined) ?? true,
    linkedScheduleId: (data.linkedScheduleId as string | null) ?? null,
    updatedAt: (data.updatedAt as Timestamp).toDate(),
    createdBy: data.createdBy as string,
    updatedBy: (data.updatedBy as string | null | undefined) ?? null,
    createdAt: (data.createdAt as Timestamp).toDate(),
  };
}

export const createTask = httpsCallable<
  {
    teamId: string;
    title: string;
    columnId: string;
    categoryId?: string | null;
    description?: string | null;
    assigneeId?: string | null;
    dueDate?: string | null;
    /** 締切日が終日かどうか（false = 時刻あり）。デフォルト true */
    dueDateAllDay?: boolean;
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
      tx.update(ref, { ...data, ...updatedFields() });
    });
  } else {
    await updateDoc(ref, { ...data, ...updatedFields() });
  }
}

const _deleteTask = httpsCallable<{ teamId: string; taskId: string }, void>(
  functions,
  'deleteTask'
);

/** 動画依頼に紐づくタスクでは、対応する動画依頼カードも同時に削除する。 */
export async function deleteTask(teamId: string, taskId: string): Promise<void> {
  await _deleteTask({ teamId, taskId });
}

export function subscribeTasksByTeam(
  teamId: string,
  callback: (tasks: Task[]) => void
): Unsubscribe {
  /* 参照安定化: 変更のないタスクは前回の Task オブジェクトを再利用する。
     onSnapshot 毎に全ドキュメントを toTask で再生成すると、内容が同じでも
     参照が変わり memo 化した TaskCard が全て再レンダリングされてしまうため、
     docChanges() で変更があったドキュメントだけを再生成し、それ以外は
     キャッシュ済みの参照を使い回す。 */
  const cache = new Map<string, Task>();
  /* この端末の書き込み直後は updatedAt（serverTimestamp）がサーバーで確定しておらず、既定の読み方では null になる。
     確定するまでは直前の確定値で読む。楽観的ロックはサーバーの updatedAt と比べるため、推定値（estimate）では
     確定までの間かならず不一致になる。直前の値なら、書き込みがサーバーに届くまでは一致し、届いた後は不一致になる。
     確定すると modified が届き、確定値に置き換わる。 */
  const read = (d: QueryDocumentSnapshot) =>
    toTask(d.id, d.data({ serverTimestamps: 'previous' }) as Record<string, unknown>);
  return onSnapshot(collection(db, 'teams', teamId, 'tasks'), (snap) => {
    for (const change of snap.docChanges()) {
      if (change.type === 'removed') {
        cache.delete(change.doc.id);
      } else {
        // added / modified: 該当ドキュメントのみ再生成
        cache.set(change.doc.id, read(change.doc));
      }
    }
    // 現在のスナップショット順で並べつつ、未変更ドキュメントは参照を維持
    const tasks = snap.docs.map((d) => cache.get(d.id) ?? read(d));
    callback(tasks);
  });
}
