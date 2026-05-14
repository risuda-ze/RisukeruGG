import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  onSnapshot,
  Unsubscribe,
  Timestamp,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { ScheduleEntry } from '@/types/entities';

function toSchedule(id: string, data: Record<string, unknown>): ScheduleEntry {
  return {
    id,
    title: data.title as string,
    type: data.type as ScheduleEntry['type'],
    startAt: (data.startAt as Timestamp).toDate(),
    endAt: (data.endAt as Timestamp).toDate(),
    platform: (data.platform as ScheduleEntry['platform']) ?? null,
    status: data.status as ScheduleEntry['status'],
    description: (data.description as string) ?? '',
    participantIds: (data.participantIds as string[]) ?? [],
    collabPartnerName: (data.collabPartnerName as string | null) ?? null,
    linkedTaskIds: (data.linkedTaskIds as string[]) ?? [],
    updatedAt: (data.updatedAt as Timestamp).toDate(),
    createdBy: data.createdBy as string,
    createdAt: (data.createdAt as Timestamp).toDate(),
  };
}

export async function createSchedule(
  teamId: string,
  data: Omit<ScheduleEntry, 'id' | 'updatedAt' | 'createdAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'teams', teamId, 'schedules'), {
    ...data,
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** 楽観的ロック: updatedAt が一致しない場合はエラー */
export async function updateSchedule(
  teamId: string,
  scheduleId: string,
  data: Partial<ScheduleEntry>,
  expectedUpdatedAt: Date
): Promise<void> {
  const ref = doc(db, 'teams', teamId, 'schedules', scheduleId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('スケジュールが見つかりません');

    const currentUpdatedAt = (snap.data().updatedAt as Timestamp).toDate();
    if (currentUpdatedAt.getTime() !== expectedUpdatedAt.getTime()) {
      throw new Error('CONFLICT');
    }

    tx.update(ref, { ...data, updatedAt: serverTimestamp() });
  });
}

export async function deleteSchedule(teamId: string, scheduleId: string): Promise<void> {
  await deleteDoc(doc(db, 'teams', teamId, 'schedules', scheduleId));
}

export function subscribeSchedules(
  teamId: string,
  callback: (schedules: ScheduleEntry[]) => void
): Unsubscribe {
  return onSnapshot(collection(db, 'teams', teamId, 'schedules'), (snap) => {
    callback(snap.docs.map((d) => toSchedule(d.id, d.data() as Record<string, unknown>)));
  });
}
