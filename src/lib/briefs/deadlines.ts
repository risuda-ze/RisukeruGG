import { differenceInCalendarDays, startOfDay, subDays } from 'date-fns';
import type { Step } from '@/types/briefs';

/**
 * 締切の逆算（純粋関数）。
 * `dueDate = publishAt − leadDays`（日付単位）。publishAt が null なら締切なし。
 */
export function computeDueDate(publishAt: Date | null, leadDays: number): Date | null {
  if (!publishAt) return null;
  return subDays(startOfDay(publishAt), Math.max(0, Math.floor(leadDays)));
}

/** 日付の同値判定（null 同士は等しい） */
export function isSameDate(a: Date | null, b: Date | null): boolean {
  if (a === null || b === null) return a === b;
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export interface DueDateChange {
  stepId: string;
  stepKey: string;
  before: Date | null;
  after: Date | null;
}

/**
 * 公開予定日の変更で再計算される締切の一覧を返す。
 * 手で固定した工程（dueDateOverridden）は対象外。変化のない工程は含めない。
 * 画面の差分プレビューと、操作層の実書き込みの両方がこの結果を使う。
 */
export function planDueDateRecalc(steps: Step[], publishAt: Date | null): DueDateChange[] {
  const changes: DueDateChange[] = [];
  for (const step of steps) {
    if (step.dueDateOverridden) continue;
    const after = computeDueDate(publishAt, step.leadDays);
    if (!isSameDate(step.dueDate, after)) {
      changes.push({ stepId: step.id, stepKey: step.key, before: step.dueDate, after });
    }
  }
  return changes;
}

/** 締切までの残り日数（負なら超過）。締切なしは null */
export function daysUntilDue(dueDate: Date | null, now: Date = new Date()): number | null {
  if (!dueDate) return null;
  return differenceInCalendarDays(startOfDay(dueDate), startOfDay(now));
}
