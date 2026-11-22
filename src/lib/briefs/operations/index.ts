import { startOfDay } from 'date-fns';
import { canManageCreated } from '@/lib/utils/teamRoles';
import type { Brief, Playbook, Step, StepStatus } from '@/types/briefs';
import type { AddStepInput, CreateBriefInput, UpdateBriefHeaderInput } from '@/lib/validations/briefs';
import { computeDueDate, isSameDate, planDueDateRecalc } from '../deadlines';
import { buildStepsFromPlaybook, nextCustomStepKey } from '../generate';
import { canTransition, deriveReadiness, isStepClosed } from '../transitions';
import {
  emptyTransaction,
  OperationError,
  type BriefsPort,
  type BriefTransaction,
  type OperationContext,
  type StepPatch,
} from './port';

/**
 * ブリーフ操作層（D-1）。
 *
 * Web 画面・Discord のボタン・AI の tool・公開 API はすべてここを通る。
 * 各操作は「権限判定 → 現状の読み込み → 変更の計画（純粋関数） → 差分記録 → commit」の順で行い、
 * 入口ごとに書き込みロジックを持たない。
 */

/* ── 権限 ─────────────────────────────────────────────── */

/** Discord・システム由来はロールを見ない。サーバーを信頼境界として許可する */
function isTrustedSource(ctx: OperationContext): boolean {
  return ctx.source === 'discord' || ctx.source === 'system';
}

/** ブリーフを作れるか。所属者（ロールを持つ）なら誰でも作れる */
export function assertCanCreateBrief(ctx: OperationContext): void {
  if (isTrustedSource(ctx) || ctx.role !== null) return;
  throw new OperationError('permission-denied', 'チームの所属者のみブリーフを作成できます');
}

/** ブリーフと工程の構成を編集できるか。メンバーか、そのブリーフの作成者 */
export function assertCanEditBrief(ctx: OperationContext, brief: Pick<Brief, 'createdBy'>): void {
  if (isTrustedSource(ctx)) return;
  if (canManageCreated(ctx.role, brief.createdBy, ctx.actorId)) return;
  throw new OperationError('permission-denied', 'この操作にはメンバーか、ブリーフの作成者の権限が必要です');
}

/** 工程の状態を変えられるか。ブリーフの編集権限に加え、その工程の担当者本人も可 */
export function assertCanChangeStep(
  ctx: OperationContext,
  brief: Pick<Brief, 'createdBy'>,
  step: Pick<Step, 'assigneeId'>
): void {
  if (isTrustedSource(ctx)) return;
  if (canManageCreated(ctx.role, brief.createdBy, ctx.actorId)) return;
  if (ctx.actorId && step.assigneeId === ctx.actorId) return;
  throw new OperationError(
    'permission-denied',
    'この操作にはメンバー、ブリーフの作成者、または工程の担当者の権限が必要です'
  );
}

/* ── 内部ヘルパー ─────────────────────────────────────── */

async function loadOrThrow(port: BriefsPort, ctx: OperationContext, briefId: string) {
  const loaded = await port.loadBrief(ctx.teamId, briefId);
  if (!loaded) throw new OperationError('not-found', 'ブリーフが見つかりません');
  return loaded;
}

function findStep(steps: Step[], stepId: string): Step {
  const step = steps.find((s) => s.id === stepId);
  if (!step) throw new OperationError('not-found', '工程が見つかりません');
  return step;
}

/** ステータス変更と、それに伴う後続工程の自動遷移をトランザクションへ積む */
function applyStatusChange(
  tx: BriefTransaction,
  ctx: OperationContext,
  steps: Step[],
  target: Step,
  to: StepStatus
): void {
  const closing = isStepClosed(to);
  const patch: StepPatch = {
    status: to,
    completedAt: to === 'done' ? ctx.now : closing ? target.completedAt : null,
    completedBy: to === 'done' ? ctx.actorId : closing ? target.completedBy : null,
  };
  tx.stepPatches.push({ stepId: target.id, patch });
  tx.events.push({
    type: 'step.status_changed',
    stepId: target.id,
    stepKey: target.key,
    before: target.status,
    after: to,
    actorId: ctx.actorId,
    source: ctx.source,
  });

  // 変更後の状態で依存関係を再評価し、自動遷移を積む（system 由来として記録）
  const next = steps.map((s) => (s.id === target.id ? { ...s, status: to } : s));
  for (const change of deriveReadiness(next)) {
    tx.stepPatches.push({ stepId: change.stepId, patch: { status: change.to } });
    tx.events.push({
      type: 'step.status_changed',
      stepId: change.stepId,
      stepKey: change.stepKey,
      before: change.from,
      after: change.to,
      actorId: null,
      source: 'system',
    });
  }
}

