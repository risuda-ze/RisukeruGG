import { beforeEach, describe, expect, it } from 'vitest';
import {
  addStep,
  assignStep,
  completeStep,
  createBrief,
  OperationError,
  removeStep,
  setStepDueDate,
  setStepFields,
  skipStep,
  updateBriefHeader,
  type OperationContext,
} from '@/lib/briefs/operations';
import { buildStepsFromPlaybook, nextCustomStepKey } from '@/lib/briefs/generate';
import { MemoryBriefsPort } from './memoryPort';
import { samplePlaybook } from './fixtures';

const ctx: OperationContext = {
  teamId: 't_1',
  actorId: 'u_risu',
  role: 'member',
  source: 'web',
  now: new Date('2026-09-06T10:00:00'),
};

describe('buildStepsFromPlaybook', () => {
  it('先行工程のない工程は ready、それ以外は waiting。締切と担当を進め方から埋める', () => {
    const drafts = buildStepsFromPlaybook(samplePlaybook(), new Date('2026-09-20'));
    expect(drafts.map((d) => d.status)).toEqual(['ready', 'waiting', 'waiting', 'waiting']);
    expect(drafts[0]!.dueDate).toEqual(new Date('2026-09-13T00:00:00'));
    expect(drafts[1]!.assigneeId).toBe('u_sato');
    expect(drafts[1]!.requiredFields[0]!.key).toBe('material_url');
  });

  it('nextCustomStepKey は既存と衝突しない', () => {
    expect(nextCustomStepKey(['custom_1', 'custom_3'])).toBe('custom_2');
    expect(nextCustomStepKey([])).toBe('custom_1');
  });
});

describe('createBrief', () => {
  let port: MemoryBriefsPort;
  beforeEach(() => {
    port = new MemoryBriefsPort();
  });

  it('進め方から工程が埋まったブリーフを作る', async () => {
    const { briefId, stepIds } = await createBrief(
      port,
      ctx,
      { title: '第10回', publishAt: new Date('2026-09-20'), playbookId: 'pb_1', performerIds: ['u_risu'], linkedScheduleId: null },
      samplePlaybook()
    );
    const loaded = await port.loadBrief('t_1', briefId);
    expect(loaded!.brief.status).toBe('in_progress');
    expect(loaded!.brief.playbookVersion).toBe(3);
    expect(loaded!.brief.headerFields[0]!.key).toBe('summary');
    expect(stepIds).toHaveLength(4);
    expect(loaded!.steps[0]!.status).toBe('ready');
    expect(port.events.some((e) => e.type === 'brief.created')).toBe(true);
  });

  it('進め方なしなら工程 0 件の planning で作る', async () => {
    const { briefId } = await createBrief(
      port,
      ctx,
      { title: '企画', publishAt: null, playbookId: null, performerIds: [], linkedScheduleId: null },
      null
    );
    const loaded = await port.loadBrief('t_1', briefId);
    expect(loaded!.brief.status).toBe('planning');
    expect(loaded!.steps).toHaveLength(0);
  });

  it('スタッフも作成でき、作成者は本人になる', async () => {
    const staff: OperationContext = { ...ctx, actorId: 'u_staff', role: 'staff' };
    const { briefId } = await createBrief(
      port,
      staff,
      { title: 'x', publishAt: null, playbookId: null, performerIds: [], linkedScheduleId: null },
      null
    );
    expect((await port.loadBrief('t_1', briefId))!.brief.createdBy).toBe('u_staff');
  });

  it('ロールを持たない web 操作（所属者でない）は作成できない', async () => {
    await expect(
      createBrief(port, { ...ctx, role: null }, { title: 'x', publishAt: null, playbookId: null, performerIds: [], linkedScheduleId: null }, null)
    ).rejects.toBeInstanceOf(OperationError);
  });
});

