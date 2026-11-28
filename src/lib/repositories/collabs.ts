import {
  doc,
  collection,
  addDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  Unsubscribe,
  Timestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase/client';
import { updatedFields } from '@/lib/firebase/audit';
import type { CollabSession, CollabParticipant, CollabComment } from '@/types/entities';

function toCollabSession(id: string, data: Record<string, unknown>): CollabSession {
  const responses = data.responses as {
    dates: Record<string, 'ok' | 'ng' | 'maybe'>;
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
    updatedBy: (data.updatedBy as string | undefined) ?? undefined,
    updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate() : undefined,
    icon: (data.icon as string | null) ?? null,
    content: (data.content as string | null) ?? null,
    participants: (data.participants as CollabParticipant[] | null) ?? [],
    participantResponses:
      (data.participantResponses as Record<string, Record<string, 'ok' | 'ng' | 'maybe' | 'pending'>> | null) ??
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

/** セッションを更新。updatedBy/updatedAt は自動セット（updatedByUid を省略するとログイン中のユーザー） */
export async function updateCollabSession(
  teamId: string,
  sessionId: string,
  data: Partial<CollabSession>,
  updatedByUid?: string
): Promise<void> {
  await updateDoc(doc(db, 'teams', teamId, 'collabSessions', sessionId), {
    ...(data as Record<string, unknown>),
    ...updatedFields(updatedByUid),
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

export const reopenCollabSession = httpsCallable<
  { teamId: string; sessionId: string },
  { success: boolean }
>(functions, 'reopenCollabSession');

const createCollabSessionDraftFn = httpsCallable<
  {
    teamId: string;
    title: string;
    content?: string;
    participants: CollabParticipant[];
    proposedDates: string[];
    icon?: string;
  },
  { sessionId: string }
>(functions, 'createCollabSessionDraft');

/**
 * セッションを新規作成（open 状態で作成）。
 * 作成はセキュリティルール上 Cloud Function 経由のみ許可されるため、createdBy は
 * サーバーが認証情報から設定する（クライアントからは渡さない）。
 */
export async function createCollabSessionDraft(
  teamId: string,
  data: {
    title: string;
    content?: string;
    participants: CollabParticipant[];
    proposedDates: Date[];
    icon?: string;
  }
): Promise<string> {
  const res = await createCollabSessionDraftFn({
    teamId,
    title: data.title,
    content: data.content,
    participants: data.participants,
    proposedDates: data.proposedDates.map((d) => d.toISOString()),
    icon: data.icon,
  });
  return res.data.sessionId;
}

