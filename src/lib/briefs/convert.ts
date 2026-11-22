import type {
  Brief,
  BriefEvent,
  BriefEventType,
  BriefStatus,
  EventSource,
  FieldDef,
  Step,
  StepComment,
  StepStatus,
} from '@/types/briefs';

/**
 * Firestore ドキュメント → エンティティの変換（クライアント SDK / Admin SDK 共通）。
 * Timestamp はどちらの SDK でも `toDate()` を持つため、ダックタイピングで判定する。
 */

interface TimestampLike {
  toDate: () => Date;
}

function isTimestampLike(v: unknown): v is TimestampLike {
  return typeof v === 'object' && v !== null && typeof (v as TimestampLike).toDate === 'function';
}

export function toDateOrNull(v: unknown): Date | null {
  return isTimestampLike(v) ? v.toDate() : v instanceof Date ? v : null;
}

/** 差分の before / after に入った Timestamp を Date に戻す */
export function unwrapDate(v: unknown): unknown {
  return isTimestampLike(v) ? v.toDate() : v;
}

export function toFieldDefs(v: unknown): FieldDef[] {
  if (!Array.isArray(v)) return [];
  return v.map((f) => ({
    key: String(f.key),
    label: String(f.label ?? f.key),
    type: (f.type as FieldDef['type']) ?? 'text',
    options: Array.isArray(f.options) ? (f.options as string[]) : undefined,
    required: Boolean(f.required),
    ownerRoleLabel: (f.ownerRoleLabel as string | null | undefined) ?? null,
  }));
}

export function toBrief(teamId: string, id: string, data: Record<string, unknown>): Brief {
  const discord = data.discord as Record<string, string> | null | undefined;
  return {
    id,
    teamId,
    title: data.title as string,
    playbookId: (data.playbookId as string | null | undefined) ?? null,
    playbookVersion: (data.playbookVersion as number | null | undefined) ?? null,
    publishAt: toDateOrNull(data.publishAt),
    status: (data.status as BriefStatus) ?? 'planning',
    performerIds: (data.performerIds as string[] | undefined) ?? [],
    headerFields: toFieldDefs(data.headerFields),
    fields: (data.fields as Record<string, unknown> | undefined) ?? {},
    linkedScheduleId: (data.linkedScheduleId as string | null | undefined) ?? null,
    discord:
      discord && discord.threadId
        ? {
            threadId: discord.threadId,
            summaryMessageId: discord.summaryMessageId ?? '',
            channelId: discord.channelId ?? '',
          }
        : null,
    createdBy: data.createdBy as string,
    createdAt: toDateOrNull(data.createdAt) ?? new Date(0),
    updatedAt: toDateOrNull(data.updatedAt) ?? new Date(0),
    updatedBy: (data.updatedBy as string | null | undefined) ?? null,
  };
}

export function toStep(id: string, data: Record<string, unknown>): Step {
  return {
    id,
    briefId: data.briefId as string,
    teamId: data.teamId as string,
    key: data.key as string,
    title: data.title as string,
    order: (data.order as number) ?? 0,
    status: (data.status as StepStatus) ?? 'waiting',
    assigneeId: (data.assigneeId as string | null | undefined) ?? null,
    dueDate: toDateOrNull(data.dueDate),
    dueDateOverridden: Boolean(data.dueDateOverridden),
    leadDays: (data.leadDays as number) ?? 0,
    dependsOn: (data.dependsOn as string[] | undefined) ?? [],
    requiredFields: toFieldDefs(data.requiredFields),
    fields: (data.fields as Record<string, unknown> | undefined) ?? {},
    reminderDaysBefore: (data.reminderDaysBefore as number | undefined) ?? 1,
    optional: Boolean(data.optional),
    completedAt: toDateOrNull(data.completedAt),
    completedBy: (data.completedBy as string | null | undefined) ?? null,
    discordMessageId: (data.discordMessageId as string | null | undefined) ?? null,
    createdBy: (data.createdBy as string | null | undefined) ?? null,
    createdAt: toDateOrNull(data.createdAt) ?? new Date(0),
    updatedAt: toDateOrNull(data.updatedAt) ?? new Date(0),
    updatedBy: (data.updatedBy as string | null | undefined) ?? null,
  };
}

export function toStepComment(id: string, data: Record<string, unknown>): StepComment {
  return {
    id,
    authorId: (data.authorId as string | null | undefined) ?? null,
    authorName: (data.authorName as string) ?? '',
    body: (data.body as string) ?? '',
    source: (data.source as StepComment['source']) ?? 'web',
    discordMessageId: (data.discordMessageId as string | null | undefined) ?? null,
    createdAt: toDateOrNull(data.createdAt) ?? new Date(0),
  };
}

export function toBriefEvent(id: string, data: Record<string, unknown>): BriefEvent {
  return {
    id,
    type: data.type as BriefEventType,
    stepId: (data.stepId as string | null | undefined) ?? null,
    stepKey: (data.stepKey as string | null | undefined) ?? null,
    before: unwrapDate(data.before),
    after: unwrapDate(data.after),
    actorId: (data.actorId as string | null | undefined) ?? null,
    source: (data.source as EventSource) ?? 'web',
    createdAt: toDateOrNull(data.createdAt) ?? new Date(0),
  };
}

/** undefined を含むと Firestore が拒否するため除去する */
export function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}