describe('権限（作成者・担当者・メンバー）', () => {
  let port: MemoryBriefsPort;
  let briefId: string;
  let ids: string[];
  const creator: OperationContext = { ...ctx, actorId: 'u_creator', role: 'staff' };
  const other: OperationContext = { ...ctx, actorId: 'u_other', role: 'staff' };
  const assignee: OperationContext = { ...ctx, actorId: 'u_sato', role: 'staff' };

  beforeEach(async () => {
    port = new MemoryBriefsPort();
    const r = await createBrief(
      port,
      creator,
      { title: '第10回', publishAt: new Date('2026-09-20'), playbookId: 'pb_1', performerIds: [], linkedScheduleId: null },
      samplePlaybook()
    );
    briefId = r.briefId;
    ids = r.stepIds;
  });

  it('スタッフは他人のブリーフを編集できない', async () => {
    await expect(updateBriefHeader(port, other, briefId, { title: 'y' })).rejects.toBeInstanceOf(OperationError);
    await expect(assignStep(port, other, briefId, ids[0]!, 'u_other')).rejects.toBeInstanceOf(OperationError);
    await expect(completeStep(port, other, briefId, ids[0]!)).rejects.toBeInstanceOf(OperationError);
  });

  it('ブリーフの作成者は、スタッフでも自分のブリーフを編集できる', async () => {
    await updateBriefHeader(port, creator, briefId, { title: 'y' });
    expect((await port.loadBrief('t_1', briefId))!.brief.title).toBe('y');
  });

  it('メンバーは他人のブリーフも編集できる', async () => {
    await updateBriefHeader(port, ctx, briefId, { title: 'z' });
    expect((await port.loadBrief('t_1', briefId))!.brief.title).toBe('z');
  });

  it('担当者本人は完了できるが、担当・締切・項目の変更はできない', async () => {
    await completeStep(port, creator, briefId, ids[0]!);
    // ids[1] の担当は u_sato（進め方から）
    await completeStep(port, assignee, briefId, ids[1]!);
    expect((await port.loadBrief('t_1', briefId))!.steps[1]!.status).toBe('done');
    await expect(assignStep(port, assignee, briefId, ids[1]!, 'u_risu')).rejects.toBeInstanceOf(OperationError);
    await expect(setStepDueDate(port, assignee, briefId, ids[1]!, new Date('2026-09-10'))).rejects.toBeInstanceOf(OperationError);
    await expect(setStepFields(port, assignee, briefId, ids[1]!, { material_url: 'x' })).rejects.toBeInstanceOf(OperationError);
  });
});

describe('工程の進行', () => {
  let port: MemoryBriefsPort;
  let briefId: string;
  let ids: string[];

  beforeEach(async () => {
    port = new MemoryBriefsPort();
    const r = await createBrief(
      port,
      ctx,
      { title: '第10回', publishAt: new Date('2026-09-20'), playbookId: 'pb_1', performerIds: [], linkedScheduleId: null },
      samplePlaybook()
    );
    briefId = r.briefId;
    ids = r.stepIds;
  });

  it('完了すると後続工程が自動で着手可能になり、差分が web / system で記録される', async () => {
    await completeStep(port, ctx, briefId, ids[0]!);
    const { steps } = (await port.loadBrief('t_1', briefId))!;
    expect(steps[0]!.status).toBe('done');
    expect(steps[0]!.completedBy).toBe('u_risu');
    expect(steps[1]!.status).toBe('ready');
    expect(steps[2]!.status).toBe('waiting');
    const statusEvents = port.events.filter((e) => e.type === 'step.status_changed');
    expect(statusEvents.map((e) => e.source)).toEqual(['web', 'system']);
  });

  it('待機中の工程は完了にできない', async () => {
    await expect(completeStep(port, ctx, briefId, ids[1]!)).rejects.toMatchObject({ code: 'invalid-transition' });
  });

  it('任意工程はスキップでき、必須工程はスキップできない', async () => {
    await completeStep(port, ctx, briefId, ids[0]!);
    await completeStep(port, ctx, briefId, ids[1]!);
    await completeStep(port, ctx, briefId, ids[2]!);
    await skipStep(port, ctx, briefId, ids[3]!);
    const { steps } = (await port.loadBrief('t_1', briefId))!;
    expect(steps[3]!.status).toBe('skipped');
    await expect(skipStep(port, ctx, briefId, ids[0]!)).rejects.toMatchObject({ code: 'invalid-transition' });
  });

  it('Discord 由来（role なし）でも完了でき、actorId は null で記録される', async () => {
    const discordCtx: OperationContext = { ...ctx, actorId: null, role: null, source: 'discord' };
    await completeStep(port, discordCtx, briefId, ids[0]!);
    const ev = port.events.find((e) => e.type === 'step.status_changed' && e.source === 'discord');
    expect(ev?.actorId).toBeNull();
  });

  it('担当変更と項目入力は差分を残す', async () => {
    await assignStep(port, ctx, briefId, ids[2]!, 'u_sato');
    await setStepFields(port, ctx, briefId, ids[1]!, { material_url: 'https://drive/x' });
    const { steps } = (await port.loadBrief('t_1', briefId))!;
    expect(steps[2]!.assigneeId).toBe('u_sato');
    expect(steps[1]!.fields.material_url).toBe('https://drive/x');
    expect(port.events.filter((e) => e.type === 'step.assignee_changed')).toHaveLength(1);
    expect(port.events.filter((e) => e.type === 'step.field_filled')).toHaveLength(1);
  });
});

