import type { FieldDef, Step, StepStatus } from '@/types/briefs';

/**
 * 工程の状態遷移と着手可能判定（純粋関数）。
 *
 * 遷移規則（docs/仕様・計画/production/requirements.md）:
 *   waiting → ready         先行工程がすべて done | skipped になったとき（自動）
 *   ready → in_progress     着手（任意）
 *   ready | in_progress → done
 *   ready | in_progress → skipped   optional の工程のみ
 *   done | skipped → ready  差し戻し（メンバー、ブリーフの作成者、工程の担当者）
 */

/** 先行工程がすべて完了（done | skipped）しているか */
export function areDependenciesSatisfied(step: Step, stepsByKey: Map<string, Step>): boolean {
  return step.dependsOn.every((key) => {
    const dep = stepsByKey.get(key);
    // 参照先が消えている場合は満たされたものとして扱う（進行を止めない）
    if (!dep) return true;
    return dep.status === 'done' || dep.status === 'skipped';
  });
}

export interface ReadinessChange {
  stepId: string;
  stepKey: string;
  from: StepStatus;
  to: StepStatus;
}

/**
 * 依存関係から自動遷移すべき工程を返す。
 * - waiting かつ先行完了 → ready
 * - ready かつ先行未完了（差し戻し後など）→ waiting
 * 作業中・完了・スキップは触らない。
 */
export function deriveReadiness(steps: Step[]): ReadinessChange[] {
  const byKey = new Map(steps.map((s) => [s.key, s]));
  const changes: ReadinessChange[] = [];
  for (const step of steps) {
    const satisfied = areDependenciesSatisfied(step, byKey);
    if (step.status === 'waiting' && satisfied) {
      changes.push({ stepId: step.id, stepKey: step.key, from: 'waiting', to: 'ready' });
    } else if (step.status === 'ready' && !satisfied) {
      changes.push({ stepId: step.id, stepKey: step.key, from: 'ready', to: 'waiting' });
    }
  }
  return changes;
}

/** 値が「入力済み」とみなせるか */
export function hasFieldValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/** 未入力の必須項目 */
export function missingRequiredFields(step: Pick<Step, 'requiredFields' | 'fields'>): FieldDef[] {
  return step.requiredFields.filter((f) => f.required && !hasFieldValue(step.fields[f.key]));
}

/** 入力待ち: 着手可能・作業中なのに必須項目が埋まっていない */
export function isBlockedByInput(step: Step): boolean {
  if (step.status !== 'ready' && step.status !== 'in_progress') return false;
  return missingRequiredFields(step).length > 0;
}

export interface TransitionCheck {
  ok: boolean;
  reason?: string;
}

/** 手動遷移の可否 */
export function canTransition(step: Step, to: StepStatus): TransitionCheck {
  const from = step.status;
  if (from === to) return { ok: false, reason: '既にその状態です' };
  switch (to) {
    case 'in_progress':
      return from === 'ready'
        ? { ok: true }
        : { ok: false, reason: '着手できるのは「着手可能」の工程だけです' };
    case 'done':
      return from === 'ready' || from === 'in_progress'
        ? { ok: true }
        : { ok: false, reason: '先行工程が終わるまで完了にできません' };
    case 'skipped':
      if (!step.optional) return { ok: false, reason: 'この工程は飛ばせません' };
      return from === 'ready' || from === 'in_progress' || from === 'waiting'
        ? { ok: true }
        : { ok: false, reason: '完了済みの工程は飛ばせません' };
    case 'ready':
      return from === 'done' || from === 'skipped'
        ? { ok: true }
        : { ok: false, reason: '差し戻せるのは完了・スキップ済みの工程だけです' };
    case 'waiting':
      return { ok: false, reason: '待機状態は先行工程から自動で決まります' };
    default:
      return { ok: false, reason: '不正な遷移です' };
  }
}

/** 完了扱いか */
export function isStepClosed(status: StepStatus): boolean {
  return status === 'done' || status === 'skipped';
}
