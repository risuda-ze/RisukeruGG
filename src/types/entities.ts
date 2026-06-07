export type UserRole = 'operator' | 'member' | 'rom';
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
  /** 所属している全チームの ID リスト。複数チーム同時所属をサポート */
  teamIds: string[];
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
  deleted?: boolean;
  deletedAt?: Date | null;
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
  operatorUids: string[];
  teamCode: string;
  createdAt: Date;
}

export interface TaskStatus {
  id: string;
  name: string;
  order: number;
  color: string;
  /** 完了ステータスとしてマークされたカラムは 'done'、それ以外は null */
  role: 'done' | null;
  /** Material Icons 名。未設定は null */
  icon: string | null;
  createdAt: Date;
}

/** Firestore バック: teams/{teamId}/taskCategories/{categoryId} */
export interface TaskCategory {
  id: string;
  name: string;
  color: string;
  order: number;
  /** Material Icons 名。未設定は null */
  icon: string | null;
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
  /** Googleカレンダーから取得した予定は 'google'、メンバーのFirestore同期予定は 'member'、チーム予定は undefined */
  source?: 'google' | 'member';
  /** 終日フラグ。後方互換のため optional（未設定は false 扱い） */
  allDay?: boolean;
}

/** Googleカレンダーから同期してFirestoreに保存したメンバーの予定エントリ */
export interface MemberCalendarEvent {
  id: string;
  title: string;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  sourceEventId: string;
  syncedAt: Date;
  userId: string;
  teamId: string;
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
  /**
   * 締切日が終日かどうか。
   * true（またはフィールド未設定）: 日付のみ（時刻無視）
   * false: 日時で指定（dueDate の時刻を使用）
   * 後方互換のため optional — 未設定は true として扱う
   */
  dueDateAllDay?: boolean;
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
  /** 返信先コメントの ID。未設定はルートコメント、設定済みは返信（1階層のみ） */
  parentId?: string;
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
  icon?: string | null;
  content?: string | null;
  participants?: CollabParticipant[];
  participantResponses?: Record<string, Record<string, 'ok' | 'ng' | 'pending'>>;
  comments?: CollabComment[];
}

// teams/{teamId}/discord/config サブコレクションの型
// Team インターフェースには追加しない（サブコレクション方式で operator のみアクセス制限するため）
export interface DiscordTeamConfig {
  webhookUrl: string;        // Sprint 1 のみ使用。guildId 設定後は Bot 通知が優先される
  guildId?: string;          // DiscordサーバーID（Bot 招待完了後に書き込む）
  channelId?: string;        // Bot 通知先チャンネルID（Bot 招待完了後に書き込む）
  notifyOnCreate: boolean;   // スケジュール作成時に通知
  notifyBefore1h: boolean;   // 1時間前リマインダー
  notifyBefore15min: boolean; // 15分前リマインダー
}

// discord_sessions/{guildId} の型（Sprint 3 AI ボット用）
// セッションはサーバー単位で管理する。
export interface DiscordSession {
  guildId: string;    // DiscordサーバーID（セッションキー）
  teamId: string;     // 対応するRisukeruGGチームID
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  pendingProposal?: Record<string, unknown>;  // 確認待ちの %%PROPOSAL%% データ
  // プロポーザルを発行した Discord ユーザーの ID。confirm/revise/cancel を本人以外が
  // 操作できないようにするためのバインドキー。
  initiatorDiscordUserId?: string;
  updatedAt: Date;  // 30分無操作でセッション自動リセット（sessionManager 側で判定）
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


