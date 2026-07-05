import { startOfDay, endOfDay, addDays } from 'date-fns';

/**
 * イベントの日付跨ぎ判定ユーティリティ。
 *
 * Google カレンダー仕様を標準とする:
 * - 終日予定は「開始日の 00:00 〜 最終日翌日の 00:00」（終了は排他的）で保持する
 * - 終了時刻ちょうど（例: 翌日 00:00）はイベントに含まれない
 *
 * 旧仕様データ（終日予定で startAt == endAt、または最終日 23:59 終了）も
 * 正しく解釈できるように後方互換を持たせている。
 */

interface EventRange {
  startAt: Date;
  endAt: Date;
}

/**
 * 排他的終了時刻を返す。
 * 旧仕様の終日予定（endAt <= startAt）は開始日1日分のイベントとして扱う。
 */
export function getExclusiveEnd(event: EventRange): Date {
  if (event.endAt.getTime() <= event.startAt.getTime()) {
    return addDays(startOfDay(event.startAt), 1);
  }
  return event.endAt;
}

/** イベントが指定日に表示されるべきか（終了境界は排他的） */
export function eventOccupiesDay(event: EventRange, day: Date): boolean {
  return event.startAt <= endOfDay(day) && getExclusiveEnd(event) > startOfDay(day);
}

/** イベントが占有する最終日（その日の 00:00 を返す） */
export function getEventLastDay(event: EventRange): Date {
  const lastDay = startOfDay(new Date(getExclusiveEnd(event).getTime() - 1));
  const firstDay = startOfDay(event.startAt);
  return lastDay < firstDay ? firstDay : lastDay;
}

/** 複数の暦日にまたがるイベントか */
export function isMultiDayEvent(event: EventRange): boolean {
  return startOfDay(event.startAt).getTime() < getEventLastDay(event).getTime();
}
