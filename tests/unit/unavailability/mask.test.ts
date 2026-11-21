import { describe, expect, it } from 'vitest';
import {
  FULL_DAY_MASK,
  countHours,
  hoursToMask,
  isFreeDuring,
  maskToRanges,
} from '@/lib/unavailability/mask';

describe('hoursToMask（時間帯 → 日マスク）', () => {
  it('20:00〜24:00 はビット 20〜23（正本の例と一致）', () => {
    expect(hoursToMask(20, 24)).toBe(0xf00000);
    expect(hoursToMask(20, 24)).toBe(15728640);
  });

  it('0 時始まりと終日', () => {
    expect(hoursToMask(0, 1)).toBe(1);
    expect(hoursToMask(0, 24)).toBe(FULL_DAY_MASK);
  });

  it('範囲外・逆順・同値・小数は拒否する', () => {
    expect(() => hoursToMask(-1, 3)).toThrow(RangeError);
    expect(() => hoursToMask(0, 25)).toThrow(RangeError);
    expect(() => hoursToMask(5, 5)).toThrow(RangeError);
    expect(() => hoursToMask(6, 5)).toThrow(RangeError);
    expect(() => hoursToMask(0.5, 2)).toThrow(RangeError);
  });
});

describe('maskToRanges（日マスク → 区間）', () => {
  it('連続する時間を 1 区間にまとめる', () => {
    expect(maskToRanges(hoursToMask(9, 12) | hoursToMask(20, 24))).toEqual([
      { start: 9, end: 12 },
      { start: 20, end: 24 },
    ]);
  });

  it('0 は区間なし、終日は 0〜24', () => {
    expect(maskToRanges(0)).toEqual([]);
    expect(maskToRanges(FULL_DAY_MASK)).toEqual([{ start: 0, end: 24 }]);
  });

  it('hoursToMask と往復できる', () => {
    expect(maskToRanges(hoursToMask(0, 1))).toEqual([{ start: 0, end: 1 }]);
    expect(maskToRanges(hoursToMask(23, 24))).toEqual([{ start: 23, end: 24 }]);
  });
});

describe('countHours / isFreeDuring', () => {
  it('時間数は立っているビットの数', () => {
    expect(countHours(0)).toBe(0);
    expect(countHours(hoursToMask(9, 12) | hoursToMask(20, 24))).toBe(7);
    expect(countHours(FULL_DAY_MASK)).toBe(24);
  });

  it('時間帯フィルタは 1 時間でも重なれば「空いていない」', () => {
    const mask = hoursToMask(20, 24);
    expect(isFreeDuring(mask, hoursToMask(18, 20))).toBe(true);
    expect(isFreeDuring(mask, hoursToMask(19, 21))).toBe(false);
    expect(isFreeDuring(0, FULL_DAY_MASK)).toBe(true);
  });
});
