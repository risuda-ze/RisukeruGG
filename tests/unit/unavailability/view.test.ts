import { describe, expect, it } from 'vitest';
import { hoursToMask } from '@/lib/unavailability/mask';
import { storageWindow } from '@/lib/unavailability/range';
import {
  centerOffset,
  countUnavailable,
  datesBetween,
  dayLabel,
  groupByMember,
  isEveryoneFree,
  jstHour,
  lastUpdatedLabel,
  layoutNotes,
  monthsAround,
  orderMembers,
  scrollOffsetFor,
  slotMaskOf,
  virtualRange,
  weekCenter,
} from '@/lib/unavailability/view';
import type { UnavailabilityMonth, UnavailabilityNote } from '@/types/unavailability';

const jst = (iso: string) => new Date(`${iso}+09:00`);

function monthDoc(
  userId: string,
  month: string,
  days: Record<string, number>,
  updatedAt: string,
  notes: UnavailabilityNote[] = []
): UnavailabilityMonth {
  return { userId, month, days, notes, updatedAt: jst(updatedAt) };
}

describe('表示範囲の日付', () => {
  it('前月 1 日〜翌月末日を 1 日ずつ並べる（UN-054）', () => {
    const { from, to } = storageWindow('2026-11-20');
    const dates = datesBetween(from, to);
    expect(dates[0]).toBe('2026-10-01');
    expect(dates[dates.length - 1]).toBe('2026-12-31');
    expect(dates).toHaveLength(31 + 30 + 31);
  });

  it('当日の週（日曜始まり）の中央は水曜（UN-054）', () => {
    // 2026-11-20 は金曜。その週は 11/15（日）〜11/21（土）
    expect(weekCenter('2026-11-20')).toBe('2026-11-18');
    expect(weekCenter('2026-11-15')).toBe('2026-11-18');
    expect(dayLabel('2026-11-20')).toEqual({ md: '11/20', weekday: '金' });
  });

  it('JST の現在の時を返す（UN-061）', () => {
    expect(jstHour(new Date('2026-11-19T15:30:00Z'))).toBe(0);
    expect(jstHour(new Date('2026-11-20T05:59:00Z'))).toBe(14);
  });
});

describe('orderMembers', () => {
  const members = ['a', 'me', 'b'].map((userId) => ({ userId }));
  const ids = (list: { userId: string }[]) => list.map((m) => m.userId);

  it('自分を最上段に置く（UN-052）', () => {
    expect(ids(orderMembers(members, 'me', new Set()))).toEqual(['me', 'a', 'b']);
  });

  it('絞り込み後も自分が含まれていれば最上段のまま（UN-052）', () => {
    expect(ids(orderMembers(members, 'me', new Set(['b', 'me'])))).toEqual(['me', 'b']);
  });

  it('選んだメンバーだけを表示する。自分を選んでいなければ自分は出さない', () => {
    expect(ids(orderMembers(members, 'me', new Set(['a', 'b'])))).toEqual(['a', 'b']);
  });
});

describe('groupByMember / countUnavailable / lastUpdatedLabel', () => {
  const byMember = groupByMember([
    monthDoc('a', '2026-11', { '2026-11-20': 0xf00000 }, '2026-11-17T23:00:00'),
    monthDoc('a', '2026-12', { '2026-12-01': 1 }, '2026-11-10T09:00:00'),
    monthDoc('b', '2026-11', { '2026-11-20': 1 }, '2026-11-20T00:10:00'),
    monthDoc('c', '2026-11', {}, '2026-11-01T12:00:00'),
  ]);

  it('読み込み済みの月をメンバーごとにまとめ、updatedAt は最新を取る（UN-053）', () => {
    expect(byMember.get('a')?.days).toEqual({ '2026-11-20': 0xf00000, '2026-12-01': 1 });
    expect(byMember.get('a')?.updatedAt).toEqual(jst('2026-11-17T23:00:00'));
  });

  it('その日に 1 時間でも対応不可がある人数を、表示中のメンバーで数える（UN-051）', () => {
    expect(countUnavailable(['a', 'b', 'c', 'none'], byMember, '2026-11-20')).toBe(2);
    expect(countUnavailable(['b', 'c'], byMember, '2026-11-20')).toBe(1);
    expect(countUnavailable(['a', 'b'], byMember, '2026-11-21')).toBe(0);
  });

  it('最終更新は JST の暦日の差で出す（UN-053）', () => {
    expect(lastUpdatedLabel(byMember.get('a')?.updatedAt, '2026-11-20')).toBe('最終更新 3日前');
    expect(lastUpdatedLabel(byMember.get('b')?.updatedAt, '2026-11-20')).toBe('最終更新 今日');
  });

  it('月ドキュメントが 1 つも無ければ「未入力」。不可をすべて消した月があれば入力済み（UN-053）', () => {
    expect(lastUpdatedLabel(byMember.get('none')?.updatedAt, '2026-11-20')).toBe('未入力');
    expect(lastUpdatedLabel(byMember.get('c')?.updatedAt, '2026-11-20')).toBe('最終更新 19日前');
  });
});

