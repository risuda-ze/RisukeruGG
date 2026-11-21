import { addDays, addMonths, endOfMonth, format, parseISO } from 'date-fns';
import type { DayMasks } from '@/types/unavailability';
import { hoursToMask } from './mask';

// 日付はすべて JST の暦日ラベル（`yyyy-mm-dd`）として扱い、時刻・タイムゾーンの変換はしない

const DATE_FORMAT = 'yyyy-MM-dd';
const MONTH_FORMAT = 'yyyy-MM';

/** 日付が属する月（`yyyy-mm`） */
export function monthOf(date: string): string {
  return date.slice(0, 7);
}

/**
 * 開始（日付・時）〜終了（日付・時）を日付ごとの日マスクに分割する。
 * 終了は排他的境界で、`endHour` は 0〜24（24:00 は翌日 0:00 と同じ意味）。
 * 例: 11/14 22 時〜11/15 2 時 → 11/14 の 22・23 時と 11/15 の 0・1 時
 */
export function rangeToDayMasks(
  startDate: string,
  startHour: number,
  endDate: string,
  endHour: number
): DayMasks {
  const startsBeforeEnd = startDate < endDate || (startDate === endDate && startHour < endHour);
  if (!startsBeforeEnd) {
    throw new RangeError(
      `開始が終了より前ではありません: ${startDate} ${startHour}〜${endDate} ${endHour}`
    );
  }

  const days: DayMasks = {};
  for (
    let date = startDate;
    date <= endDate;
    date = format(addDays(parseISO(date), 1), DATE_FORMAT)
  ) {
    const from = date === startDate ? startHour : 0;
    const to = date === endDate ? endHour : 24;
    // 終了が 0:00 ちょうどの日は対象時間が無い
    if (from < to) days[date] = hoursToMask(from, to);
  }
  return days;
}

/** 既存の日マスクに追記する（OR。既存の対応不可は消さない） */
export function mergeDayMasks(base: DayMasks, added: DayMasks): DayMasks {
  const merged = { ...base };
  for (const [date, mask] of Object.entries(added)) {
    merged[date] = (merged[date] ?? 0) | mask;
  }
  return merged;
}

/** 日マスクを月ドキュメント単位（`yyyy-mm`）に分ける */
export function groupByMonth(days: DayMasks): Record<string, DayMasks> {
  const months: Record<string, DayMasks> = {};
  for (const [date, mask] of Object.entries(days)) {
    (months[monthOf(date)] ??= {})[date] = mask;
  }
  return months;
}

/** 保存・表示する範囲（前月 1 日〜翌月末日）。`today` は JST の当日 */
export function storageWindow(today: string): { from: string; to: string; months: string[] } {
  const base = parseISO(today);
  const prev = addMonths(base, -1);
  const next = addMonths(base, 1);
  return {
    from: `${format(prev, MONTH_FORMAT)}-01`,
    to: format(endOfMonth(next), DATE_FORMAT),
    months: [prev, base, next].map((d) => format(d, MONTH_FORMAT)),
  };
}

/** 日付が保存・表示する範囲の中か */
export function isInStorageWindow(date: string, today: string): boolean {
  const { from, to } = storageWindow(today);
  return from <= date && date <= to;
}