describe('公開予定日の変更と締切', () => {
  let port: MemoryBriefsPort;
  let briefId: string;
  let ids: string[];

  beforeEach(async () => {
    port = new MemoryBriefsPort();
    const r = await createBrief(
      port,
      ctx,
      { title: '第10回', publishAt: new Date('2026-09-20'), playbookId: 'pb_1', performerIds: [], linkedScheduleId: null },
      samplePlaybook()
    );
    briefId = r.briefId;
    ids = r.stepIds;
  });

  it('公開日を動かすと固定していない工程の締切が再計算される', async () => {
    await setStepDueDate(port, ctx, briefId, ids[1]!, new Date('2026-09-10'));
    await updateBriefHeader(port, ctx, briefId, { publishAt: new Date('2026-09-27') });
    const { brief, steps } = (await port.loadBrief('t_1', briefId))!;
    expect(brief.publishAt).toEqual(new Date('2026-09-27'));
    expect(steps[0]!.dueDate).toEqual(new Date('2026-09-20T00:00:00'));
    expect(steps[1]!.dueDate).toEqual(new Date('2026-09-10T00:00:00')); // 固定済み
    expect(steps[1]!.dueDateOverridden).toBe(true);
    const dueEvents = port.events.filter((e) => e.type === 'step.dueDate_changed');
    // 手動 1 件 + 再計算 3 件（固定した 1 件を除く）
    expect(dueEvents).toHaveLength(4);
    expect(port.events.some((e) => e.type === 'brief.publishAt_changed')).toBe(true);
  });

  it('締切に null を渡すと固定を解除して再計算に戻す', async () => {
    await setStepDueDate(port, ctx, briefId, ids[1]!, new Date('2026-09-10'));
    await setStepDueDate(port, ctx, briefId, ids[1]!, null);
    const { steps } = (await port.loadBrief('t_1', briefId))!;
    expect(steps[1]!.dueDateOverridden).toBe(false);
    expect(steps[1]!.dueDate).toEqual(new Date('2026-09-17T00:00:00'));
  });

  it('変更のない更新は commit しない', async () => {
    const before = port.committed.length;
    await updateBriefHeader(port, ctx, briefId, { title: '第10回' });
    expect(port.committed.length).toBe(before);
  });
});

describe('工程の追加と削除', () => {
  let port: MemoryBriefsPort;
  let briefId: string;
  let ids: string[];

  beforeEach(async () => {
    port = new MemoryBriefsPort();
    const r = await createBrief(
      port,
      ctx,
      { title: '第10回', publishAt: new Date('2026-09-20'), playbookId: 'pb_1', performerIds: [], linkedScheduleId: null },
      samplePlaybook()
    );
    briefId = r.briefId;
    ids = r.stepIds;
  });

  it('手追加の工程は custom_* キーで、先行が未完了なら waiting', async () => {
    const newId = await addStep(port, ctx, briefId, {
      title: 'BGM 選定',
      assigneeId: null,
      leadDays: 4,
      dependsOn: ['outline'],
      requiredFields: [],
      optional: false,
      afterStepId: ids[0]!,
    });
    const { steps } = (await port.loadBrief('t_1', briefId))!;
    const added = steps.find((s) => s.id === newId)!;
    expect(added.key).toBe('custom_1');
    expect(added.status).toBe('waiting');
    expect(added.dueDate).toEqual(new Date('2026-09-16T00:00:00'));
    // outline の直後に挿入され、後続の order が繰り下がる
    expect(steps.map((s) => s.key)).toEqual(['outline', 'custom_1', 'edit', 'thumb', 'announce']);
  });

  it('削除すると依存から外れ、後続が着手可能になりうる', async () => {
    await removeStep(port, ctx, briefId, ids[0]!);
    const { steps } = (await port.loadBrief('t_1', briefId))!;
    expect(steps.map((s) => s.key)).toEqual(['edit', 'thumb', 'announce']);
    expect(steps[0]!.dependsOn).toEqual([]);
    expect(steps[0]!.status).toBe('ready');
    expect(port.events.some((e) => e.type === 'step.removed')).toBe(true);
  });
});
