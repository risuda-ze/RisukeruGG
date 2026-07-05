import { describe, expect, it } from 'vitest';
import {
  getExclusiveEnd,
  eventOccupiesDay,
  getEventLastDay,
  isMultiDayEvent,
} from '@/lib/utils/eventDays';

/** ローカルタイムで日時を生成 */
function at(y: number, m: number, d: number, h = 0, min = 0): Date {
  return new Date(y, m - 1, d, h, min, 0, 0);
}

describe('eventDays（Google カレンダー仕様: 排他的終了）', () => {
  describe('単日の終日予定（開始 00:00 〜 翌日 00:00）', () => {
    const event = { startAt: at(2026, 7, 5), endAt: at(2026, 7, 6) };

    it('当日には表示される', () => {
      expect(eventOccupiesDay(event, at(2026, 7, 5))).toBe(true);
    });

    it('翌日には表示されない（排他的終了）', () => {
      expect(eventOccupiesDay(event, at(2026, 7, 6))).toBe(false);
    });

    it('単日イベントとして扱う', () => {
      expect(isMultiDayEvent(event)).toBe(false);
      expect(getEventLastDay(event)).toEqual(at(2026, 7, 5));
    });
  });

  describe('複数日の終日予定（7/5 〜 7/7 = 終了 7/8 00:00）', () => {
    const event = { startAt: at(2026, 7, 5), endAt: at(2026, 7, 8) };

    it('7/5〜7/7 に表示され、7/8 には表示されない', () => {
      expect(eventOccupiesDay(event, at(2026, 7, 5))).toBe(true);
      expect(eventOccupiesDay(event, at(2026, 7, 6))).toBe(true);
      expect(eventOccupiesDay(event, at(2026, 7, 7))).toBe(true);
      expect(eventOccupiesDay(event, at(2026, 7, 8))).toBe(false);
    });

    it('最終日は 7/7', () => {
      expect(getEventLastDay(event)).toEqual(at(2026, 7, 7));
      expect(isMultiDayEvent(event)).toBe(true);
    });
  });

  describe('時刻付き予定', () => {
    it('同日内の予定は当日のみ表示', () => {
      const event = { startAt: at(2026, 7, 5, 10, 0), endAt: at(2026, 7, 5, 11, 0) };
      expect(eventOccupiesDay(event, at(2026, 7, 5))).toBe(true);
      expect(eventOccupiesDay(event, at(2026, 7, 6))).toBe(false);
      expect(isMultiDayEvent(event)).toBe(false);
    });

    it('深夜 00:00 ちょうどに終わる予定は翌日に表示されない', () => {
      const event = { startAt: at(2026, 7, 5, 22, 0), endAt: at(2026, 7, 6, 0, 0) };
      expect(eventOccupiesDay(event, at(2026, 7, 5))).toBe(true);
      expect(eventOccupiesDay(event, at(2026, 7, 6))).toBe(false);
      expect(isMultiDayEvent(event)).toBe(false);
      expect(getEventLastDay(event)).toEqual(at(2026, 7, 5));
    });

    it('日をまたぐ予定は両日に表示される', () => {
      const event = { startAt: at(2026, 7, 5, 22, 0), endAt: at(2026, 7, 6, 1, 0) };
      expect(eventOccupiesDay(event, at(2026, 7, 5))).toBe(true);
      expect(eventOccupiesDay(event, at(2026, 7, 6))).toBe(true);
      expect(isMultiDayEvent(event)).toBe(true);
    });
  });

  describe('旧仕様データの後方互換', () => {
    it('startAt == endAt の終日予定は開始日1日分として扱う', () => {
      const event = { startAt: at(2026, 7, 5), endAt: at(2026, 7, 5) };
      expect(getExclusiveEnd(event)).toEqual(at(2026, 7, 6));
      expect(eventOccupiesDay(event, at(2026, 7, 5))).toBe(true);
      expect(eventOccupiesDay(event, at(2026, 7, 6))).toBe(false);
      expect(isMultiDayEvent(event)).toBe(false);
    });

    it('最終日 23:59 終了の終日予定は最終日まで表示される', () => {
      const event = { startAt: at(2026, 7, 5), endAt: at(2026, 7, 7, 23, 59) };
      expect(eventOccupiesDay(event, at(2026, 7, 7))).toBe(true);
      expect(eventOccupiesDay(event, at(2026, 7, 8))).toBe(false);
      expect(getEventLastDay(event)).toEqual(at(2026, 7, 7));
    });
  });
});
