/** 終日不可（ビット 0〜23 がすべて立つ） */
export const FULL_DAY_MASK = 0xffffff;

/** start 時〜end 時（end は排他的境界、0 <= start < end <= 24）を日マスクにする */
export function hoursToMask(start: number, end: number): number {
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > 24 || start >= end) {
    throw new RangeError(`時間帯が不正です: ${start}〜${end}`);
  }
  return (2 ** (end - start) - 1) * 2 ** start;
}

/** 日マスクを、連続する時間をまとめた区間（end は排他的境界）に戻す */
export function maskToRanges(mask: number): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  let start: number | null = null;
  for (let hour = 0; hour <= 24; hour++) {
    const on = hour < 24 && (mask & (1 << hour)) !== 0;
    if (on && start === null) start = hour;
    if (!on && start !== null) {
      ranges.push({ start, end: hour });
      start = null;
    }
  }
  return ranges;
}

/** 対応不可の時間数（立っているビットの数） */
export function countHours(mask: number): number {
  let count = 0;
  for (let hour = 0; hour < 24; hour++) {
    if ((mask & (1 << hour)) !== 0) count++;
  }
  return count;
}

/** 指定した時間帯（slotMask）に対応不可が 1 時間も重ならないか */
export function isFreeDuring(mask: number, slotMask: number): boolean {
  return (mask & slotMask) === 0;
}
