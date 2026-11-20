import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from 'date-fns';
import { toJstDateString } from '@/lib/googleCalendar/export';
import type { DayMasks, UnavailabilityMonth, UnavailabilityNote } from '@/types/unavailability';
import { hoursToMask, isFreeDuring } from './mask';
import { monthOf } from './range';

// 一覧・メンバー詳細の表示用の純関数。日付は JST の暦日ラベル（`yyyy-mm-dd`）として扱う

const DATE_FORMAT = 'yyyy-MM-dd';
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

/** from〜to（両端を含む）の日付一覧 */
export function datesBetween(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let date = from; date <= to; date = format(addDays(parseISO(date), 1), DATE_FORMAT)) {
    dates.push(date);
  }
  return dates;
}

/** 当日の週（日曜始まり）の中央の日（水曜） */
export function weekCenter(today: string): string {
  return format(addDays(startOfWeek(parseISO(today)), 3), DATE_FORMAT);
}

/** `11/20` と曜日 */
export function dayLabel(date: string): { md: string; weekday: string } {
  const parsed = parseISO(date);
  return { md: format(parsed, 'M/d'), weekday: WEEKDAYS[parsed.getDay()] };
}

/** JST の現在の時（0〜23） */
export function jstHour(now: Date): number {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).getUTCHours();
}

/** メンバー 1 人ぶんの、読み込み済みの月をまとめた内容 */
export interface MemberUnavailability {
  days: DayMasks;
  notes: UnavailabilityNote[];
  /** 読み込み済みの月ドキュメントの `updatedAt` のうち最新 */
  updatedAt: Date;
}

/** 読み込み済みの月ドキュメントをメンバーごとにまとめる。ドキュメントが 1 つも無いメンバーはキーを持たない */
export function groupByMember(docs: UnavailabilityMonth[]): Map<string, MemberUnavailability> {
  const byMember = new Map<string, MemberUnavailability>();
  for (const doc of docs) {
    const current = byMember.get(doc.userId);
    byMember.set(doc.userId, {
      days: { ...current?.days, ...doc.days },
      notes: [...(current?.notes ?? []), ...doc.notes],
      updatedAt: current && current.updatedAt > doc.updatedAt ? current.updatedAt : doc.updatedAt,
    });
  }
  return byMember;
}

/** 表示するメンバー。自分を最上段に置く。`selected` が空なら全員、そうでなければ選んだメンバーだけ */
export function orderMembers<T extends { userId: string }>(
  members: T[],
  selfId: string | null,
  selected: ReadonlySet<string>
): T[] {
  const shown = selected.size === 0 ? members : members.filter((m) => selected.has(m.userId));
  return [...shown.filter((m) => m.userId === selfId), ...shown.filter((m) => m.userId !== selfId)];
}

/** その日に対応不可がある人数（表示中のメンバーで数える） */
export function countUnavailable(
  memberIds: string[],
  byMember: ReadonlyMap<string, MemberUnavailability>,
  date: string
): number {
  return memberIds.filter((id) => (byMember.get(id)?.days[date] ?? 0) !== 0).length;
}

/**
 * 時間帯フィルタの時間帯マスク（UN-056）。開始時・終了時の両方があり、開始が終了より前のときだけ有効。
 * 片方だけ・開始が終了以降は null（フィルタなし）。
 */
export function slotMaskOf(start: number | null, end: number | null): number | null {
  return start !== null && end !== null && start < end ? hoursToMask(start, end) : null;
}

/**
 * その日、表示中のメンバーの誰も、指定した時間帯に対応不可でないか（UN-056）。
 * 月ドキュメントが無いメンバーは対応不可なしとして数える（空白＝対応可能）。
 * まだ読み込んでいない月の日と、表示中のメンバーが 0 人のときは false（空いていると見せない）。
 */
export function isEveryoneFree(
  memberIds: string[],
  byMember: ReadonlyMap<string, MemberUnavailability>,
  date: string,
  slotMask: number,
  loadedMonths: ReadonlySet<string>
): boolean {
  return (
    memberIds.length > 0 &&
    loadedMonths.has(monthOf(date)) &&
    memberIds.every((id) => isFreeDuring(byMember.get(id)?.days[date] ?? 0, slotMask))
  );
}

/** 「最終更新」の表示。月ドキュメントが 1 つも無ければ「未入力」 */
export function lastUpdatedLabel(updatedAt: Date | undefined, today: string): string {
  if (!updatedAt) return '未入力';
  const days = differenceInCalendarDays(parseISO(today), parseISO(toJstDateString(updatedAt)));
  return days <= 0 ? '最終更新 今日' : `最終更新 ${days}日前`;
}

/**
 * 仮想スクロールで描画する範囲（end は排他的）。
 * 表示領域と、その前後 `overscan` px ぶんを含める。
 */
export function virtualRange(
  offset: number,
  viewport: number,
  itemSize: number,
  count: number,
  overscan: number
): { start: number; end: number } {
  return {
    start: Math.max(0, Math.floor((offset - overscan) / itemSize)),
    end: Math.min(count, Math.ceil((offset + viewport + overscan) / itemSize)),
  };
}

/** 表示位置を移動するときのスクロール量。`from` があれば先頭に、無ければ `to`（その項目を含む）を末尾に合わせる */
export function scrollOffsetFor(
  from: number | null,
  to: number | null,
  itemSize: number,
  viewport: number
): number | null {
  if (from !== null) return from * itemSize;
  if (to !== null) return Math.max(0, (to + 1) * itemSize - viewport);
  return null;
}

/** 項目を表示領域の中央に置くスクロール量 */
export function centerOffset(index: number, itemSize: number, viewport: number): number {
  return Math.max(0, (index + 0.5) * itemSize - viewport / 2);
}

/** 購読を足す月を決めるときの余白（表示中の範囲の前後この日数に入った月を読む） */
export const MONTH_LOAD_MARGIN_DAYS = 3;

/** `dates[start]`〜`dates[end - 1]` とその前後 `margin` 日が属する月 */
export function monthsAround(
  dates: string[],
  start: number,
  end: number,
  margin: number
): string[] {
  const slice = dates.slice(Math.max(0, start - margin), end + margin);
  return [...new Set(slice.map(monthOf))];
}

/**
 * メモを横に並べる列（lane）を決める。同じ日で時間帯が重なるメモは別の列に置く。
 * 返り値の順序は日付・開始時の昇順。
 */
export function layoutNotes(
  notes: UnavailabilityNote[]
): { note: UnavailabilityNote; lane: number }[] {
  const sorted = [...notes].sort(
    (a, b) => a.date.localeCompare(b.date) || a.start - b.start || a.end - b.end
  );
  // 列ごとの「最後に置いたメモ」。同じ日で終了時が開始時以下なら同じ列に続けて置ける
  const lanes: UnavailabilityNote[] = [];
  return sorted.map((note) => {
    const free = lanes.findIndex((last) => last.date !== note.date || last.end <= note.start);
    const lane = free === -1 ? lanes.length : free;
    lanes[lane] = note;
    return { note, lane };
  });
}
