import {
  doc,
  collection,
  getDoc,
  updateDoc,
  arrayUnion,
  onSnapshot,
  Unsubscribe,
  Timestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase/client';
import type { CollabSession, CollabParticipant, CollabComment } from '@/types/entities';

function toCollabSession(id: string, data: Record<string, unknown>): CollabSession {
  const responses = data.responses as {
    dates: Record<string, 'ok' | 'ng'>;
    alternativeDates: Timestamp[];
    respondedAt: Timestamp;
    note: string | null;
  } | null;

  const rawComments = (data.comments as Array<Record<string, unknown>> | null) ?? [];
  const comments: CollabComment[] = rawComments.map((c) => ({
    id: c.id as string,
    authorId: c.authorId as string,
    authorName: c.authorName as string,
    text: c.text as string,
    createdAt: (c.createdAt as Timestamp).toDate(),
  }));

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
    content: (data.content as string | null) ?? null,
    participants: (data.participants as CollabParticipant[] | null) ?? [],
    participantResponses:
      (data.participantResponses as Record<string, Record<string, 'ok' | 'ng' | 'pending'>> | null) ??
      {},
    comments,
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

/** 参加者リストを更新 */
export async function updateCollabParticipants(
  teamId: string,
  sessionId: string,
  participants: CollabParticipant[]
): Promise<void> {
  await updateDoc(doc(db, 'teams', teamId, 'collabSessions', sessionId), { participants });
}

/** 内容テキストを更新 */
export async function updateCollabContent(
  teamId: string,
  sessionId: string,
  content: string
): Promise<void> {
  await updateDoc(doc(db, 'teams', teamId, 'collabSessions', sessionId), { content });
}

/** タイトルを更新 */
export async function updateCollabTitle(
  teamId: string,
  sessionId: string,
  title: string
): Promise<void> {
  await updateDoc(doc(db, 'teams', teamId, 'collabSessions', sessionId), { title });
}

/** 候補日程を追加 */
export async function addCollabProposedDate(
  teamId: string,
  sessionId: string,
  date: Date
): Promise<void> {
  await updateDoc(doc(db, 'teams', teamId, 'collabSessions', sessionId), {
    proposedDates: arrayUnion(Timestamp.fromDate(date)),
  });
}

/** コメントを追加 */
export async function addCollabComment(
  teamId: string,
  sessionId: string,
  comment: Omit<CollabComment, 'createdAt'> & { createdAt: Timestamp }
): Promise<void> {
  await updateDoc(doc(db, 'teams', teamId, 'collabSessions', sessionId), {
    comments: arrayUnion(comment),
  });
}

/** 参加者回答を更新 */
export async function updateParticipantResponse(
  teamId: string,
  sessionId: string,
  participantId: string,
  dateIndex: string,
  response: 'ok' | 'ng' | 'pending'
): Promise<void> {
  await updateDoc(doc(db, 'teams', teamId, 'collabSessions', sessionId), {
    [`participantResponses.${participantId}.${dateIndex}`]: response,
  });
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
    respondentName: string;
    dates: Record<string, 'ok' | 'ng' | 'pending'>;
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
