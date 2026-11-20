export type VideoRequestStatus = 'pending_discord' | 'in_progress' | 'review_requested' | 'completed';
export type DiscordRequestStatus = 'pending' | 'created' | 'failed';

export interface VideoRequestDiscord {
  status: DiscordRequestStatus;
  editorThreadIds: string[];
  editorThreadUrls: string[];
  thumbnailThreadId: string | null;
  thumbnailThreadUrl: string | null;
  error: string | null;
}

export interface VideoRequest {
  id: string;
  teamId: string;
  title: string;
  editorDiscordIds: string[];
  videoType: 'long' | 'short';
  summary: string;
  projectManagementUrl: string | null;
  notes: string | null;
  titleIdea: string | null;
  startAt: Date | null;
  firstDraftDueAt: Date | null;
  finalPackageDueAt: Date | null;
  deliveryUrls: string[];
  status: VideoRequestStatus;
  taskId: string;
  taskColumnId: string;
  reviewTaskColumnId: string;
  discord: VideoRequestDiscord;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export const VIDEO_REQUEST_STATUS_LABELS: Record<VideoRequestStatus, string> = {
  pending_discord: 'Discord作成待ち',
  in_progress: '作業中',
  review_requested: '見てくれぃ',
  completed: '完了',
};
