import { isValid, parseISO } from 'date-fns';
import { z } from 'zod';
import { FULL_DAY_MASK } from '@/lib/unavailability/mask';
import { monthOf } from '@/lib/unavailability/range';
import type { DayMasks, UnavailabilityMonth, UnavailabilityNote } from '@/types/unavailability';

/** 1 人 1 ヶ月あたりのメモの上限（UN-034） */
export const MAX_NOTES_PER_MONTH = 200;

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

/** 実在する日付（`yyyy-mm-dd`） */
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => isValid(parseISO(value)));

/** 保存されている日マスク。0 は保存しない（キーごと消す） */
const storedMaskSchema = z.number().int().min(1).max(FULL_DAY_MASK);

export const unavailabilityNoteSchema = z
  .object({
    id: z.string().min(1),
    date: dateSchema,
    start: z.number().int().min(0).max(23),
    end: z.number().int().min(1).max(24),
    text: z.string().min(1).max(100),
  })
  .refine((note) => note.start < note.end);

const monthDocSchema = z.object({
  userId: z.string().min(1),
  month: monthSchema,
  // 対応不可もメモも保存したことがない側のフィールドは存在しない
  days: z.record(z.string(), z.unknown()).optional(),
  notes: z.array(z.unknown()).optional(),
  updatedAt: z.custom<{ toDate: () => Date }>(
    (v) => typeof v === 'object' && v !== null && 'toDate' in v && typeof v.toDate === 'function'
  ),
});

/**
 * 月ドキュメントの生データを型付けする。
 * ルールは map・配列の中身を検証できないため、形が合わない日・メモは捨てる（画面全体は落とさない）。
 * ドキュメント自体の形が合わなければ null。
 */
export function parseUnavailabilityMonth(raw: unknown): UnavailabilityMonth | null {
  const parsed = monthDocSchema.safeParse(raw);
  if (!parsed.success) return null;
  const { userId, month, updatedAt } = parsed.data;

  const days: DayMasks = {};
  for (const [date, value] of Object.entries(parsed.data.days ?? {})) {
    const mask = storedMaskSchema.safeParse(value);
    if (mask.success && dateSchema.safeParse(date).success && monthOf(date) === month) {
      days[date] = mask.data;
    }
  }

  const notes: UnavailabilityNote[] = [];
  for (const value of parsed.data.notes ?? []) {
    const note = unavailabilityNoteSchema.safeParse(value);
    if (note.success && monthOf(note.data.date) === month) notes.push(note.data);
  }

  return { userId, month, days, notes, updatedAt: updatedAt.toDate() };
}

/**
 * 1 回の保存で書き込む内容の検証。
 * `days` は変更した日だけ（0 はその日の対応不可をすべて消す）。
 * `notes` はメモに変更があるときだけ、その月のメモ全件を渡す。
 */
export function unavailabilitySaveSchema(month: string) {
  const inMonth = (date: string) => monthOf(date) === month;
  return z.object({
    days: z.record(dateSchema.refine(inMonth), z.number().int().min(0).max(FULL_DAY_MASK)),
    notes: z
      .array(unavailabilityNoteSchema.refine((note) => inMonth(note.date)))
      .max(MAX_NOTES_PER_MONTH)
      .refine((notes) => new Set(notes.map((note) => note.id)).size === notes.length)
      .optional(),
  });
}

export type UnavailabilitySaveInput = z.infer<ReturnType<typeof unavailabilitySaveSchema>>;
