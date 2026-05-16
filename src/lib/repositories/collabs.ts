import {
  doc,
  collection,
  getDoc,
  updateDoc,
  onSnapshot,
  Unsubscribe,
  Timestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase/client';
import type { CollabSession } from '@/types/entities';

const functions = getFunctions(undefined, 'asia-northeast1');

function toCollabSession(id: string, data: Record<string, unknown>): CollabSession {
  const responses = data.responses as {
    dates: Record<string, 'ok' | 'ng'>;
    alternativeDates: Timestamp[];
    respondedAt: Timestamp;
    note: string | null;
  } | null;

  return {
    id,
    title: data.title as string,
    partnerName: data.partnerName as string,
    createdBy: data.createdBy as string,
    teamId: data.teamId as string,
    proposedDates: (data.proposedDates as Timestamp[]).map((t) => t.toDate()),
    responses: responses
      ? {
          dates: responses.dates,
          alternativeDates: responses.alternativeDates.map((t) => t.toDate()),
          respondedAt: responses.respondedAt.toDate(),
          note: responses.note,
        }
      : null,
    expiresAt: (data.expiresAt as Timestamp).toDate(),
    status: data.status as CollabSession['status'],
    confirmedDate: data.confirmedDate ? (data.confirmedDate as Timestamp).toDate() : null,
    linkedScheduleId: (data.linkedScheduleId as string | null) ?? null,
    createdAt: (data.createdAt as Timestamp).toDate(),
  };
}

/** 認証不要: 公開コラボページ用 */
export async function getCollabSession(
  teamId: string,
  sessionId: string
): Promise<CollabSession | null> {
  const snap = await getDoc(doc(db, 'teams', teamId, 'collabSessions', sessionId));
  if (!snap.exists()) return null;
  return toCollabSession(snap.id, snap.data() as Record<string, unknown>);
}

export function subscribeCollabSessions(
  teamId: string,
  callback: (sessions: CollabSession[]) => void
): Unsubscribe {
  return onSnapshot(collection(db, 'teams', teamId, 'collabSessions'), (snap) => {
    const sessions = snap.docs
      .map((d) => toCollabSession(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    callback(sessions);
  });
}

export async function updateCollabSession(
  teamId: string,
  sessionId: string,
  data: Partial<CollabSession>
): Promise<void> {
  await updateDoc(
    doc(db, 'teams', teamId, 'collabSessions', sessionId),
    data as Record<string, unknown>
  );
}

export const createCollabSession = httpsCallable<
  {
    teamId: string;
    title: string;
    partnerName: string;
    proposedDates: string[];
    expiresInDays: number;
  },
  { sessionId: string; shareUrl: string }
>(functions, 'createCollabSession');

export const respondToCollab = httpsCallable<
  {
    teamId: string;
    sessionId: string;
    dates: Record<string, 'ok' | 'ng'>;
    alternativeDates?: string[];
    note?: string | null;
  },
  { success: boolean }
>(functions, 'respondToCollab');

export const confirmCollabDate = httpsCallable<
  { teamId: string; sessionId: string; confirmedDate: string },
  { success: boolean }
>(functions, 'confirmCollabDate');

export const cancelCollabSession = httpsCallable<
  { teamId: string; sessionId: string },
  { success: boolean }
>(functions, 'cancelCollabSession');
