import {
  collection,
  collectionGroup,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
  getDocs,
  addDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
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
import type { BriefsPort, BriefTransaction } from '@/lib/briefs/operations/port';

/* ── 変換 ─────────────────────────────────────────────── */

function toDate(v: unknown): Date | null {
  return v instanceof Timestamp ? v.toDate() : null;
}

function toFieldDefs(v: unknown): FieldDef[] {
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

function toBrief(teamId: string, id: string, data: Record<string, unknown>): Brief {
  const discord = data.discord as Record<string, string> | null | undefined;
  return {
    id,
    teamId,
    title: data.title as string,
    playbookId: (data.playbookId as string | null | undefined) ?? null,
    playbookVersion: (data.playbookVersion as number | null | undefined) ?? null,
    publishAt: toDate(data.publishAt),
    status: (data.status as BriefStatus) ?? 'planning',
    performerIds: (data.performerIds as string[] | undefined) ?? [],
    headerFields: toFieldDefs(data.headerFields),
    fields: (data.fields as Record<string, unknown> | undefined) ?? {},
    linkedScheduleId: (data.linkedScheduleId as string | null | undefined) ?? null,
    discord: discord
      ? { threadId: discord.threadId!, summaryMessageId: discord.summaryMessageId!, channelId: discord.channelId! }
      : null,
    createdBy: data.createdBy as string,
    createdAt: toDate(data.createdAt) ?? new Date(0),
    updatedAt: toDate(data.updatedAt) ?? new Date(0),
  };
}

function toStep(id: string, data: Record<string, unknown>): Step {
  return {
    id,
    briefId: data.briefId as string,
    teamId: data.teamId as string,
    key: data.key as string,
    title: data.title as string,
    order: (data.order as number) ?? 0,
    status: (data.status as StepStatus) ?? 'waiting',
    assigneeId: (data.assigneeId as string | null | undefined) ?? null,
    dueDate: toDate(data.dueDate),
    dueDateOverridden: Boolean(data.dueDateOverridden),
    leadDays: (data.leadDays as number) ?? 0,
    dependsOn: (data.dependsOn as string[] | undefined) ?? [],
    requiredFields: toFieldDefs(data.requiredFields),
    fields: (data.fields as Record<string, unknown> | undefined) ?? {},
    reminderDaysBefore: (data.reminderDaysBefore as number | undefined) ?? 1,
    optional: Boolean(data.optional),
    completedAt: toDate(data.completedAt),
    completedBy: (data.completedBy as string | null | undefined) ?? null,
    discordMessageId: (data.discordMessageId as string | null | undefined) ?? null,
    createdAt: toDate(data.createdAt) ?? new Date(0),
    updatedAt: toDate(data.updatedAt) ?? new Date(0),
  };
}

function toComment(id: string, data: Record<string, unknown>): StepComment {
  return {
    id,
    authorId: (data.authorId as string | null | undefined) ?? null,
    authorName: (data.authorName as string) ?? '',
    body: (data.body as string) ?? '',
    source: (data.source as StepComment['source']) ?? 'web',
    discordMessageId: (data.discordMessageId as string | null | undefined) ?? null,
    createdAt: toDate(data.createdAt) ?? new Date(0),
  };
}

function toEvent(id: string, data: Record<string, unknown>): BriefEvent {
  return {
    id,
    type: data.type as BriefEventType,
    stepId: (data.stepId as string | null | undefined) ?? null,
    stepKey: (data.stepKey as string | null | undefined) ?? null,
    before: unwrapDate(data.before),
    after: unwrapDate(data.after),
    actorId: (data.actorId as string | null | undefined) ?? null,
    source: (data.source as EventSource) ?? 'web',
    createdAt: toDate(data.createdAt) ?? new Date(0),
  };
}

function unwrapDate(v: unknown): unknown {
  return v instanceof Timestamp ? v.toDate() : v;
}

/** undefined を含むと Firestore が拒否するため除去する */
function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

/* ── 参照パス ─────────────────────────────────────────── */

const briefsCol = (teamId: string) => collection(db, 'teams', teamId, 'briefs');
const briefDoc = (teamId: string, briefId: string) => doc(db, 'teams', teamId, 'briefs', briefId);
const stepsCol = (teamId: string, briefId: string) => collection(briefDoc(teamId, briefId), 'steps');
const stepDoc = (teamId: string, briefId: string, stepId: string) => doc(stepsCol(teamId, briefId), stepId);
const eventsCol = (teamId: string, briefId: string) => collection(briefDoc(teamId, briefId), 'briefEvents');
const commentsCol = (teamId: string, briefId: string, stepId: string) =>
  collection(stepDoc(teamId, briefId, stepId), 'comments');

/* ── 購読 ─────────────────────────────────────────────── */

export function subscribeBriefs(teamId: string, callback: (briefs: Brief[]) => void): Unsubscribe {
  const q = query(briefsCol(teamId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => toBrief(teamId, d.id, d.data() as Record<string, unknown>)));
  });
}

