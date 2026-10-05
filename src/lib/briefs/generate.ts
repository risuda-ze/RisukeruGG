import type { Brief, FieldDef, Playbook, Step, StepDef, StepStatus } from '@/types/briefs';
import { computeDueDate } from './deadlines';

/** 保存前の工程（id・日時はリポジトリが付与する） */
export interface StepDraft {
  key: string;
  title: string;
  order: number;
  status: StepStatus;
  assigneeId: string | null;
  dueDate: Date | null;
  dueDateOverridden: boolean;
  leadDays: number;
  dependsOn: string[];
  requiredFields: FieldDef[];
  fields: Record<string, unknown>;
  reminderDaysBefore: number;
  optional: boolean;
}

/**
 * 進め方から工程の初期状態を生成する。
 * 先行工程のない工程は最初から `ready`、それ以外は `waiting`。
 */
export function buildStepsFromPlaybook(
  playbook: Pick<Playbook, 'steps'>,
  publishAt: Date | null
): StepDraft[] {
  return playbook.steps.map((def, index) => ({
    key: def.key,
    title: def.title,
    order: index,
    status: def.dependsOn.length === 0 ? 'ready' : 'waiting',
    assigneeId: def.defaultAssigneeId,
    dueDate: computeDueDate(publishAt, def.leadDays),
    dueDateOverridden: false,
    leadDays: def.leadDays,
    dependsOn: [...def.dependsOn],
    requiredFields: def.requiredFields.map((f) => ({ ...f, options: f.options ? [...f.options] : undefined })),
    fields: {},
    reminderDaysBefore: def.reminderDaysBefore,
    optional: def.optional,
  }));
}

/** 手追加工程のキーを発行する（既存キーと衝突しない） */
export function nextCustomStepKey(existingKeys: Iterable<string>): string {
  const taken = new Set(existingKeys);
  let n = 1;
  while (taken.has(`custom_${n}`)) n += 1;
  return `custom_${n}`;
}

/**
 * 実際に回したブリーフから進め方の工程定義を起こす（origin: derived）。
 * 担当・日数・必要情報・依存はそのまま写し、状態は持ち込まない。
 */
export function derivePlaybookStepsFromBrief(steps: Step[]): StepDef[] {
  return [...steps]
    .sort((a, b) => a.order - b.order)
    .map((s) => ({
      key: s.key,
      title: s.title,
      roleLabel: null,
      defaultAssigneeId: s.assigneeId,
      leadDays: s.leadDays,
      dependsOn: [...s.dependsOn],
      requiredFields: s.requiredFields.map((f) => ({ ...f })),
      reminderDaysBefore: s.reminderDaysBefore,
      optional: s.optional,
    }));
}

/** ブリーフの見出し項目定義を進め方へ写す */
export function deriveHeaderFieldsFromBrief(brief: Pick<Brief, 'headerFields'>): FieldDef[] {
  return brief.headerFields.map((f) => ({ ...f }));
}
