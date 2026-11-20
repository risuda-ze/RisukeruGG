export type UserRole = 'operator' | 'member' | 'rom';
export type PlanType = 'light' | 'party';
/** @deprecated 新規コードでは Category インターフェースと categoryId を使用すること */
export type TaskCategoryKey = 'shooting' | 'editing' | 'thumbnail' | 'announcement' | 'other';
export type CollabStatus = 'open' | 'confirmed' | 'expired' | 'cancelled';

export const LIGHT_PLAN_LIMITS = {
  maxTeamMembers: 2,
  monthlyTasks: 5,
  monthlyCollabs: 3,
  /** 同時進行中（open）のコラボ調整の上限 */
  maxActiveCollabs: 5,
} as const;

// CollabSessionStatusのUI表示名マッピング
export const COLLAB_STATUS_LABELS: Record<CollabStatus, string> = {
  open: '募集中',
  confirmed: '確定',
  expired: '終了',
  cancelled: '終了',
} as const;

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
  /** Stripe の Customer ID（T4）。課金導線を一度も通っていない場合は null。 */
  stripeCustomerId?: string | null;
  monthlyTaskCount: number;
  monthlyCollabCount: number;
  countResetAt: Date;
  createdAt: Date;
  /** Google カレンダー書き出しの状態。キーは teamId（SC-008 系） */
  googleCalendarExports?: Record<string, GoogleCalendarExport>;
  deleted?: boolean;
  deletedAt?: Date | null;
}

/** チームごとの Google カレンダー書き出し状態 */
export interface GoogleCalendarExport {
  /** 書き出し先の専用副カレンダー ID。再書き出しで同じカレンダーへ書くために使う */
  calendarId: string;
  /** 最終書き出し日時。一度も完了していなければ null */
  exportedAt: Date | null;
}

/** 担当分野の候補（固定。チームごとの追加・変更はできない） */
export const MEMBER_DUTIES = [
  'cast',
  'planning',
  'edit',
  'thumbnail',
  'moderation',
  'other',
] as const;
export type MemberDuty = (typeof MEMBER_DUTIES)[number];

export const MEMBER_DUTY_LABELS: Record<MemberDuty, string> = {
  cast: '出演',
  planning: '企画',
  edit: '編集',
  thumbnail: 'サムネ',
  moderation: '配信サポート',
  other: 'その他',
};

export const MEMBER_NOTE_MAX = 100;

export interface TeamMember {
  userId: string;
  role: UserRole;
  displayName: string;
  avatarUrl: string | null;
  plan: PlanType;
  joinedAt: Date;
  /**
   * Discord のユーザー名（`@` の後ろの一意な名前）。メンション用に本人またはオペレーターが任意で登録する。
   * 未登録は null。ログイン連携ではなく、送信時に Bot がサーバー内検索で ID に解決する（TE-012）
   */
  discordUsername: string | null;
  /** `discordUsername` をサーバー内検索で解決した Discord ユーザー ID のキャッシュ。ユーザー名変更時は null に戻す */
  discordUserId: string | null;
  /** 担当分野（TE-014）。候補は `MEMBER_DUTIES`。重複なし。未設定は [] */
  duties: MemberDuty[];
  /** ひとこと（TE-014）。100 字以内・改行なし。未設定は null */
  note: string | null;
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

/**
 * タスクとスケジュールで共有する統合カテゴリ。
 * Firestore バック: teams/{teamId}/categories/{categoryId}
 */
export interface Category {
  id: string;
  name: string;
  color: string;
  order: number;
  /** Material Icons 名。任意（未設定は null） */
  icon: string | null;
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
  /** 終日フラグ。後方互換のため optional（未設定は false 扱い） */
  allDay?: boolean;
}

export interface Task {
  id: string;
  title: string;
  columnId: string;
  /** Firestore カテゴリID。Category インターフェース参照。未設定は null */
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
    dates: Record<string, 'ok' | 'ng' | 'maybe'>;
    alternativeDates: Date[];
    respondedAt: Date;
    note: string | null;
  } | null;
  expiresAt: Date;
  status: CollabStatus;
  confirmedDate: Date | null;
  linkedScheduleId: string | null;
  createdAt: Date;
  updatedBy?: string;
  updatedAt?: Date;
  // 拡張フィールド（任意）
  icon?: string | null;
  content?: string | null;
  participants?: CollabParticipant[];
  participantResponses?: Record<string, Record<string, 'ok' | 'ng' | 'maybe' | 'pending'>>;
  comments?: CollabComment[];
}

// teams/{teamId}/discord/config サブコレクションの型
// Team インターフェースには追加しない（サブコレクション方式で operator のみアクセス制限するため）
export interface DiscordTeamConfig {
  webhookUrl: string; // Sprint 1 のみ使用。guildId 設定後は Bot 通知が優先される
  guildId?: string; // DiscordサーバーID（Bot 招待完了後に書き込む）
  channelId?: string; // Bot 通知先チャンネルID（Bot 招待完了後に書き込む）
  channelName?: string; // 通知先チャンネル名（表示用。旧データには存在しない場合がある）
  notifyOnTaskCreate: boolean; // タスク作成時に通知（Discord 経由の作成は除く）
  notifyOnTaskUpdate: boolean; // タスク変更時に通知（主要フィールドの変更のみ）
  notifyOnCollabCreate: boolean; // コラボ調整作成時に通知
  notifyOnCollabResponse: boolean; // コラボ調整への回答時に通知
  notifyBefore1h: boolean; // スケジュール開始1時間前にリマインダー通知
  notifyBefore15min: boolean; // スケジュール開始15分前にリマインダー通知
  /* ── タスク管理 v2（ブリーフ）連携（IN-023〜） ── */
  briefThreadsEnabled?: boolean; // ブリーフごとにスレッドを立てる（既定 true）
  briefChannelId?: string; // スレッドの親チャンネル。未設定は channelId
  briefChannelName?: string;
  digestEnabled?: boolean; // 朝ダイジェスト（既定 true）
  digestChannelId?: string; // ダイジェスト送信先。未設定は channelId
  digestChannelName?: string;
  digestTime?: string; // 'HH:00'（JST）。既定 '09:00'
}

/** チームの定型指示（AI 設定。AI-023）。Web ではチップ、Discord では /risukerugg の preset 候補になる */
export interface AiPreset {
  id: string;
  name: string;
  body: string;
}

/** teams/{teamId}/ai/settings（AI-022 / AI-023）。閲覧はメンバー、編集はオペレーター */
export interface TeamAiSettings {
  /** 全能力のプロンプトに共通で注入する追加指示（1,000 文字以内） */
  teamInstructions: string;
  /** 定型指示（最大 10 件） */
  presets: AiPreset[];
  updatedAt: Date | null;
}

// discord_sessions/{guildId} の型（Sprint 3 AI ボット用）
// セッションはサーバー単位で管理する。
export interface DiscordSession {
  guildId: string; // DiscordサーバーID（セッションキー）
  teamId: string; // 対応するRisukeruGGチームID
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  // 確認待ちの %%PROPOSAL%% データ（1応答に複数ブロックがある場合は全件保持する）
  pendingProposals?: Array<Record<string, unknown>>;
  // プロポーザルを発行した Discord ユーザーの ID。confirm/revise/cancel を本人以外が
  // 操作できないようにするためのバインドキー。
  initiatorDiscordUserId?: string;
  updatedAt: Date; // 30分無操作でセッション自動リセット（sessionManager 側で判定）
}