/** チーム内の全工程（コレクショングループ）。自分の工程一覧・一覧の進捗表示に使う */
export function subscribeTeamSteps(teamId: string, callback: (steps: Step[]) => void): Unsubscribe {
  const q = query(collectionGroup(db, 'steps'), where('teamId', '==', teamId));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => toStep(d.id, d.data() as Record<string, unknown>)));
  });
}

export function subscribeStepComments(
  teamId: string,
  briefId: string,
  stepId: string,
  callback: (comments: StepComment[]) => void
): Unsubscribe {
  const q = query(commentsCol(teamId, briefId, stepId), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => toComment(d.id, d.data() as Record<string, unknown>)));
  });
}

export function subscribeBriefEvents(
  teamId: string,
  briefId: string,
  callback: (events: BriefEvent[]) => void,
  max = 50
): Unsubscribe {
  const q = query(eventsCol(teamId, briefId), orderBy('createdAt', 'desc'), limit(max));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => toEvent(d.id, d.data() as Record<string, unknown>)));
  });
}

export async function addStepComment(
  teamId: string,
  briefId: string,
  stepId: string,
  comment: { authorId: string; authorName: string; body: string }
): Promise<void> {
  await addDoc(commentsCol(teamId, briefId, stepId), {
    ...comment,
    source: 'web',
    discordMessageId: null,
    createdAt: serverTimestamp(),
  });
}

/* ── 操作層ポート（クライアント SDK 実装） ───────────────── */

/**
 * Firestore クライアント SDK で操作層のポートを実装する。
 * commit は writeBatch で原子的に適用し、Firestore ルールによる権限チェックを受ける。
 */
export class FirestoreBriefsPort implements BriefsPort {
  newId(): string {
    return doc(collection(db, '_ids')).id;
  }

  async loadBrief(teamId: string, briefId: string) {
    const { getDoc } = await import('firebase/firestore');
    const snap = await getDoc(briefDoc(teamId, briefId));
    if (!snap.exists()) return null;
    const stepsSnap = await getDocs(query(stepsCol(teamId, briefId), orderBy('order', 'asc')));
    return {
      brief: toBrief(teamId, snap.id, snap.data() as Record<string, unknown>),
      steps: stepsSnap.docs.map((d) => toStep(d.id, d.data() as Record<string, unknown>)),
    };
  }

  async commit(teamId: string, tx: BriefTransaction): Promise<void> {
    const batch = writeBatch(db);
    const now = serverTimestamp();

    if (tx.createBrief) {
      const { id, ...rest } = tx.createBrief;
      batch.set(briefDoc(teamId, id), {
        ...rest,
        teamId,
        discord: null,
        createdAt: now,
        updatedAt: now,
      });
    }
    if (tx.briefPatch && Object.keys(tx.briefPatch).length > 0) {
      batch.update(briefDoc(teamId, tx.briefId), { ...stripUndefined(tx.briefPatch), updatedAt: now });
    } else if (tx.stepPatches.length > 0 || tx.stepCreates.length > 0 || tx.stepDeletes.length > 0) {
      // 工程の変更でもブリーフの updatedAt を進める（一覧の並び・差分の目印）
      batch.update(briefDoc(teamId, tx.briefId), { updatedAt: now });
    }
    for (const c of tx.stepCreates) {
      const { id, ...rest } = c;
      batch.set(stepDoc(teamId, tx.briefId, id), {
        ...rest,
        briefId: tx.briefId,
        teamId,
        completedAt: null,
        completedBy: null,
        discordMessageId: null,
        createdAt: now,
        updatedAt: now,
      });
    }
    for (const { stepId, patch } of tx.stepPatches) {
      batch.update(stepDoc(teamId, tx.briefId, stepId), { ...stripUndefined(patch), updatedAt: now });
    }
    for (const stepId of tx.stepDeletes) {
      batch.delete(stepDoc(teamId, tx.briefId, stepId));
    }
    for (const e of tx.events) {
      batch.set(doc(eventsCol(teamId, tx.briefId)), { ...e, createdAt: now });
    }
    await batch.commit();
  }
}

export const firestoreBriefsPort = new FirestoreBriefsPort();