/* ── ブリーフ ─────────────────────────────────────────── */

export interface CreateBriefResult {
  briefId: string;
  stepIds: string[];
}

/**
 * ブリーフを作成する。進め方が指定されていれば工程・担当・締切を埋めた状態で生成する。
 */
export async function createBrief(
  port: BriefsPort,
  ctx: OperationContext,
  input: CreateBriefInput,
  playbook: Playbook | null
): Promise<CreateBriefResult> {
  assertCanCreateBrief(ctx);
  if (input.playbookId && !playbook) {
    throw new OperationError('invalid-argument', '指定された進め方が見つかりません');
  }
  const briefId = port.newId();
  const tx = emptyTransaction(briefId);
  const drafts = playbook ? buildStepsFromPlaybook(playbook, input.publishAt) : [];
  tx.createBrief = {
    id: briefId,
    title: input.title,
    playbookId: playbook?.id ?? null,
    playbookVersion: playbook?.version ?? null,
    publishAt: input.publishAt,
    status: drafts.length > 0 ? 'in_progress' : 'planning',
    performerIds: input.performerIds,
    headerFields: playbook ? playbook.headerFields.map((f) => ({ ...f })) : [],
    fields: {},
    linkedScheduleId: input.linkedScheduleId,
    createdBy: ctx.actorId ?? 'system',
  };
  tx.stepCreates = drafts.map((d) => ({ ...d, id: port.newId() }));
  tx.events.push({
    type: 'brief.created',
    stepId: null,
    stepKey: null,
    before: null,
    after: { title: input.title, playbookId: playbook?.id ?? null },
    actorId: ctx.actorId,
    source: ctx.source,
  });
  await port.commit(ctx.teamId, tx);
  return { briefId, stepIds: tx.stepCreates.map((s) => s.id) };
}

/**
 * 見出し（タイトル・公開予定日・状態・出演者・見出し項目）を更新する。
 * 公開予定日が変わると、手で固定していない工程の締切を再計算し、変更を差分として残す。
 */
export async function updateBriefHeader(
  port: BriefsPort,
  ctx: OperationContext,
  briefId: string,
  input: UpdateBriefHeaderInput
): Promise<void> {
  const { brief, steps } = await loadOrThrow(port, ctx, briefId);
  assertCanEditBrief(ctx, brief);
  const tx = emptyTransaction(briefId);
  tx.briefPatch = {};

  if (input.title !== undefined && input.title !== brief.title) {
    tx.briefPatch.title = input.title;
    tx.events.push(event('brief.title_changed', null, brief.title, input.title, ctx));
  }
  if (input.status !== undefined && input.status !== brief.status) {
    tx.briefPatch.status = input.status;
    tx.events.push(event('brief.status_changed', null, brief.status, input.status, ctx));
  }
  if (input.performerIds !== undefined) {
    tx.briefPatch.performerIds = input.performerIds;
  }
  if (input.fields !== undefined) {
    tx.briefPatch.fields = { ...brief.fields, ...input.fields };
    for (const [key, value] of Object.entries(input.fields)) {
      if (brief.fields[key] !== value) {
        tx.events.push(event('brief.field_changed', null, { key, value: brief.fields[key] }, { key, value }, ctx));
      }
    }
  }
  if (input.publishAt !== undefined && !isSameDate(input.publishAt, brief.publishAt)) {
    tx.briefPatch.publishAt = input.publishAt;
    tx.events.push(event('brief.publishAt_changed', null, brief.publishAt, input.publishAt, ctx));
    for (const change of planDueDateRecalc(steps, input.publishAt)) {
      tx.stepPatches.push({ stepId: change.stepId, patch: { dueDate: change.after } });
      tx.events.push({
        type: 'step.dueDate_changed',
        stepId: change.stepId,
        stepKey: change.stepKey,
        before: change.before,
        after: change.after,
        actorId: null,
        source: 'system',
      });
    }
  }

  if (Object.keys(tx.briefPatch).length === 0 && tx.stepPatches.length === 0) return;
  await port.commit(ctx.teamId, tx);
}

/* ── 工程 ─────────────────────────────────────────────── */

