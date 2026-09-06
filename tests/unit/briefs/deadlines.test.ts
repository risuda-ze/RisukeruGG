import { describe, expect, it } from 'vitest';
import { computeDueDate, daysUntilDue, isSameDate, planDueDateRecalc } from '@/lib/briefs/deadlines';
import { makeStep } from './fixtures';

describe('computeDueDate', () => {
  it('公開日から leadDays 日前の日付（0 時）を返す', () => {
    const due = computeDueDate(new Date('2026-09-20T15:30:00'), 3);
    expect(due).toEqual(new Date('2026-09-17T00:00:00'));
  });

  it('公開日が null なら締切なし', () => {
    expect(computeDueDate(null, 3)).toBeNull();
  });

  it('負の leadDays は 0 として扱う', () => {
    expect(computeDueDate(new Date('2026-09-20'), -5)).toEqual(new Date('2026-09-20T00:00:00'));
  });
});

describe('planDueDateRecalc', () => {
  const steps = [
    makeStep({ id: 's1', key: 'a', leadDays: 7, dueDate: new Date('2026-09-13') }),
    makeStep({ id: 's2', key: 'b', leadDays: 3, dueDate: new Date('2026-09-17') }),
    makeStep({ id: 's3', key: 'c', leadDays: 1, dueDate: new Date('2026-09-10'), dueDateOverridden: true }),
  ];

  it('固定していない工程だけ再計算し、変化のあるものだけ返す', () => {
    const changes = planDueDateRecalc(steps, new Date('2026-09-25'));
    expect(changes.map((c) => c.stepKey)).toEqual(['a', 'b']);
    expect(changes[0]!.after).toEqual(new Date('2026-09-18T00:00:00'));
    expect(changes[1]!.after).toEqual(new Date('2026-09-22T00:00:00'));
  });

  it('同じ公開日なら変化なし', () => {
    expect(planDueDateRecalc(steps, new Date('2026-09-20'))).toEqual([]);
  });

  it('公開日を外すと締切が null になる', () => {
    const changes = planDueDateRecalc(steps, null);
    expect(changes).toHaveLength(2);
    expect(changes.every((c) => c.after === null)).toBe(true);
  });
});

describe('isSameDate / daysUntilDue', () => {
  it('時刻の違いは無視して日付で比較する', () => {
    expect(isSameDate(new Date('2026-09-01T01:00'), new Date('2026-09-01T23:00'))).toBe(true);
    expect(isSameDate(null, null)).toBe(true);
    expect(isSameDate(null, new Date())).toBe(false);
  });

  it('残り日数（負なら超過）', () => {
    const now = new Date('2026-09-06T12:00');
    expect(daysUntilDue(new Date('2026-09-08'), now)).toBe(2);
    expect(daysUntilDue(new Date('2026-09-04'), now)).toBe(-2);
    expect(daysUntilDue(null, now)).toBeNull();
  });
});
