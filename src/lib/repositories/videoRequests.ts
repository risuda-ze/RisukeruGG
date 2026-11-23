import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase/client';
import type { VideoDelivery, VideoRequest } from '@/types/videoRequests';

const functions = getFunctions(undefined, 'asia-northeast1');

function date(value: unknown): Date | null {
  return value instanceof Timestamp ? value.toDate() : null;
}

function deliveries(data: Record<string, unknown>): VideoDelivery[] {
  const records = data.deliveries;
  if (Array.isArray(records)) {
    return records
      .filter(
        (record): record is Record<string, unknown> => typeof record === 'object' && record !== null
      )
      .map((record) => ({
        url: String(record.url ?? ''),
        note: typeof record.note === 'string' ? record.note : null,
      }))
      .filter((record) => Boolean(record.url));
  }
  return ((data.deliveryUrls as string[] | undefined) ?? []).map((url) => ({ url, note: null }));
}

function toVideoRequest(id: string, data: Record<string, unknown>): VideoRequest {
  const discord = (data.discord as Record<string, unknown> | undefined) ?? {};
  return {
    id,
    thumbnailStatus: (data.thumbnailStatus as VideoRequest['thumbnailStatus']) ?? null,
    thumbnailMessageUrl: (data.thumbnailMessageUrl as string | undefined) ?? null,
    teamId: String(data.teamId),
    title: String(data.title),
    editorMemberIds: (data.editorMemberIds as string[] | undefined) ?? [],
    editorDiscordIds: (data.editorDiscordIds as string[] | undefined) ?? [],
    videoType: data.videoType === 'short' ? 'short' : 'long',
    summary: String(data.summary ?? ''),
    projectManagementUrl: (data.projectManagementUrl as string | null | undefined) ?? null,
    notes: (data.notes as string | null | undefined) ?? null,
    titleIdea: (data.titleIdea as string | null | undefined) ?? null,
    startAt: date(data.startAt),
    firstDraftDueAt: date(data.firstDraftDueAt),
    finalPackageDueAt: date(data.finalPackageDueAt),
    ownerResourceUrls: (data.ownerResourceUrls as string[] | undefined) ?? [],
    deliveryUrls: (data.deliveryUrls as string[] | undefined) ?? [],
    deliveries: deliveries(data),
    status: (data.status as VideoRequest['status']) ?? 'pending_discord',
    taskId: String(data.taskId ?? ''),
    taskColumnId: String(data.taskColumnId ?? ''),
    reviewTaskColumnId: String(data.reviewTaskColumnId ?? ''),
    discord: {
      status: (discord.status as VideoRequest['discord']['status']) ?? 'pending',
      editorThreadIds: (discord.editorThreadIds as string[] | undefined) ?? [],
      editorThreadUrls: (discord.editorThreadUrls as string[] | undefined) ?? [],
      editorThreadChannels: (discord.editorThreadChannels as string[] | undefined) ?? [],
      editorThreadPostedChannels:
        (discord.editorThreadPostedChannels as string[] | undefined) ?? [],
      thumbnailThreadId: (discord.thumbnailThreadId as string | null | undefined) ?? null,
      thumbnailThreadUrl: (discord.thumbnailThreadUrl as string | null | undefined) ?? null,
      thumbnailThreadPosted: Boolean(discord.thumbnailThreadPosted),
      expectedThreadCount:
        typeof discord.expectedThreadCount === 'number' ? discord.expectedThreadCount : null,
      error: (discord.error as string | null | undefined) ?? null,
    },
    createdBy: String(data.createdBy),
    createdAt: date(data.createdAt) ?? new Date(0),
    updatedAt: date(data.updatedAt) ?? new Date(0),
  };
}

export function subscribeVideoRequests(
  teamId: string,
  callback: (requests: VideoRequest[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const ref = collection(db, 'teams', teamId, 'videoRequests');
  return onSnapshot(
    query(ref, orderBy('createdAt', 'desc')),
    (snap) => {
      callback(snap.docs.map((d) => toVideoRequest(d.id, d.data() as Record<string, unknown>)));
    },
    onError
  );
}

export const createVideoRequest = httpsCallable<
  {
    teamId: string;
    title: string;
    editorMemberIds?: string[];
    editorDiscordIds?: string[];
    videoType: 'long' | 'short';
    summary: string;
    projectManagementUrl: string | null;
    notes: string | null;
    titleIdea: string | null;
    startAt: string | null;
    firstDraftDueAt: string | null;
    finalPackageDueAt: string | null;
  },
  { videoRequestId: string; taskId: string }
>(functions, 'createVideoRequest');

export const updateVideoRequest = httpsCallable<
  {
    teamId: string;
    videoRequestId: string;
    title: string;
    editorMemberIds?: string[];
    editorDiscordIds?: string[];
    videoType: 'long' | 'short';
    summary: string;
    projectManagementUrl: string | null;
    notes: string | null;
    titleIdea: string | null;
    startAt: string | null;
    firstDraftDueAt: string | null;
    finalPackageDueAt: string | null;
  },
  void
>(functions, 'updateVideoRequest');

export const reviewThumbnail = httpsCallable<
  {
    teamId: string;
    videoRequestId: string;
    action: 'revise' | 'approve';
    message?: string;
  },
  void
>(functions, 'reviewThumbnail');

export const requestVideoRevision = httpsCallable<
  { teamId: string; videoRequestId: string; message: string },
  void
>(functions, 'requestVideoRevision');

export const approveVideoRequest = httpsCallable<{ teamId: string; videoRequestId: string }, void>(
  functions,
  'approveVideoRequest'
);

export const addVideoOwnerResourceUrl = httpsCallable<
  { teamId: string; videoRequestId: string; url: string },
  void
>(functions, 'addVideoOwnerResourceUrl');

export const retryVideoRequestDiscord = httpsCallable<
  { teamId: string; videoRequestId: string },
  void
>(functions, 'retryVideoRequestDiscord');
