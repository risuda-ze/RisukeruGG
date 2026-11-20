export type VideoRequestStatus =
  | 'pending_discord'
  | 'in_progress'
  | 'review_requested'
  | 'completed';
export type DiscordRequestStatus = 'pending' | 'queued' | 'creating' | 'created' | 'failed';

export interface VideoRequestDiscord {
  status: DiscordRequestStatus;
  editorThreadIds: string[];
  editorThreadUrls: string[];
  thumbnailThreadId: string | null;
  thumbnailThreadUrl: string | null;
  error: string | null;
}

export interface VideoDelivery {
  url: string;
  note: string | null;
}

export interface VideoRequest {
  thumbnailStatus: VideoRequestStatus | null;
  thumbnailMessageUrl: string | null;
  id: string;
  teamId: string;
  title: string;
  /** RisukeruGG上で選択した担当メンバー。Discord IDの手入力を不要にするために保持する。 */
  editorMemberIds: string[];
  editorDiscordIds: string[];
  videoType: 'long' | 'short';
  summary: string;
  projectManagementUrl: string | null;
  notes: string | null;
  titleIdea: string | null;
  startAt: Date | null;
  firstDraftDueAt: Date | null;
  finalPackageDueAt: Date | null;
  /** オーナーが共有するプロジェクトファイル・素材などのリンク。納品URLとは別に扱う。 */
  ownerResourceUrls: string[];
  deliveryUrls: string[];
  /** 納品URLに紐づく編集者からの共有事項。旧データは deliveryUrls から補完する。 */
  deliveries: VideoDelivery[];
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
