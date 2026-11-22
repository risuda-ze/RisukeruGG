import type { TeamRole } from '@/types/entities';
import type {
  Brief,
  BriefEventType,
  BriefStatus,
  EventSource,
  FieldDef,
  Step,
  StepStatus,
} from '@/types/briefs';
import type { StepDraft } from '../generate';

/**
 * 操作層（D-1）が依存する永続化ポート。
 * クライアント（Firestore SDK）・サーバー（Admin SDK）・テスト（メモリ）が同じ契約を実装する。
 * 操作はまず `loadBrief` で現状を読み、`commit` に 1 トランザクション分の変更をまとめて渡す。
 */
export interface BriefsPort {
  /** 新しいドキュメント ID を発行する */
  newId(): string;
  loadBrief(teamId: string, briefId: string): Promise<{ brief: Brief; steps: Step[] } | null>;
  commit(teamId: string, tx: BriefTransaction): Promise<void>;
}

export interface BriefCreateDraft {
  id: string;
  title: string;
  playbookId: string | null;
  playbookVersion: number | null;
  publishAt: Date | null;
  status: BriefStatus;
  performerIds: string[];
  headerFields: FieldDef[];
  fields: Record<string, unknown>;
  linkedScheduleId: string | null;
  createdBy: string;
}

export type BriefPatch = Partial<
  Pick<Brief, 'title' | 'publishAt' | 'status' | 'performerIds' | 'fields' | 'linkedScheduleId'>
>;

export type StepPatch = Partial<
  Pick<
    Step,
    | 'title'
    | 'status'
    | 'assigneeId'
    | 'dueDate'
    | 'dueDateOverridden'
    | 'fields'
    | 'completedAt'
    | 'completedBy'
    | 'order'
    | 'dependsOn'
  >
>;

export interface StepCreateDraft extends StepDraft {
  id: string;
}

export interface BriefEventDraft {
  type: BriefEventType;
  stepId: string | null;
  stepKey: string | null;
  before: unknown;
  after: unknown;
  actorId: string | null;
  source: EventSource;
}

export interface BriefTransaction {
  briefId: string;
  createBrief?: BriefCreateDraft;
  briefPatch?: BriefPatch;
  stepCreates: StepCreateDraft[];
  stepPatches: Array<{ stepId: string; patch: StepPatch }>;
  stepDeletes: string[];
  events: BriefEventDraft[];
}

/** 操作の実行文脈 */
export interface OperationContext {
  teamId: string;
  /** 操作者 UID。Discord・システム由来は null */
  actorId: string | null;
  role: TeamRole | null;
  source: EventSource;
  now: Date;
}

export class OperationError extends Error {
  constructor(
    public readonly code:
      | 'permission-denied'
      | 'not-found'
      | 'invalid-transition'
      | 'invalid-argument',
    message: string
  ) {
    super(message);
    this.name = 'OperationError';
  }
}

/** 空のトランザクションを作る */
export function emptyTransaction(briefId: string): BriefTransaction {
  return { briefId, stepCreates: [], stepPatches: [], stepDeletes: [], events: [] };
}

export type { StepStatus };
