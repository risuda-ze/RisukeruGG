import { FieldPath, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { z } from 'zod';
import { db } from '@/lib/firebase/client';
import type { GoogleCalendarExport } from '@/types/entities';

/**
 * Google カレンダー書き出しの状態（users/{uid}.googleCalendarExports.{teamId}）。
 * calendarId は再書き出しで同じ副カレンダーへ書くため、exportedAt は最終書き出し日時の表示に使う。
 */

const FIELD = 'googleCalendarExports';

const exportStateSchema = z.object({
  calendarId: z.string(),
  // serverTimestamp() の確定前は null で届く
  exportedAt: z
    .custom<{
      toDate: () => Date;
    }>((v) => typeof v === 'object' && v !== null && 'toDate' in v && typeof v.toDate === 'function')
    .nullish(),
});

/** users/{uid}.googleCalendarExports の生データを型付けする。形が合わないチームの分は捨てる */
export function parseGoogleCalendarExports(raw: unknown): Record<string, GoogleCalendarExport> {
  const parsed = z.record(z.string(), z.unknown()).safeParse(raw);
  if (!parsed.success) return {};

  const result: Record<string, GoogleCalendarExport> = {};
  for (const [teamId, value] of Object.entries(parsed.data)) {
    const state = exportStateSchema.safeParse(value);
    if (!state.success) continue;
    result[teamId] = {
      calendarId: state.data.calendarId,
      exportedAt: state.data.exportedAt?.toDate() ?? null,
    };
  }
  return result;
}

/** 副カレンダーを新規作成したときに、その ID を保存する（まだ書き出しは完了していない） */
export async function saveExportCalendarId(
  userId: string,
  teamId: string,
  calendarId: string
): Promise<void> {
  await updateDoc(doc(db, 'users', userId), new FieldPath(FIELD, teamId), {
    calendarId,
    exportedAt: null,
  });
}

/** 書き出しがすべて成功したときに、最終書き出し日時を記録する */
export async function saveExportedAt(userId: string, teamId: string): Promise<void> {
  await updateDoc(
    doc(db, 'users', userId),
    new FieldPath(FIELD, teamId, 'exportedAt'),
    serverTimestamp()
  );
}
