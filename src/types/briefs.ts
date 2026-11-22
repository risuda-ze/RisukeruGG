/**
 * タスク管理 v2（1枚紙）のエンティティ定義。
 *
 * 正本: docs/仕様・計画/production/model.md
 * Firestore 配置:
 *   teams/{teamId}/playbooks/{playbookId}
 *   teams/{teamId}/briefs/{briefId}
 *   teams/{teamId}/briefs/{briefId}/steps/{stepId}
 *   teams/{teamId}/briefs/{briefId}/steps/{stepId}/comments/{commentId}
 *   teams/{teamId}/briefs/{briefId}/briefEvents/{eventId}
 */

/** 工程・見出しに置く入力項目の型 */
export type FieldType = 'text' | 'url' | 'number' | 'date' | 'select';

/** 入力項目の定義（進め方に保持し、生成時に工程へ複製する） */
export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  /** type = select のときの選択肢 */
  options?: string[];
  required: boolean;
  /** この情報を出す人の役割。入力待ちの催促先の推定に使う。未指定は null */
  ownerRoleLabel: string | null;
}

/** 進め方の中の工程の型 */
export interface StepDef {
  /** 進め方内で一意なキー（学習・差分の突合に使う） */
  key: string;
  title: string;
  /** 例: 「編集」「サムネ」「出演者」 */
  roleLabel: string | null;
  defaultAssigneeId: string | null;
  /** 公開予定日の何日前を締切とするか */
  leadDays: number;
  /** 先行工程の key。空なら最初から着手可能 */
  dependsOn: string[];
  requiredFields: FieldDef[];
  /** 締切の何日前にメンションするか */
  reminderDaysBefore: number;
  /** 飛ばせる工程か */
  optional: boolean;
}

export type PlaybookOrigin = 'dialogue' | 'manual' | 'derived';

export interface Playbook {
  id: string;
  name: string;
  /** 更新のたびに +1。ブリーフは生成時の版を記録する */
  version: number;
  origin: PlaybookOrigin;
  headerFields: FieldDef[];
  steps: StepDef[];
  createdAt: Date;
  updatedAt: Date;
  /** 作成者・最終更新者の uid。記録のない既存データは null */
  createdBy?: string | null;
  updatedBy?: string | null;
}

export type BriefStatus = 'planning' | 'in_progress' | 'published' | 'archived';

export interface BriefDiscordLink {
  threadId: string;
  summaryMessageId: string;
  channelId: string;
}

export interface Brief {
  id: string;
  teamId: string;
  title: string;
  playbookId: string | null;
  playbookVersion: number | null;
  /** 公開予定日（日付のみ）。全工程の締切の基準 */
  publishAt: Date | null;
  status: BriefStatus;
  performerIds: string[];
  /** 見出し項目の定義（生成時に進め方から複製） */
  headerFields: FieldDef[];
  /** 見出し項目の値 */
  fields: Record<string, unknown>;
  linkedScheduleId: string | null;
  /** Discord 連携（B-2）。未連携は null */
  discord: BriefDiscordLink | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  /** 最終更新者の uid。Discord 経由は 'discord-bot'、システムは 'system'。記録のない既存データは null */
  updatedBy: string | null;
}

export type StepStatus = 'waiting' | 'ready' | 'in_progress' | 'done' | 'skipped';

export interface Step {
  id: string;
  briefId: string;
  /** コレクショングループ検索用（自分の工程一覧・ダイジェスト） */
  teamId: string;
  /** StepDef の key。手追加は `custom_*` */
  key: string;
  title: string;
  order: number;
  status: StepStatus;
  assigneeId: string | null;
  dueDate: Date | null;
  /** 手で締切を変えた場合 true。公開日変更時の再計算から除外 */
  dueDateOverridden: boolean;
  leadDays: number;
  dependsOn: string[];
  requiredFields: FieldDef[];
  fields: Record<string, unknown>;
  reminderDaysBefore: number;
  optional: boolean;
  completedAt: Date | null;
  completedBy: string | null;
  /** 着手可能通知メッセージの ID（B-2） */
  discordMessageId: string | null;
  /** 作成者の uid。Discord 経由は 'discord-bot'、システムは 'system'。記録のない既存データは null */
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** 最終更新者の uid。記録のない既存データは null */
  updatedBy: string | null;
}

export type CommentSource = 'web' | 'discord';

export interface StepComment {
  id: string;
  authorId: string | null;
  authorName: string;
  body: string;
  source: CommentSource;
  discordMessageId: string | null;
  createdAt: Date;
}

export type BriefEventType =
  | 'brief.created'
  | 'brief.title_changed'
  | 'brief.publishAt_changed'
  | 'brief.status_changed'
  | 'brief.field_changed'
  | 'step.status_changed'
  | 'step.assignee_changed'
  | 'step.dueDate_changed'
  | 'step.field_filled'
  | 'step.added'
  | 'step.removed';

export type EventSource = 'web' | 'discord' | 'system' | 'ai';

export interface BriefEvent {
  id: string;
  type: BriefEventType;
  stepId: string | null;
  stepKey: string | null;
  before: unknown;
  after: unknown;
  /** 操作者 UID。システム由来・Discord 由来は null */
  actorId: string | null;
  source: EventSource;
  createdAt: Date;
}

export const STEP_STATUS_LABELS: Record<StepStatus, string> = {
  waiting: '待機',
  ready: '着手可能',
  in_progress: '作業中',
  done: '完了',
  skipped: 'スキップ',
};

export const BRIEF_STATUS_LABELS: Record<BriefStatus, string> = {
  planning: '準備中',
  in_progress: '進行中',
  published: '公開済み',
  archived: 'アーカイブ',
};

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'テキスト',
  url: 'URL',
  number: '数値',
  date: '日付',
  select: '選択',
};
