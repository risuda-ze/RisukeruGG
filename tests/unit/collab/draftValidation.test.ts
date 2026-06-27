import { describe, it, expect } from 'vitest';
import {
  parseProposedDates,
  normalizeParticipants,
  type ParticipantInput,
} from '../../../functions/src/collab/draftValidation';

describe('parseProposedDates', () => {
  it('有効な ISO 文字列を Date に変換する', () => {
    const iso = ['2026-07-01T10:00:00.000Z', '2026-07-02T12:30:00.000Z'];
    const { dates, invalidIndices } = parseProposedDates(iso);
    expect(invalidIndices).toEqual([]);
    expect(dates).toHaveLength(2);
    expect(dates[0].toISOString()).toBe('2026-07-01T10:00:00.000Z');
  });

  it('不正な日付文字列のインデックスを返す', () => {
    const { dates, invalidIndices } = parseProposedDates([
      '2026-07-01T10:00:00.000Z',
      'not-a-date',
      '',
    ]);
    expect(invalidIndices).toEqual([1, 2]);
    expect(dates).toHaveLength(1);
  });

  it('空配列は空の結果を返す', () => {
    expect(parseProposedDates([])).toEqual({ dates: [], invalidIndices: [] });
  });
});

describe('normalizeParticipants', () => {
  it('id/name/type のみに正規化し余分なフィールドを除去する', () => {
    const input = [
      { id: 'a', name: 'Alice', type: 'member', extra: 'x' },
    ] as unknown as ParticipantInput[];
    expect(normalizeParticipants(input)).toEqual([
      { id: 'a', name: 'Alice', type: 'member' },
    ]);
  });

  it('type が external 以外/未定義のときは member に寄せる', () => {
    const input = [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B', type: 'external' },
    ] as unknown as ParticipantInput[];
    expect(normalizeParticipants(input)).toEqual([
      { id: 'a', name: 'A', type: 'member' },
      { id: 'b', name: 'B', type: 'external' },
    ]);
  });

  it('id/name が文字列でない不正要素を除去する', () => {
    const input = [
      { id: 'ok', name: 'OK', type: 'member' },
      { id: 123, name: 'NG' },
      null,
    ] as unknown as ParticipantInput[];
    expect(normalizeParticipants(input)).toEqual([
      { id: 'ok', name: 'OK', type: 'member' },
    ]);
  });

  it('結果に undefined 値が含まれない', () => {
    const input = [{ id: 'a', name: 'A' }] as unknown as ParticipantInput[];
    const result = normalizeParticipants(input);
    for (const p of result) {
      expect(Object.values(p).every((v) => v !== undefined)).toBe(true);
    }
  });
});