/** 状態を手動で変える（着手・完了・スキップ・差し戻し） */
export async function changeStepStatus(
  port: BriefsPort,
  ctx: OperationContext,
  briefId: string,
  stepId: string,
  to: StepStatus
): Promise<void> {
  const { brief, steps } = await loadOrThrow(port, ctx, briefId);
  const step = findStep(steps, stepId);
  assertCanChangeStep(ctx, brief, step);
  const check = canTransition(step, to);
  if (!check.ok) throw new OperationError('invalid-transition', check.reason ?? '遷移できません');
  const tx = emptyTransaction(briefId);
  applyStatusChange(tx, ctx, steps, step, to);
  await port.commit(ctx.teamId, tx);
}

export const completeStep = (port: BriefsPort, ctx: OperationContext, briefId: string, stepId: string) =>
  changeStepStatus(port, ctx, briefId, stepId, 'done');
export const startStep = (port: BriefsPort, ctx: OperationContext, briefId: string, stepId: string) =>
  changeStepStatus(port, ctx, briefId, stepId, 'in_progress');
export const skipStep = (port: BriefsPort, ctx: OperationContext, briefId: string, stepId: string) =>
  changeStepStatus(port, ctx, briefId, stepId, 'skipped');
export const reopenStep = (port: BriefsPort, ctx: OperationContext, briefId: string, stepId: string) =>
  changeStepStatus(port, ctx, briefId, stepId, 'ready');

/** 担当者を変更する */
export async function assignStep(
  port: BriefsPort,
  ctx: OperationContext,
  briefId: string,
  stepId: string,
  assigneeId: string | null
): Promise<void> {
  const { brief, steps } = await loadOrThrow(port, ctx, briefId);
  assertCanEditBrief(ctx, brief);
  const step = findStep(steps, stepId);
  if (step.assigneeId === assigneeId) return;
  const tx = emptyTransaction(briefId);
  tx.stepPatches.push({ stepId, patch: { assigneeId } });
  tx.events.push(event('step.assignee_changed', step, step.assigneeId, assigneeId, ctx));
  await port.commit(ctx.teamId, tx);
}

/**
 * 締切を手で変える。手で変えた工程は以後の公開日変更による再計算から外れる。
 * `dueDate` に null を渡すと再計算対象に戻し、公開日から計算し直す。
 */
export async function setStepDueDate(
  port: BriefsPort,
  ctx: OperationContext,
  briefId: string,
  stepId: string,
  dueDate: Date | null
): Promise<void> {
  const { brief, steps } = await loadOrThrow(port, ctx, briefId);
  assertCanEditBrief(ctx, brief);
  const step = findStep(steps, stepId);
  // 締切は日付単位で扱うため、手入力も 0 時に正規化する
  const next = dueDate ? startOfDay(dueDate) : computeDueDate(brief.publishAt, step.leadDays);
  const overridden = dueDate !== null;
  if (isSameDate(step.dueDate, next) && step.dueDateOverridden === overridden) return;
  const tx = emptyTransaction(briefId);
  tx.stepPatches.push({ stepId, patch: { dueDate: next, dueDateOverridden: overridden } });
  tx.events.push(event('step.dueDate_changed', step, step.dueDate, next, ctx));
  await port.commit(ctx.teamId, tx);
}

/** 工程固有の項目を入力する（部分更新） */
export async function setStepFields(
  port: BriefsPort,
  ctx: OperationContext,
  briefId: string,
  stepId: string,
  fields: Record<string, unknown>
): Promise<void> {
  const { brief, steps } = await loadOrThrow(port, ctx, briefId);
  assertCanEditBrief(ctx, brief);
  const step = findStep(steps, stepId);
  const merged = { ...step.fields, ...fields };
  const tx = emptyTransaction(briefId);
  tx.stepPatches.push({ stepId, patch: { fields: merged } });
  for (const [key, value] of Object.entries(fields)) {
    if (step.fields[key] !== value) {
      tx.events.push(event('step.field_filled', step, { key, value: step.fields[key] }, { key, value }, ctx));
    }
  }
  if (tx.events.length === 0) return;
  await port.commit(ctx.teamId, tx);
}

/** タイトルを変更する */
export async function renameStep(
  port: BriefsPort,
  ctx: OperationContext,
  briefId: string,
  stepId: string,
  title: string
): Promise<void> {
  const { brief, steps } = await loadOrThrow(port, ctx, briefId);
  assertCanEditBrief(ctx, brief);
  const step = findStep(steps, stepId);
  const trimmed = title.trim();
  if (!trimmed || trimmed === step.title) return;
  const tx = emptyTransaction(briefId);
  tx.stepPatches.push({ stepId, patch: { title: trimmed } });
  await port.commit(ctx.teamId, tx);
}

