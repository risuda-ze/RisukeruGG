import { startOfDay, endOfDay } from 'date-fns';

/**
 * イベントの日付跨ぎ判定ユーティリティ。
 *
 * Google カレンダー仕様を標準とする:
 * - 終日予定は「開始日の 00:00 〜 最終日翌日の 00:00」（終了は排他的）で保持する
 * - 終了時刻ちょうど（例: 翌日 00:00）はイベントに含まれない
 *
 * 旧仕様（終了時刻を包含的に解釈していた）で保存された既存データは
 * 移行スクリプト（適用済みのため削除。Git 履歴の
 * scripts/migrate-allday-schedule-encoding.mjs を参照）で一括移行済みの
 * 前提とし、ここでは後方互換の分岐を持たない。
 */

interface EventRange {
  startAt: Date;
  endAt: Date;
}

/** イベントが指定日に表示されるべきか（終了境界は排他的） */
export function eventOccupiesDay(event: EventRange, day: Date): boolean {
  return event.startAt <= endOfDay(day) && event.endAt > startOfDay(day);
}

/** イベントが占有する最終日（その日の 00:00 を返す） */
export function getEventLastDay(event: EventRange): Date {
  return startOfDay(new Date(event.endAt.getTime() - 1));
}

/** 複数の暦日にまたがるイベントか */
export function isMultiDayEvent(event: EventRange): boolean {
  return startOfDay(event.startAt).getTime() < getEventLastDay(event).getTime();
}
