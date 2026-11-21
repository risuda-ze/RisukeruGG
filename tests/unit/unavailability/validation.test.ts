import { describe, expect, it } from 'vitest';
import { FULL_DAY_MASK } from '@/lib/unavailability/mask';
import {
  MAX_NOTES_PER_MONTH,
  parseUnavailabilityMonth,
  unavailabilityNoteSchema,
  unavailabilitySaveSchema,
} from '@/lib/validations/unavailability';

const updatedAt = { toDate: () => new Date('2026-11-14T03:00:00Z') };
const note = { id: 'n1', date: '2026-11-14', start: 20, end: 24, text: '返信は遅れる' };

describe('unavailabilityNoteSchema（UN-031 / UN-032）', () => {
  it('同一日内・1 時間単位・1〜100 字を通す', () => {
    expect(unavailabilityNoteSchema.safeParse(note).success).toBe(true);
    expect(unavailabilityNoteSchema.safeParse({ ...note, text: 'あ'.repeat(100) }).success).toBe(
      true
    );
  });

  it.each([
    ['本文が空', { text: '' }],
    ['本文が 101 字', { text: 'あ'.repeat(101) }],
    ['開始と終了が同じ', { start: 5, end: 5 }],
    ['開始が終了より後', { start: 6, end: 5 }],
    ['終了が 25', { end: 25 }],
    ['開始が小数', { start: 1.5 }],
    ['存在しない日付', { date: '2026-02-30' }],
    ['ID が空', { id: '' }],
  ])('%s は通さない', (_label, override) => {
    expect(unavailabilityNoteSchema.safeParse({ ...note, ...override }).success).toBe(false);
  });
});

describe('parseUnavailabilityMonth（読み取り側の検証）', () => {
  it('正しいドキュメントを型付けする', () => {
    expect(
      parseUnavailabilityMonth({
        userId: 'u1',
        month: '2026-11',
        days: { '2026-11-14': 15728640 },
        notes: [note],
        updatedAt,
      })
    ).toEqual({
      userId: 'u1',
      month: '2026-11',
      days: { '2026-11-14': 15728640 },
      notes: [note],
      updatedAt: new Date('2026-11-14T03:00:00Z'),
    });
  });

  it('days / notes が無いドキュメントは空として扱う', () => {
    expect(parseUnavailabilityMonth({ userId: 'u1', month: '2026-11', updatedAt })).toMatchObject({
      days: {},
      notes: [],
    });
  });

  it('形が合わない日・メモだけを捨て、残りは表示する', () => {
    const parsed = parseUnavailabilityMonth({
      userId: 'u1',
      month: '2026-11',
      days: {
        '2026-11-14': 1,
        '2026-12-01': 1, // 別の月
        '2026-11-31': 1, // 存在しない日
        '2026-11-15': 0, // 0 は保存しない
        '2026-11-16': FULL_DAY_MASK + 1, // 24 ビットを超える
        '2026-11-17': 'x',
      },
      notes: [note, { ...note, id: 'n2', date: '2026-12-01' }, { ...note, id: 'n3', text: '' }, 1],
      updatedAt,
    });
    expect(parsed?.days).toEqual({ '2026-11-14': 1 });
    expect(parsed?.notes).toEqual([note]);
  });

  it('ドキュメント自体の形が合わなければ null', () => {
    expect(parseUnavailabilityMonth({ userId: 'u1', month: '2026-13', updatedAt })).toBeNull();
    expect(parseUnavailabilityMonth({ userId: 'u1', month: '2026-11' })).toBeNull();
    expect(parseUnavailabilityMonth(null)).toBeNull();
  });
});

describe('unavailabilitySaveSchema（書き込み前の検証）', () => {
  const schema = unavailabilitySaveSchema('2026-11');

  it('その月の日マスク（0 は消去）とメモを通す', () => {
    expect(
      schema.safeParse({ days: { '2026-11-14': 0, '2026-11-15': FULL_DAY_MASK }, notes: [note] })
        .success
    ).toBe(true);
    expect(schema.safeParse({ days: {} }).success).toBe(true);
  });

  it('別の月の日付・24 ビットを超えるマスクは通さない', () => {
    expect(schema.safeParse({ days: { '2026-12-01': 1 } }).success).toBe(false);
    expect(schema.safeParse({ days: { '2026-11-14': FULL_DAY_MASK + 1 } }).success).toBe(false);
    expect(schema.safeParse({ days: { '2026-11-14': -1 } }).success).toBe(false);
  });

  it('メモは 200 件まで（UN-034）。別の月・ID の重複は通さない', () => {
    const notes = (count: number) =>
      Array.from({ length: count }, (_, i) => ({ ...note, id: `n${i}` }));
    expect(schema.safeParse({ days: {}, notes: notes(MAX_NOTES_PER_MONTH) }).success).toBe(true);
    expect(schema.safeParse({ days: {}, notes: notes(MAX_NOTES_PER_MONTH + 1) }).success).toBe(
      false
    );
    expect(schema.safeParse({ days: {}, notes: [{ ...note, date: '2026-12-01' }] }).success).toBe(
      false
    );
    expect(schema.safeParse({ days: {}, notes: [note, note] }).success).toBe(false);
  });
});
