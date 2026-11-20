import { collection, onSnapshot, orderBy, query, Timestamp, type Unsubscribe } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase/client';
import type { VideoRequest } from '@/types/videoRequests';

const functions = getFunctions(undefined, 'asia-northeast1');

function date(value: unknown): Date | null {
  return value instanceof Timestamp ? value.toDate() : null;
}

function toVideoRequest(id: string, data: Record<string, unknown>): VideoRequest {
  const discord = (data.discord as Record<string, unknown> | undefined) ?? {};
  return {
    id,
    teamId: String(data.teamId),
    title: String(data.title),
    editorDiscordIds: (data.editorDiscordIds as string[] | undefined) ?? [],
    videoType: data.videoType === 'short' ? 'short' : 'long',
    summary: String(data.summary ?? ''),
    projectManagementUrl: (data.projectManagementUrl as string | null | undefined) ?? null,
    notes: (data.notes as string | null | undefined) ?? null,
    titleIdea: (data.titleIdea as string | null | undefined) ?? null,
    startAt: date(data.startAt),
    firstDraftDueAt: date(data.firstDraftDueAt),
    finalPackageDueAt: date(data.finalPackageDueAt),
    deliveryUrls: (data.deliveryUrls as string[] | undefined) ?? [],
    status: (data.status as VideoRequest['status']) ?? 'pending_discord',
    taskId: String(data.taskId ?? ''),
    taskColumnId: String(data.taskColumnId ?? ''),
    reviewTaskColumnId: String(data.reviewTaskColumnId ?? ''),
    discord: {
      status: (discord.status as VideoRequest['discord']['status']) ?? 'pending',
      editorThreadIds: (discord.editorThreadIds as string[] | undefined) ?? [],
      editorThreadUrls: (discord.editorThreadUrls as string[] | undefined) ?? [],
      thumbnailThreadId: (discord.thumbnailThreadId as string | null | undefined) ?? null,
      thumbnailThreadUrl: (discord.thumbnailThreadUrl as string | null | undefined) ?? null,
      error: (discord.error as string | null | undefined) ?? null,
    },
    createdBy: String(data.createdBy),
    createdAt: date(data.createdAt) ?? new Date(0),
    updatedAt: date(data.updatedAt) ?? new Date(0),
  };
}

export function subscribeVideoRequests(teamId: string, callback: (requests: VideoRequest[]) => void): Unsubscribe {
  const ref = collection(db, 'teams', teamId, 'videoRequests');
  return onSnapshot(query(ref, orderBy('createdAt', 'desc')), (snap) => {
    callback(snap.docs.map((d) => toVideoRequest(d.id, d.data() as Record<string, unknown>)));
  });
}

export const createVideoRequest = httpsCallable<{
  teamId: string; title: string; editorDiscordIds: string[]; videoType: 'long' | 'short'; summary: string;
  projectManagementUrl: string | null; notes: string | null; titleIdea: string | null; startAt: string | null;
  firstDraftDueAt: string | null; finalPackageDueAt: string | null; taskColumnId: string; reviewTaskColumnId: string;
}, { videoRequestId: string; taskId: string }>(functions, 'createVideoRequest');

export const requestVideoRevision = httpsCallable<{ teamId: string; videoRequestId: string; message: string }, void>(
  functions,
  'requestVideoRevision'
);

export const approveVideoRequest = httpsCallable<{ teamId: string; videoRequestId: string }, void>(
  functions,
  'approveVideoRequest'
);
