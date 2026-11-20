import type { UnavailabilitySaveInput } from '@/lib/validations/unavailability';
import type { DayMasks, UnavailabilityNote } from '@/types/unavailability';
import { groupByMonth, monthOf, rangeToDayMasks } from './range';

// 自分の詳細での未保存の変更（UN-036 / UN-071）。「保存」を押すまでブラウザ内に持ち、
// 購読で届く保存済みの内容の上に重ねて表示する

/** メモを特定するキー。保存済みのメモは保存されている日付で作るので、編集で日付を変えてもキーは変わらない */
export function noteKey(note: Pick<UnavailabilityNote, 'date' | 'id'>): string {
  return `${note.date}:${note.id}`;
}

/** 未保存の変更 */
export interface UnavailabilityDraft {
  /** 変更した日 → 変更後の日マスク（0 はその日の対応不可をすべて消す） */
  days: DayMasks;
  /** メモの差分。キーは `noteKey`。値は追加・編集後のメモ、null は削除 */
  notes: Record<string, UnavailabilityNote | null>;
}

export const EMPTY_DRAFT: UnavailabilityDraft = { days: {}, notes: {} };

/** 保存済みの内容（購読データ）のうち、未保存の変更を重ねるのに使う部分 */
interface Saved {
  days: DayMasks;
  notes: UnavailabilityNote[];
}
const NOTHING_SAVED: Saved = { days: {}, notes: [] };

/** 保存済みの日マスクに未保存の塗り・消しを重ねる */
export function draftedDays(saved: Saved | undefined, draft: UnavailabilityDraft): DayMasks {
  return { ...(saved ?? NOTHING_SAVED).days, ...draft.days };
}

/** 表示するメモ 1 件。`key` は編集・削除の対象を指す */
export interface DraftedNote {
  key: string;
  note: UnavailabilityNote;
  /** 未保存の追加・編集か */
  unsaved: boolean;
}

/** 保存済みのメモに未保存の追加・編集・削除を重ねる */
export function draftedNotes(saved: Saved | undefined, draft: UnavailabilityDraft): DraftedNote[] {
  const savedNotes = (saved ?? NOTHING_SAVED).notes;
  const savedKeys = new Set(savedNotes.map(noteKey));
  const kept = savedNotes.flatMap((note): DraftedNote[] => {
    const key = noteKey(note);
    if (!(key in draft.notes)) return [{ key, note, unsaved: false }];
    const edited = draft.notes[key];
    return edited ? [{ key, note: edited, unsaved: true }] : [];
  });
  // 保存済みに無いキーは追加（別の端末で消されたメモの編集も、追加として残す）
  const added = Object.entries(draft.notes).flatMap(([key, note]): DraftedNote[] =>
    note && !savedKeys.has(key) ? [{ key, note, unsaved: true }] : []
  );
  return [...kept, ...added];
}

/**
 * 時間の範囲（表示範囲の先頭からの時間数。両端を含み、順序は問わない）を塗る・消す。
 * 返り値は変更後の日マスク（範囲に入った日だけ）。`editable` が false を返す日は変更しない。
 */
export function paintHours(
  days: DayMasks,
  dates: string[],
  from: number,
  to: number,
  paint: boolean,
  editable: (date: string) => boolean
): DayMasks {
  const first = Math.max(0, Math.min(from, to));
  const last = Math.min(dates.length * 24 - 1, Math.max(from, to));
  if (first > last) return {};
  // 終了は排他的境界。最後の 1 時間が 23 時台なら、その日の 24 時までとする
  const painted = rangeToDayMasks(
    dates[Math.floor(first / 24)],
    first % 24,
    dates[Math.floor(last / 24)],
    (last % 24) + 1
  );
  const changed: DayMasks = {};
  for (const [date, mask] of Object.entries(painted)) {
    if (!editable(date)) continue;
    const current = days[date] ?? 0;
    changed[date] = paint ? current | mask : current & ~mask;
  }
  return changed;
}

/** 保存済みと同じになった変更（塗ってから消した等）を取り除く */
export function pruneDraft(
  saved: Saved | undefined,
  draft: UnavailabilityDraft
): UnavailabilityDraft {
  const base = saved ?? NOTHING_SAVED;
  const savedNotes = new Map(base.notes.map((note) => [noteKey(note), note]));
  const same = (a: UnavailabilityNote, b: UnavailabilityNote) =>
    a.date === b.date && a.start === b.start && a.end === b.end && a.text === b.text;
  return {
    days: Object.fromEntries(
      Object.entries(draft.days).filter(([date, mask]) => mask !== (base.days[date] ?? 0))
    ),
    notes: Object.fromEntries(
      Object.entries(draft.notes).filter(([key, note]) => {
        const original = savedNotes.get(key);
        // 保存済みに無いメモの削除、保存済みと同じ内容への編集は変更なし
        return original ? !(note && same(note, original)) : note !== null;
      })
    ),
  };
}

/** 未保存の変更があるか */
export function isDirty(saved: Saved | undefined, draft: UnavailabilityDraft): boolean {
  const pruned = pruneDraft(saved, draft);
  return Object.keys(pruned.days).length > 0 || Object.keys(pruned.notes).length > 0;
}

/** その月のメモの件数（保存済みと未保存の追加を合わせた数。UN-034） */
export function countNotesInMonth(notes: DraftedNote[], month: string): number {
  return notes.filter(({ note }) => monthOf(note.date) === month).length;
}

/** メモの差分 1 件が書き換える月（保存されていた月と、変更後の月） */
function monthsTouchedBy(key: string, note: UnavailabilityNote | null): string[] {
  return [...new Set([monthOf(key), ...(note ? [monthOf(note.date)] : [])])];
}

/**
 * 「保存」で書き込む内容を月ドキュメントごとにまとめる（月ごとに 1 回の書き込み）。
 * `days` は変更した日だけ、`notes` はメモに変更がある月だけ、その月の全件を入れる。
 */
export function buildSaves(
  saved: Saved | undefined,
  draft: UnavailabilityDraft
): { month: string; changes: UnavailabilitySaveInput }[] {
  const pruned = pruneDraft(saved, draft);
  const daysByMonth = groupByMonth(pruned.days);
  const noteMonths = new Set(
    Object.entries(pruned.notes).flatMap(([key, note]) => monthsTouchedBy(key, note))
  );
  const notes = draftedNotes(saved, pruned);
  return [...new Set([...Object.keys(daysByMonth), ...noteMonths])].sort().map((month) => ({
    month,
    changes: {
      days: daysByMonth[month] ?? {},
      ...(noteMonths.has(month) && {
        notes: notes.map(({ note }) => note).filter((note) => monthOf(note.date) === month),
      }),
    },
  }));
}

/** 保存に成功した月の変更を、未保存の変更から取り除く。メモの差分は、書き換える月がすべて成功したものだけ取り除く */
export function dropSavedMonths(
  draft: UnavailabilityDraft,
  savedMonths: ReadonlySet<string>
): UnavailabilityDraft {
  return {
    days: Object.fromEntries(
      Object.entries(draft.days).filter(([date]) => !savedMonths.has(monthOf(date)))
    ),
    notes: Object.fromEntries(
      Object.entries(draft.notes).filter(
        ([key, note]) => !monthsTouchedBy(key, note).every((month) => savedMonths.has(month))
      )
    ),
  };
}
