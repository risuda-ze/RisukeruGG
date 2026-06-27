import {
  collection,
  collectionGroup,
  doc,
  query,
  where,
  orderBy,
  writeBatch,
  getDocs,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { MemberCalendarEvent } from '@/types/entities';

function toMemberCalendarEvent(id: string, data: Record<string, unknown>): MemberCalendarEvent {
  return {
    id,
    title: data.title as string,
    startAt: (data.startAt as Timestamp).toDate(),
    endAt: (data.endAt as Timestamp).toDate(),
    allDay: (data.allDay as boolean) ?? false,
    sourceEventId: data.sourceEventId as string,
    syncedAt: (data.syncedAt as Timestamp | null)?.toDate() ?? new Date(),
    userId: data.userId as string,
    teamId: data.teamId as string,
  };
}

export async function saveMemberCalendarEvents(
  teamId: string,
  userId: string,
  displayName: string,
  events: Array<{ sourceEventId: string; startAt: Date; endAt: Date; allDay: boolean }>
): Promise<void> {
  if (events.length === 0) return;

  const batch = writeBatch(db);
  const now = serverTimestamp();

  for (const event of events) {
    const ref = doc(
      db,
      'teams',
      teamId,
      'memberCalendars',
      userId,
      'events',
      event.sourceEventId
    );
    batch.set(ref, {
      title: `${displayName} の予定`,
      startAt: Timestamp.fromDate(event.startAt),
      endAt: Timestamp.fromDate(event.endAt),
      allDay: event.allDay,
      sourceEventId: event.sourceEventId,
      syncedAt: now,
      userId,
      teamId,
    });
  }

  await batch.commit();
}

export function subscribeMemberCalendarEvents(
  teamId: string,
  callback: (events: MemberCalendarEvent[]) => void
): Unsubscribe {
  return onSnapshot(
    query(collectionGroup(db, 'events'), where('teamId', '==', teamId)),
    (snap) => {
      callback(
        snap.docs.map((d) => toMemberCalendarEvent(d.id, d.data() as Record<string, unknown>))
      );
    },
    (error) => {
      console.error('[memberCalendars] メンバー予定の購読に失敗しました:', error);
    }
  );
}

export async function getMemberCalendarEvents(
  teamId: string,
  userId: string,
  from: Date,
  to: Date
): Promise<MemberCalendarEvent[]> {
  const snap = await getDocs(
    query(
      collection(db, 'teams', teamId, 'memberCalendars', userId, 'events'),
      where('startAt', '>=', Timestamp.fromDate(from)),
      where('startAt', '<=', Timestamp.fromDate(to)),
      orderBy('startAt')
    )
  );
  return snap.docs.map((d) => toMemberCalendarEvent(d.id, d.data() as Record<string, unknown>));
}
