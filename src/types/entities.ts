export type UserRole = 'owner' | 'editor' | 'viewer';
export type PlanType = 'light' | 'party';
/** @deprecated 新規コードでは TaskCategory インターフェースと categoryId を使用すること */
export type TaskCategoryKey = 'shooting' | 'editing' | 'thumbnail' | 'announcement' | 'other';
export type CollabStatus = 'open' | 'confirmed' | 'expired' | 'cancelled';
export type NotificationCategory = 'collab' | 'tasks' | 'reminders' | 'system';

export const LIGHT_PLAN_LIMITS = {
  maxTeamMembers: 2,
  monthlyTasks: 5,
  monthlyCollabs: 3,
} as const;

// CollabSessionStatusのUI表示名マッピング
export const COLLAB_STATUS_LABELS: Record<CollabStatus, string> = {
  open: '調整中',
  confirmed: '予定決定',
  expired: '終了',
  cancelled: '終了',
} as const;

export interface NotificationPreferences {
  collab: { inApp: boolean; push: boolean };
  tasks: { inApp: boolean; push: boolean };
  reminders: { inApp: boolean; push: boolean };
  system: { inApp: boolean; push: boolean };
}

export interface User {
  uid: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  currentTeamId: string | null;
  plan: PlanType;
  planUpdatedAt: Date;
  monthlyTaskCount: number;
  monthlyCollabCount: number;
  countResetAt: Date;
  createdAt: Date;
  notificationPreferences: NotificationPreferences;
  fcmTokens: string[];
  googleCalendar: {
    connected: boolean;
    syncError: string | null;
    lastSyncedAt: Date | null;
  } | null;
}

export interface TeamMember {
  userId: string;
  role: UserRole;
  displayName: string;
  avatarUrl: string | null;
  plan: PlanType;
  joinedAt: Date;
}

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  teamCode: string;
  createdAt: Date;
}

export interface KanbanColumn {
  id: string;
  name: string;
  order: number;
  color: string;
  /** 完了ステータスとしてマークされたカラムは 'done'、それ以外は null */
  role: 'done' | null;
  createdAt: Date;
}

/** Firestore バック: teams/{teamId}/taskCategories/{categoryId} */
export interface TaskCategory {
  id: string;
  name: string;
  color: string;
  order: number;
  createdAt: Date;
}

export interface ScheduleCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  order: number;
  createdAt: Date;
}

export interface ScheduleEntry {
  id: string;
  title: string;
  categoryId: string | null;
  startAt: Date;
  endAt: Date;
  description: string;
  participantIds: string[];
  collabPartnerName: string | null;
  linkedTaskIds: string[];
  updatedAt: Date;
  createdBy: string;
  createdAt: Date;
  /** Googleカレンダーから取得した予定は 'google'、チーム予定は undefined */
  source?: 'google';
}

export interface Task {
  id: string;
  title: string;
  columnId: string;
  /** Firestore カテゴリID。TaskCategory インターフェース参照。未設定は null */
  categoryId: string | null;
  /** タスク詳細説明。既存ドキュメントは null にフォールバック */
  description: string | null;
  assigneeId: string | null;
  dueDate: Date | null;
  linkedScheduleId: string | null;
  /** チーム内コメント（CollabComment と同一構造） */
  comments?: CollabComment[];
  updatedAt: Date;
  createdBy: string;
  createdAt: Date;
}

// コラボ調整の参加者（チームメンバーまたは外部）
export interface CollabParticipant {
  id: string;
  name: string;
  type: 'member' | 'external';
}

// コラボ調整内のチームコメント
export interface CollabComment {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: Date;
}

export interface CollabSession {
  id: string;
  title: string;
  partnerName: string;
  createdBy: string;
  teamId: string;
  proposedDates: Date[];
  responses: {
    dates: Record<string, 'ok' | 'ng'>;
    alternativeDates: Date[];
    respondedAt: Date;
    note: string | null;
  } | null;
  expiresAt: Date;
  status: CollabStatus;
  confirmedDate: Date | null;
  linkedScheduleId: string | null;
  createdAt: Date;
  // 拡張フィールド（任意）
  content?: string | null;
  participants?: CollabParticipant[];
  participantResponses?: Record<string, Record<string, 'ok' | 'ng' | 'pending'>>;
  comments?: CollabComment[];
}

export interface Notification {
  id: string;
  recipientId: string;
  category: NotificationCategory;
  type: string;
  title: string;
  body: string;
  refType: 'schedule' | 'task' | 'collab' | 'team' | null;
  refId: string | null;
  isRead: boolean;
  createdAt: Date;
}