/** 工程を手で追加する（キーは custom_*）。締切は公開日から逆算する */
export async function addStep(
  port: BriefsPort,
  ctx: OperationContext,
  briefId: string,
  input: AddStepInput
): Promise<string> {
  const { brief, steps } = await loadOrThrow(port, ctx, briefId);
  assertCanEditBrief(ctx, brief);
  const key = nextCustomStepKey(steps.map((s) => s.key));
  const keys = new Set(steps.map((s) => s.key));
  const dependsOn = input.dependsOn.filter((k) => keys.has(k));
  const byKey = new Map(steps.map((s) => [s.key, s]));
  const satisfied = dependsOn.every((k) => isStepClosed(byKey.get(k)!.status));

  // 挿入位置: afterStepId の直後、なければ末尾
  const sorted = [...steps].sort((a, b) => a.order - b.order);
  const afterIndex = input.afterStepId ? sorted.findIndex((s) => s.id === input.afterStepId) : -1;
  const order = afterIndex >= 0 ? sorted[afterIndex]!.order + 1 : (sorted.at(-1)?.order ?? -1) + 1;

  const tx = emptyTransaction(briefId);
  // 後ろの工程の order を 1 つずつ繰り下げる
  if (afterIndex >= 0) {
    for (const s of sorted.slice(afterIndex + 1)) {
      tx.stepPatches.push({ stepId: s.id, patch: { order: s.order + 1 } });
    }
  }
  const stepId = port.newId();
  tx.stepCreates.push({
    id: stepId,
    key,
    title: input.title,
    order,
    status: satisfied ? 'ready' : 'waiting',
    assigneeId: input.assigneeId,
    dueDate: computeDueDate(brief.publishAt, input.leadDays),
    dueDateOverridden: false,
    leadDays: input.leadDays,
    dependsOn,
    requiredFields: input.requiredFields,
    fields: {},
    reminderDaysBefore: 1,
    optional: input.optional,
  });
  tx.events.push({
    type: 'step.added',
    stepId,
    stepKey: key,
    before: null,
    after: { title: input.title },
    actorId: ctx.actorId,
    source: ctx.source,
  });
  await port.commit(ctx.teamId, tx);
  return stepId;
}

/** 工程を削除する。他の工程の先行指定からも外し、依存関係を再評価する */
export async function removeStep(
  port: BriefsPort,
  ctx: OperationContext,
  briefId: string,
  stepId: string
): Promise<void> {
  const { brief, steps } = await loadOrThrow(port, ctx, briefId);
  assertCanEditBrief(ctx, brief);
  const step = findStep(steps, stepId);
  const tx = emptyTransaction(briefId);
  tx.stepDeletes.push(stepId);
  const remaining = steps
    .filter((s) => s.id !== stepId)
    .map((s) =>
      s.dependsOn.includes(step.key) ? { ...s, dependsOn: s.dependsOn.filter((k) => k !== step.key) } : s
    );
  for (const s of remaining) {
    const original = steps.find((o) => o.id === s.id)!;
    if (original.dependsOn.length !== s.dependsOn.length) {
      tx.stepPatches.push({ stepId: s.id, patch: { dependsOn: s.dependsOn } });
    }
  }
  for (const change of deriveReadiness(remaining)) {
    tx.stepPatches.push({ stepId: change.stepId, patch: { status: change.to } });
    tx.events.push({
      type: 'step.status_changed',
      stepId: change.stepId,
      stepKey: change.stepKey,
      before: change.from,
      after: change.to,
      actorId: null,
      source: 'system',
    });
  }
  tx.events.push(event('step.removed', step, { title: step.title }, null, ctx));
  await port.commit(ctx.teamId, tx);
}

/* ── 差分の生成 ────────────────────────────────────────── */

function event(
  type: BriefTransaction['events'][number]['type'],
  step: Step | null,
  before: unknown,
  after: unknown,
  ctx: OperationContext
): BriefTransaction['events'][number] {
  return {
    type,
    stepId: step?.id ?? null,
    stepKey: step?.key ?? null,
    before,
    after,
    actorId: ctx.actorId,
    source: ctx.source,
  };
}

export { OperationError } from './port';
export type { BriefsPort, OperationContext } from './port';