describe('仮想スクロール（UN-091）', () => {
  it('表示領域と前後 1 画面ぶんだけを描画範囲にする', () => {
    // 1 行 40px、表示領域 400px（10 行）、2000px スクロール済み → 50〜59 行が表示中
    expect(virtualRange(2000, 400, 40, 2208, 400)).toEqual({ start: 40, end: 70 });
  });

  it('先頭・末尾ではみ出さない', () => {
    expect(virtualRange(0, 400, 40, 2208, 400)).toEqual({ start: 0, end: 20 });
    expect(virtualRange(2208 * 40 - 400, 400, 40, 2208, 400)).toEqual({ start: 2188, end: 2208 });
  });

  it('計測前（表示領域 0）は何も描画しない', () => {
    expect(virtualRange(0, 0, 40, 2208, 0)).toEqual({ start: 0, end: 0 });
  });
});

describe('表示位置の移動', () => {
  it('開始があれば開始を先頭に合わせる（UN-062）', () => {
    expect(scrollOffsetFor(50, 80, 44, 440)).toBe(50 * 44);
  });

  it('終了だけなら終了を末尾に合わせる', () => {
    expect(scrollOffsetFor(null, 80, 44, 440)).toBe(81 * 44 - 440);
    expect(scrollOffsetFor(null, 2, 44, 440)).toBe(0);
  });

  it('どちらも無ければ移動しない', () => {
    expect(scrollOffsetFor(null, null, 44, 440)).toBeNull();
  });

  it('指定した項目を表示領域の中央に置く（UN-054）', () => {
    expect(centerOffset(48, 44, 880)).toBe(48.5 * 44 - 440);
    expect(centerOffset(2, 44, 880)).toBe(0);
  });
});

describe('monthsAround（UN-090）', () => {
  const dates = datesBetween('2026-10-01', '2026-12-31');

  it('当月の中ほどを表示している間は当月だけ', () => {
    // 11/10〜11/20 を表示中。前後 7 日を足しても 11 月の中
    expect(monthsAround(dates, 40, 51, 7)).toEqual(['2026-11']);
  });

  it('前月・翌月の端まで 7 日以内に近づいたら、その月を足す', () => {
    // 11/5〜11/15 を表示中 → 前後 7 日で 10/29 に届く
    expect(monthsAround(dates, 35, 46, 7)).toEqual(['2026-10', '2026-11']);
    // 11/20〜11/28 を表示中 → 12/5 に届く
    expect(monthsAround(dates, 50, 59, 7)).toEqual(['2026-11', '2026-12']);
  });
});

describe('layoutNotes（UN-064）', () => {
  const note = (id: string, date: string, start: number, end: number): UnavailabilityNote => ({
    id,
    date,
    start,
    end,
    text: id,
  });
  const lanes = (notes: UnavailabilityNote[]) =>
    Object.fromEntries(layoutNotes(notes).map(({ note: n, lane }) => [n.id, lane]));

  it('同じ時間帯のメモは横に並べる', () => {
    expect(
      lanes([
        note('b', '2026-11-20', 10, 11),
        note('a', '2026-11-20', 9, 12),
        note('c', '2026-11-20', 11, 13),
      ])
    ).toEqual({ a: 0, b: 1, c: 1 });
  });

  it('重ならないメモ・別の日のメモは同じ列に置く', () => {
    expect(
      lanes([
        note('a', '2026-11-20', 9, 12),
        note('b', '2026-11-20', 12, 14),
        note('c', '2026-11-21', 9, 12),
      ])
    ).toEqual({ a: 0, b: 0, c: 0 });
  });
});

