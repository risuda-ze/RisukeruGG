import { describe, expect, it } from 'vitest';
import { FULL_DAY_MASK, hoursToMask } from '@/lib/unavailability/mask';
import {
  groupByMonth,
  isInStorageWindow,
  mergeDayMasks,
  rangeToDayMasks,
  storageWindow,
} from '@/lib/unavailability/range';
import { purgeBeforeMonth } from '../../../functions/src/unavailability/month';

describe('rangeToDayMasks（日またぎの分割。UN-072）', () => {
  it('同じ日の区間', () => {
    expect(rangeToDayMasks('2026-11-14', 20, '2026-11-14', 24)).toEqual({
      '2026-11-14': hoursToMask(20, 24),
    });
  });

  it('22:00〜翌 02:00 は当日 22・23 時と翌日 0・1 時', () => {
    expect(rangeToDayMasks('2026-11-14', 22, '2026-11-15', 2)).toEqual({
      '2026-11-14': hoursToMask(22, 24),
      '2026-11-15': hoursToMask(0, 2),
    });
  });

  it('24:00 と翌日 0:00 は同じ意味（翌日のキーを作らない）', () => {
    const until24 = rangeToDayMasks('2026-11-14', 22, '2026-11-14', 24);
    expect(rangeToDayMasks('2026-11-14', 22, '2026-11-15', 0)).toEqual(until24);
  });

  it('間の日は終日、月と年をまたげる', () => {
    expect(rangeToDayMasks('2026-12-30', 23, '2027-01-01', 1)).toEqual({
      '2026-12-30': hoursToMask(23, 24),
      '2026-12-31': FULL_DAY_MASK,
      '2027-01-01': hoursToMask(0, 1),
    });
  });

  it('開始が終了より前でなければ拒否する', () => {
    expect(() => rangeToDayMasks('2026-11-14', 5, '2026-11-14', 5)).toThrow(RangeError);
    expect(() => rangeToDayMasks('2026-11-15', 0, '2026-11-14', 5)).toThrow(RangeError);
  });
});

describe('mergeDayMasks / groupByMonth', () => {
  it('追記は OR で、既存の対応不可を消さない（UN-083）', () => {
    const base = { '2026-11-14': hoursToMask(20, 24) };
    const added = { '2026-11-14': hoursToMask(9, 12), '2026-11-15': hoursToMask(0, 1) };
    expect(mergeDayMasks(base, added)).toEqual({
      '2026-11-14': hoursToMask(20, 24) | hoursToMask(9, 12),
      '2026-11-15': hoursToMask(0, 1),
    });
    expect(base).toEqual({ '2026-11-14': hoursToMask(20, 24) });
  });

  it('月をまたぐ日マスクを月ドキュメントごとに分ける', () => {
    expect(groupByMonth(rangeToDayMasks('2026-11-30', 22, '2026-12-01', 2))).toEqual({
      '2026-11': { '2026-11-30': hoursToMask(22, 24) },
      '2026-12': { '2026-12-01': hoursToMask(0, 2) },
    });
  });
});

describe('storageWindow（前月 1 日〜翌月末日。UN-020 / UN-021）', () => {
  it('当月の前後 1 ヶ月', () => {
    expect(storageWindow('2026-11-20')).toEqual({
      from: '2026-10-01',
      to: '2026-12-31',
      months: ['2026-10', '2026-11', '2026-12'],
    });
  });

  it('年をまたぐ、翌月がうるう年でない 2 月', () => {
    expect(storageWindow('2027-01-31')).toEqual({
      from: '2026-12-01',
      to: '2027-02-28',
      months: ['2026-12', '2027-01', '2027-02'],
    });
  });

  it('範囲の両端は含み、その外は含まない', () => {
    expect(isInStorageWindow('2026-10-01', '2026-11-20')).toBe(true);
    expect(isInStorageWindow('2026-12-31', '2026-11-20')).toBe(true);
    expect(isInStorageWindow('2026-09-30', '2026-11-20')).toBe(false);
    expect(isInStorageWindow('2027-01-01', '2026-11-20')).toBe(false);
  });
});

describe('purgeBeforeMonth（月次削除のしきい値。UN-022）', () => {
  it('11/1 0:00 JST の実行では 10 月より前を消す（10〜12 月を残す）', () => {
    expect(purgeBeforeMonth(new Date('2026-11-01T00:00:00+09:00'))).toBe('2026-10');
  });

  it('UTC ではまだ前月でも JST の月で決める', () => {
    expect(purgeBeforeMonth(new Date('2026-10-31T15:00:00Z'))).toBe('2026-10');
    expect(purgeBeforeMonth(new Date('2026-10-31T14:59:59Z'))).toBe('2026-09');
  });

  it('1 月の実行は前年 12 月がしきい値', () => {
    expect(purgeBeforeMonth(new Date('2027-01-01T00:00:00+09:00'))).toBe('2026-12');
  });

  it('保存範囲の先頭の月と一致する', () => {
    expect(purgeBeforeMonth(new Date('2026-11-20T12:00:00+09:00'))).toBe(
      storageWindow('2026-11-20').months[0]
    );
  });
});
