import { describe, expect, it } from 'vitest';
import {
  EMPTY_DRAFT,
  buildSaves,
  countNotesInMonth,
  draftedDays,
  draftedNotes,
  dropSavedMonths,
  isDirty,
  noteKey,
  paintHours,
} from '@/lib/unavailability/draft';
import { hoursToMask } from '@/lib/unavailability/mask';
import { datesBetween } from '@/lib/unavailability/view';
import type { UnavailabilityNote } from '@/types/unavailability';

const dates = datesBetween('2026-10-01', '2026-12-31');
/** 日付と時 → 表示範囲の先頭からの時間数 */
const at = (date: string, hour: number) => dates.indexOf(date) * 24 + hour;
const everywhere = () => true;

const note = (id: string, date: string, start = 9, end = 10, text = id): UnavailabilityNote => ({
  id,
  date,
  start,
  end,
  text,
});

const saved = {
  days: { '2026-11-20': hoursToMask(20, 24) },
  notes: [note('a', '2026-11-20'), note('b', '2026-11-21')],
};

describe('paintHours（UN-070, UN-072）', () => {
  it('空の範囲を塗る。既存の対応不可は消さない', () => {
    expect(
      paintHours(saved.days, dates, at('2026-11-20', 9), at('2026-11-20', 11), true, everywhere)
    ).toEqual({ '2026-11-20': hoursToMask(9, 12) | hoursToMask(20, 24) });
  });

  it('対応不可の範囲を消す', () => {
    expect(
      paintHours(saved.days, dates, at('2026-11-20', 22), at('2026-11-20', 23), false, everywhere)
    ).toEqual({ '2026-11-20': hoursToMask(20, 22) });
  });

  it('下から上へドラッグしても同じ範囲になる', () => {
    expect(
      paintHours({}, dates, at('2026-11-20', 11), at('2026-11-20', 9), true, everywhere)
    ).toEqual({ '2026-11-20': hoursToMask(9, 12) });
  });

  it('日をまたぐ範囲は日付ごとに分ける（22 時〜翌 2 時 → 当日 22・23 時と翌日 0・1 時）', () => {
    expect(
      paintHours({}, dates, at('2026-11-20', 22), at('2026-11-21', 1), true, everywhere)
    ).toEqual({ '2026-11-20': hoursToMask(22, 24), '2026-11-21': hoursToMask(0, 2) });
  });

  it('月をまたいでも、表示範囲の最後の 1 時間まで塗れる（UN-021）', () => {
    expect(
      paintHours({}, dates, at('2026-11-30', 23), at('2026-12-01', 0), true, everywhere)
    ).toEqual({ '2026-11-30': hoursToMask(23, 24), '2026-12-01': hoursToMask(0, 1) });
    expect(
      paintHours({}, dates, at('2026-12-31', 23), at('2026-12-31', 23) + 5, true, everywhere)
    ).toEqual({ '2026-12-31': hoursToMask(23, 24) });
  });

  it('入力できない日（未読込の月）は変更しない', () => {
    expect(
      paintHours({}, dates, at('2026-11-30', 22), at('2026-12-01', 1), true, (date) =>
        date.startsWith('2026-11')
      )
    ).toEqual({ '2026-11-30': hoursToMask(22, 24) });
  });
});

describe('未保存の変更を購読データに重ねる（UN-036）', () => {
  const draft = {
    days: { '2026-11-20': 0, '2026-11-22': hoursToMask(0, 24) },
    notes: {
      [noteKey(saved.notes[0])]: note('a', '2026-11-20', 9, 12, '編集後'),
      [noteKey(saved.notes[1])]: null,
      '2026-11-25:new': note('new', '2026-11-25'),
    },
  };

  it('変更した日は未保存の値、それ以外は保存済みの値になる', () => {
    expect(draftedDays({ ...saved, days: { ...saved.days, '2026-11-01': 1 } }, draft)).toEqual({
      '2026-11-01': 1,
      '2026-11-20': 0,
      '2026-11-22': hoursToMask(0, 24),
    });
  });

  it('メモは編集・削除・追加を重ねる', () => {
    expect(draftedNotes(saved, draft)).toEqual([
      { key: '2026-11-20:a', note: note('a', '2026-11-20', 9, 12, '編集後'), unsaved: true },
      { key: '2026-11-25:new', note: note('new', '2026-11-25'), unsaved: true },
    ]);
  });

  it('未保存中に購読の更新が届いても、未保存の変更は消えない', () => {
    const updated = {
      days: { '2026-11-20': hoursToMask(0, 24), '2026-11-21': 1 },
      notes: [...saved.notes, note('c', '2026-11-23')],
    };
    expect(draftedDays(updated, draft)['2026-11-20']).toBe(0);
    expect(draftedDays(updated, draft)['2026-11-21']).toBe(1);
    expect(draftedNotes(updated, draft).map(({ key }) => key)).toEqual([
      '2026-11-20:a',
      '2026-11-23:c',
      '2026-11-25:new',
    ]);
  });

  it('月ドキュメントが無い（未入力）状態にも重ねられる', () => {
    expect(draftedDays(undefined, draft)).toEqual(draft.days);
    expect(draftedNotes(undefined, EMPTY_DRAFT)).toEqual([]);
  });

  it('月ごとのメモの件数は、保存済みと未保存の追加を合わせて数える（UN-034）', () => {
    const notes = draftedNotes(saved, {
      days: {},
      notes: { '2026-11-25:new': note('new', '2026-11-25') },
    });
    expect(countNotesInMonth(notes, '2026-11')).toBe(3);
    expect(countNotesInMonth(notes, '2026-12')).toBe(0);
  });
});

