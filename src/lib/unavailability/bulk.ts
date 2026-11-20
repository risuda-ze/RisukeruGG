import { addDays, format, isValid, parseISO } from 'date-fns';
import type { DayMasks } from '@/types/unavailability';
import { maskToRanges } from './mask';
import { isInStorageWindow, mergeDayMasks, rangeToDayMasks } from './range';

// CSV・定期入力（UN-080〜UN-087）。どちらも「展開 → プレビュー → 和集合で保存」の同じ経路を通す。
// ここは展開までの純関数。作るのは対応不可時間だけで、メモは扱わない

const DATE_FORMAT = 'yyyy-MM-dd';
const CSV_HEADER = 'date,start,end';
const BOM = '﻿';

const nextDay = (date: string) => format(addDays(parseISO(date), 1), DATE_FORMAT);
const hh = (hour: number) => `${String(hour).padStart(2, '0')}:00`;

/**
 * 開始時〜終了時を、その日（と、終了が開始より前なら翌日）の日マスクにする。
 * 終了は排他的境界。開始と終了が同じ場合は呼び出し側で弾くこと。
 */
function expandHours(date: string, start: number, end: number): DayMasks {
  return end > start
    ? rangeToDayMasks(date, start, date, end)
    : rangeToDayMasks(date, start, nextDay(date), end);
}

/** ファイルの中身を UTF-8 として読む（BOM は取り除く）。UTF-8 でなければ null */
export function decodeCsv(bytes: ArrayBuffer): string | null {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

export interface CsvError {
  /** ファイルの行番号（1 始まり。ヘッダー行・空行も数える） */
  line: number;
  reason: string;
}

export type CsvResult = { ok: true; days: DayMasks } | { ok: false; errors: CsvError[] };

/** `HH:00`（1 桁の時も可）→ 時。`max` を超える・1 時間刻みでない場合は null */
function parseHour(value: string, max: number): number | null {
  const match = /^(\d{1,2}):00$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  return hour <= max ? hour : null;
}

/** データ行 1 行を日マスクにする。不正なら理由を返す */
function parseCsvRow(cells: string[]): DayMasks | string {
  if (cells.length !== 3) return '列は date,start,end の 3 つにしてください';
  const [date, start, end] = cells;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isValid(parseISO(date))) {
    return 'date は実在する日付を yyyy-mm-dd で指定してください';
  }
  // start と end が両方空の行は終日不可
  if (start === '' && end === '') return rangeToDayMasks(date, 0, date, 24);
  if (start === '' || end === '')
    return 'start と end は両方指定するか、両方空（終日）にしてください';
  const startHour = parseHour(start, 23);
  const endHour = parseHour(end, 24);
  if (startHour === null) return 'start は 00:00〜23:00 の 1 時間刻み（HH:00）で指定してください';
  if (endHour === null) return 'end は 00:00〜24:00 の 1 時間刻み（HH:00）で指定してください';
  if (startHour === endHour) return 'start と end に同じ時刻は指定できません';
  return expandHours(date, startHour, endHour);
}

/**
 * CSV（ヘッダー行 `date,start,end`）を検証し、日付ごとの日マスクに展開する。
 * 1 行でも不正なら展開せず、不正な行番号と理由をすべて返す（UN-082）。
 * 改行は LF / CRLF / CR、セル前後の空白、空行、ヘッダーの大文字小文字、1 桁の時（`9:00`）は受け入れる。
 * 範囲（前月 1 日〜翌月末日）の外の日付はここでは不正にしない（プレビューで切り捨てる）。
 */
export function parseCsv(text: string): CsvResult {
  const lines = (text.startsWith(BOM) ? text.slice(1) : text).split(/\r\n|\n|\r/);
  const rows = lines
    .map((raw, index) => ({ line: index + 1, cells: raw.split(',').map((cell) => cell.trim()) }))
    .filter(({ cells }) => cells.join('') !== '');

  const header = rows[0];
  if (!header || header.cells.join(',').toLowerCase() !== CSV_HEADER) {
    return {
      ok: false,
      errors: [{ line: header?.line ?? 1, reason: `1 行目は ${CSV_HEADER} にしてください` }],
    };
  }

  let days: DayMasks = {};
  const errors: CsvError[] = [];
  for (const { line, cells } of rows.slice(1)) {
    const parsed = parseCsvRow(cells);
    if (typeof parsed === 'string') errors.push({ line, reason: parsed });
    else days = mergeDayMasks(days, parsed);
  }
  return errors.length > 0 ? { ok: false, errors } : { ok: true, days };
}

/**
 * 1 ヶ月ぶんの対応不可を CSV にする（UN-084）。連続する時間は 1 行にまとめ、BOM 付きで返す。
 * そのまま `parseCsv` で再取り込みできる。
 */
export function toCsv(days: DayMasks, month: string): string {
  const rows = Object.keys(days)
    .filter((date) => date.startsWith(`${month}-`))
    .sort()
    .flatMap((date) =>
      maskToRanges(days[date]).map(({ start, end }) => `${date},${hh(start)},${hh(end)}`)
    );
  return `${BOM}${[CSV_HEADER, ...rows].join('\r\n')}\r\n`;
}

export interface RecurringPattern {
  /** 開始日・終了日（`yyyy-mm-dd`。両端を含む） */
  from: string;
  to: string;
  /** 対象の曜日（0 = 日曜 〜 6 = 土曜） */
  weekdays: number[];
  /** 開始時（0〜23）と終了時（1〜24。排他的境界）。終了が開始より前なら翌日へまたぐ */
  start: number;
  end: number;
}

/** 定期入力のパターンを、期間内の該当曜日の日マスクへ一回限り展開する（UN-085）。パターン自体は保存しない */
export function expandRecurring({ from, to, weekdays, start, end }: RecurringPattern): DayMasks {
  if (start === end) throw new RangeError('開始時と終了時が同じです');
  let days: DayMasks = {};
  for (let date = from; date <= to; date = nextDay(date)) {
    if (weekdays.includes(parseISO(date).getDay())) {
      days = mergeDayMasks(days, expandHours(date, start, end));
    }
  }
  return days;
}

/** 展開結果から、保存・表示する範囲（前月 1 日〜翌月末日）の外の日付を切り捨てる（UN-086） */
export function clipToWindow(days: DayMasks, today: string): { days: DayMasks; dropped: number } {
  const entries = Object.entries(days);
  const kept = entries.filter(([date]) => isInStorageWindow(date, today));
  return { days: Object.fromEntries(kept), dropped: entries.length - kept.length };
}