describe('時間帯フィルタ（UN-056）', () => {
  const byMember = groupByMember([
    monthDoc(
      'a',
      '2026-11',
      { '2026-11-20': hoursToMask(9, 12) | hoursToMask(20, 24), '2026-11-21': hoursToMask(0, 2) },
      '2026-11-20T00:00:00'
    ),
    monthDoc(
      'b',
      '2026-11',
      { '2026-11-20': hoursToMask(18, 22), '2026-11-21': hoursToMask(0, 24) },
      '2026-11-20T00:00:00'
    ),
    monthDoc('a', '2026-12', {}, '2026-11-20T00:00:00'),
  ]);
  const loaded = new Set(['2026-11', '2026-12']);
  const free = (ids: string[], date: string, start: number, end: number, months = loaded) => {
    const mask = slotMaskOf(start, end);
    if (mask === null) throw new Error('時間帯が無効');
    return isEveryoneFree(ids, byMember, date, mask, months);
  };

  it('表示中のメンバー全員がその時間帯に対応不可でない日は空き', () => {
    expect(free(['a', 'b'], '2026-11-20', 13, 15)).toBe(true);
    expect(free(['a', 'b'], '2026-11-22', 0, 24)).toBe(true);
  });

  it('1 人でも重なれば空きではない', () => {
    expect(free(['a', 'b'], '2026-11-20', 10, 14)).toBe(false); // a の 9〜12 時と重なる
    expect(free(['a', 'b'], '2026-11-21', 13, 15)).toBe(false); // b が終日
  });

  it('メンバーで絞り込んだら、絞り込み後のメンバーだけで判定する', () => {
    expect(free(['a'], '2026-11-21', 13, 15)).toBe(true);
    expect(free(['b'], '2026-11-20', 9, 12)).toBe(true);
  });

  it('終了は排他的境界。ちょうど隣り合う時間帯は重ならない', () => {
    expect(free(['a', 'b'], '2026-11-20', 12, 18)).toBe(true); // a は 12 時まで、b は 18 時から
    expect(free(['a', 'b'], '2026-11-20', 11, 18)).toBe(false);
    expect(free(['a', 'b'], '2026-11-20', 12, 19)).toBe(false);
    expect(free(['a'], '2026-11-20', 0, 9)).toBe(true);
    expect(free(['a'], '2026-11-20', 23, 24)).toBe(false);
  });

  it('月ドキュメントが無い（未入力の）メンバーは、対応不可なしとして判定する', () => {
    expect(free(['a', 'none'], '2026-11-20', 13, 15)).toBe(true);
    expect(free(['none'], '2026-11-20', 0, 24)).toBe(true);
  });

  it('まだ読み込んでいない月の日は空きにしない', () => {
    expect(free(['a', 'b'], '2026-10-15', 13, 15)).toBe(false);
    expect(free(['a', 'b'], '2026-12-05', 13, 15)).toBe(true);
    expect(free(['a', 'b'], '2026-12-05', 13, 15, new Set(['2026-11']))).toBe(false);
  });

  it('表示中のメンバーが 0 人なら空きにしない', () => {
    expect(free([], '2026-11-22', 13, 15)).toBe(false);
  });

  it('時間帯は開始と終了の両方があり、開始が終了より前のときだけ有効', () => {
    expect(slotMaskOf(13, 15)).toBe(hoursToMask(13, 15));
    expect(slotMaskOf(0, 24)).toBe(hoursToMask(0, 24));
    expect(slotMaskOf(13, null)).toBeNull();
    expect(slotMaskOf(null, 15)).toBeNull();
    expect(slotMaskOf(null, null)).toBeNull();
    expect(slotMaskOf(15, 15)).toBeNull();
    expect(slotMaskOf(15, 13)).toBeNull();
  });
});