describe('isDirty', () => {
  it('変更が無ければ false。塗ってから消して元に戻した場合も false', () => {
    expect(isDirty(saved, EMPTY_DRAFT)).toBe(false);
    expect(
      isDirty(saved, { days: { '2026-11-20': hoursToMask(20, 24), '2026-11-21': 0 }, notes: {} })
    ).toBe(false);
    expect(
      isDirty(saved, { days: {}, notes: { '2026-11-20:a': saved.notes[0], '2026-11-30:x': null } })
    ).toBe(false);
  });

  it('塗り・消し・メモの変更があれば true', () => {
    expect(isDirty(saved, { days: { '2026-11-20': 0 }, notes: {} })).toBe(true);
    expect(isDirty(saved, { days: {}, notes: { '2026-11-20:a': null } })).toBe(true);
    expect(isDirty(undefined, { days: { '2026-11-20': 1 }, notes: {} })).toBe(true);
  });
});

describe('buildSaves（UN-071）', () => {
  it('変更した日だけを月ドキュメントごとにまとめる。メモに変更が無ければ notes を含めない', () => {
    expect(
      buildSaves(saved, {
        days: {
          '2026-11-20': 0,
          '2026-11-21': 0, // 保存済みと同じ（変更なし）
          '2026-12-01': hoursToMask(0, 2),
        },
        notes: {},
      })
    ).toEqual([
      { month: '2026-11', changes: { days: { '2026-11-20': 0 } } },
      { month: '2026-12', changes: { days: { '2026-12-01': hoursToMask(0, 2) } } },
    ]);
  });

  it('メモに変更がある月は、その月のメモを全件入れる', () => {
    expect(
      buildSaves(saved, {
        days: {},
        notes: { '2026-11-20:a': null, '2026-11-25:new': note('new', '2026-11-25') },
      })
    ).toEqual([
      {
        month: '2026-11',
        changes: { days: {}, notes: [note('b', '2026-11-21'), note('new', '2026-11-25')] },
      },
    ]);
  });

  it('メモを別の月へ移したら、元の月と移動先の月の両方を書く', () => {
    expect(
      buildSaves(saved, { days: {}, notes: { '2026-11-20:a': note('a', '2026-12-05') } })
    ).toEqual([
      { month: '2026-11', changes: { days: {}, notes: [note('b', '2026-11-21')] } },
      { month: '2026-12', changes: { days: {}, notes: [note('a', '2026-12-05')] } },
    ]);
  });

  it('変更が無ければ何も書かない', () => {
    expect(buildSaves(saved, EMPTY_DRAFT)).toEqual([]);
  });
});

describe('dropSavedMonths', () => {
  it('保存できた月の変更だけ取り除き、失敗した月の変更は残す', () => {
    const draft = {
      days: { '2026-11-20': 0, '2026-12-01': 1 },
      notes: {
        '2026-11-25:new': note('new', '2026-11-25'),
        '2026-12-02:x': note('x', '2026-12-02'),
        '2026-11-20:a': note('a', '2026-12-05'), // 11 月 → 12 月へ移動
      },
    };
    expect(dropSavedMonths(draft, draft, new Set(['2026-11']))).toEqual({
      days: { '2026-12-01': 1 },
      notes: {
        '2026-12-02:x': note('x', '2026-12-02'),
        '2026-11-20:a': note('a', '2026-12-05'),
      },
    });
    expect(dropSavedMonths(draft, draft, new Set(['2026-11', '2026-12']))).toEqual(EMPTY_DRAFT);
  });

  it('保存中に足した・変えた分は、同じ月の保存が成功しても残す（UN-036）', () => {
    const edited = note('a', '2026-11-20', 9, 10, '保存前の本文');
    const submitted = {
      days: { '2026-11-20': 1, '2026-11-21': 3 },
      notes: { '2026-11-20:a': edited },
    };
    // 保存中に、メモを 1 件追加し、編集中だったメモを書き直し、1 日を塗り直した
    const added = note('new', '2026-11-25');
    const reEdited = note('a', '2026-11-20', 9, 10, '保存中に書き直した本文');
    const current = {
      days: { '2026-11-20': 1, '2026-11-21': 7 },
      notes: { '2026-11-20:a': reEdited, '2026-11-25:new': added },
    };
    expect(dropSavedMonths(current, submitted, new Set(['2026-11']))).toEqual({
      days: { '2026-11-21': 7 },
      notes: { '2026-11-20:a': reEdited, '2026-11-25:new': added },
    });
  });
});
