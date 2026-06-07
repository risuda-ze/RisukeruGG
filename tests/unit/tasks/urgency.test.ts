import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { getUrgencyLevel, getOverDays } from '@/lib/urgency';

const FIXED_NOW = new Date('2026-06-03T12:00:00.000Z');

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

describe('getUrgencyLevel', () => {
  it('isDone が true なら done（dueDate に関わらず）', () => {
    expect(getUrgencyLevel(null, true)).toBe('done');
    expect(getUrgencyLevel(new Date('2026-06-01'), true)).toBe('done');
    expect(getUrgencyLevel(new Date('2026-06-10'), true)).toBe('done');
  });

  it('dueDate が null なら normal', () => {
    expect(getUrgencyLevel(null, false)).toBe('normal');
  });

  it('dueDate が過去なら over', () => {
    expect(getUrgencyLevel(new Date('2026-06-02'), false)).toBe('over');
    expect(getUrgencyLevel(new Date('2026-01-01'), false)).toBe('over');
  });

  it('dueDate が今日（当日）なら today', () => {
    expect(getUrgencyLevel(new Date('2026-06-03'), false)).toBe('today');
  });

  it('dueDate が明日（1日後）なら soon', () => {
    expect(getUrgencyLevel(new Date('2026-06-04'), false)).toBe('soon');
  });

  it('dueDate が明後日（2日後）なら soon', () => {
    expect(getUrgencyLevel(new Date('2026-06-05'), false)).toBe('soon');
  });

  it('dueDate が 3日後以降なら normal', () => {
    expect(getUrgencyLevel(new Date('2026-06-06'), false)).toBe('normal');
    expect(getUrgencyLevel(new Date('2026-12-31'), false)).toBe('normal');
  });
});

describe('getOverDays', () => {
  it('前日期限は 1日超過', () => {
    expect(getOverDays(new Date('2026-06-02'))).toBe(1);
  });

  it('31日前は 31日超過', () => {
    expect(getOverDays(new Date('2026-05-03'))).toBe(31);
  });
});
