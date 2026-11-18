import type { ScheduleEntry } from '@/types/entities';

/**
 * Google カレンダー書き出し（SC-008 系）のロジック。
 * チームの予定を、利用者の Google カレンダー上の専用副カレンダーへ一方向に流し込む。
 * Google API の呼び出しは CalendarApi として受け取り、ここでは副作用を持たない判定と手順だけを書く。
 */

/** Google イベントに scheduleId を持たせるキー（extendedProperties.private） */
export const SCHEDULE_ID_KEY = 'risukeruScheduleId';

/** 書き出した予定の説明文の末尾に付ける注意書き（SC-008-5） */
export const EXPORT_NOTE =
  'この予定は RisukeruGG から書き出されたものです。編集は RisukeruGG で行ってください。';

const JST = 'Asia/Tokyo';
const JST_DATE_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: JST,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** JST での暦日（yyyy-MM-dd） */
export function toJstDateString(date: Date): string {
  return JST_DATE_FORMAT.format(date);
}

/** JST での当日 0:00 */
export function startOfTodayJst(now: Date): Date {
  return new Date(`${toJstDateString(now)}T00:00:00+09:00`);
}

type GoogleEventTime = { date: string } | { dateTime: string; timeZone: string };

/** Google へ送るイベント本体 */
export interface GoogleEventInput {
  summary: string;
  description: string;
  start: GoogleEventTime;
  end: GoogleEventTime;
  extendedProperties: { private: Record<string, string> };
  reminders: { useDefault: false; overrides: [] };
}

/** Google から取得したイベント（比較に使う項目だけ） */
export interface GoogleEventResource {
  id: string;
  summary?: string;
  description?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  extendedProperties?: { private?: Record<string, string> };
  reminders?: { useDefault?: boolean; overrides?: unknown[] };
}

/** 説明文に載せる名前の解決表 */
export interface ExportContext {
  /** userId → 表示名 */
  memberNames: Record<string, string>;
  /** categoryId → カテゴリ名 */
  categoryNames: Record<string, string>;
}

/** 書き出し対象: 当日 0:00（JST）以降に終了する予定（SC-008-4） */
export function selectExportTargets(schedules: ScheduleEntry[], now: Date): ScheduleEntry[] {
  const from = startOfTodayJst(now).getTime();
  return schedules.filter((s) => s.endAt.getTime() > from);
}

function buildDescription(schedule: ScheduleEntry, context: ExportContext): string {
  const header: string[] = [];
  const categoryName = schedule.categoryId ? context.categoryNames[schedule.categoryId] : undefined;
  if (categoryName) header.push(`カテゴリ: ${categoryName}`);
  const participants = schedule.participantIds
    .map((id) => context.memberNames[id])
    .filter((name) => name !== undefined);
  if (participants.length > 0) header.push(`参加メンバー: ${participants.join('、')}`);
  if (schedule.collabPartnerName) header.push(`コラボ相手: ${schedule.collabPartnerName}`);

  return [header.join('\n'), schedule.description.trim(), EXPORT_NOTE]
    .filter((block) => block !== '')
    .join('\n\n');
}

/** 予定 → Google イベント */
export function toGoogleEvent(schedule: ScheduleEntry, context: ExportContext): GoogleEventInput {
  // 終日は保存値が「開始日 0:00 〜 最終日翌日 0:00」の排他的境界なので、そのまま日付に変換できる
  const time = (date: Date): GoogleEventTime =>
    schedule.allDay
      ? { date: toJstDateString(date) }
      : { dateTime: date.toISOString(), timeZone: JST };

  return {
    summary: schedule.title,
    description: buildDescription(schedule, context),
    start: time(schedule.startAt),
    end: time(schedule.endAt),
    extendedProperties: { private: { [SCHEDULE_ID_KEY]: schedule.id } },
    // 締切前の通知は Discord が担うため、Google 側の通知は付けない（SC-008-6）
    reminders: { useDefault: false, overrides: [] },
  };
}

function sameTime(
  desired: GoogleEventTime,
  existing: { date?: string; dateTime?: string } | undefined
): boolean {
  if ('date' in desired) return existing?.date === desired.date;
  return (
    existing?.dateTime !== undefined &&
    new Date(existing.dateTime).getTime() === new Date(desired.dateTime).getTime()
  );
}

/** Google 側のイベントが、書き出したい内容と一致しているか */
function isUpToDate(desired: GoogleEventInput, existing: GoogleEventResource): boolean {
  return (
    (existing.summary ?? '') === desired.summary &&
    (existing.description ?? '') === desired.description &&
    sameTime(desired.start, existing.start) &&
    sameTime(desired.end, existing.end) &&
    existing.reminders?.useDefault === false &&
    (existing.reminders.overrides ?? []).length === 0
  );
}

/** Google 側イベントの終了時刻（判定できなければ null） */
function endOf(event: GoogleEventResource): number | null {
  if (event.end?.dateTime) return new Date(event.end.dateTime).getTime();
  if (event.end?.date) return new Date(`${event.end.date}T00:00:00+09:00`).getTime();
  return null;
}

export interface ExportPlan {
  inserts: GoogleEventInput[];
  updates: Array<{ eventId: string; event: GoogleEventInput }>;
  deletes: string[];
}

/**
 * 専用カレンダーを現在のチーム予定に一致させるための操作を決める（SC-008-5）。
 * - Google 側に無い予定は追加、内容が違う予定は上書き、一致していれば何もしない
 * - RisukeruGG 側に無くなった予定は、当日 0:00（JST）以降に終了するものだけ削除する
 * - risukeruScheduleId を持たないイベント（利用者が Google 側で足したもの）には触れない
 */
export function planExport(
  desired: GoogleEventInput[],
  existing: GoogleEventResource[],
  now: Date
): ExportPlan {
  const from = startOfTodayJst(now).getTime();
  const plan: ExportPlan = { inserts: [], updates: [], deletes: [] };

  const existingById = new Map<string, GoogleEventResource>();
  for (const event of existing) {
    const scheduleId = event.extendedProperties?.private?.[SCHEDULE_ID_KEY];
    if (scheduleId === undefined) continue;
    // 同じ予定のイベントが複数あれば 1 つだけ残す
    if (existingById.has(scheduleId)) plan.deletes.push(event.id);
    else existingById.set(scheduleId, event);
  }

  for (const event of desired) {
    const scheduleId = event.extendedProperties.private[SCHEDULE_ID_KEY];
    const current = existingById.get(scheduleId);
    existingById.delete(scheduleId);
    if (!current) plan.inserts.push(event);
    else if (!isUpToDate(event, current)) plan.updates.push({ eventId: current.id, event });
  }

  for (const event of existingById.values()) {
    const end = endOf(event);
    if (end !== null && end > from) plan.deletes.push(event.id);
  }

  return plan;
}

/** Google カレンダー API のうち書き出しに使う操作 */
export interface CalendarApi {
  /** 副カレンダーを作り、その ID を返す */
  createCalendar(summary: string): Promise<string>;
  /** カレンダー上の全イベント。カレンダーが存在しなければ null */
  listEvents(calendarId: string): Promise<GoogleEventResource[] | null>;
  insertEvent(calendarId: string, event: GoogleEventInput): Promise<void>;
  updateEvent(calendarId: string, eventId: string, event: GoogleEventInput): Promise<void>;
  deleteEvent(calendarId: string, eventId: string): Promise<void>;
}

export interface ExportResult {
  calendarId: string;
  added: number;
  updated: number;
  deleted: number;
  /** 追加・更新・削除のうち失敗した件数 */
  failed: number;
  /** 追加・更新・削除の合計件数 */
  total: number;
}

export interface ExportOptions {
  api: CalendarApi;
  /** 前回の書き出し先。初回は null */
  calendarId: string | null;
  /** 新規作成する場合のカレンダー名 */
  calendarName: string;
  schedules: ScheduleEntry[];
  context: ExportContext;
  now: Date;
  /** 副カレンダーを新規作成した直後に呼ぶ（calendarId の保存用） */
  onCalendarCreated: (calendarId: string) => Promise<void>;
  onProgress?: (done: number, total: number) => void;
}

/**
 * 書き出しを実行する。カレンダーの取得・作成の失敗は例外として投げ、
 * 個々の予定の失敗は件数として返す（SC-008-1。呼び出し側が失敗件数を表示する）。
 */
export async function exportSchedules(options: ExportOptions): Promise<ExportResult> {
  const { api, calendarName, schedules, context, now, onCalendarCreated, onProgress } = options;

  let calendarId = options.calendarId;
  let existing = calendarId ? await api.listEvents(calendarId) : null;
  if (calendarId === null || existing === null) {
    calendarId = await api.createCalendar(calendarName);
    await onCalendarCreated(calendarId);
    existing = [];
  }
  const targetCalendarId = calendarId;

  const desired = selectExportTargets(schedules, now).map((s) => toGoogleEvent(s, context));
  const plan = planExport(desired, existing, now);

  const steps: Array<{ kind: 'added' | 'updated' | 'deleted'; run: () => Promise<void> }> = [
    ...plan.inserts.map((event) => ({
      kind: 'added' as const,
      run: () => api.insertEvent(targetCalendarId, event),
    })),
    ...plan.updates.map(({ eventId, event }) => ({
      kind: 'updated' as const,
      run: () => api.updateEvent(targetCalendarId, eventId, event),
    })),
    ...plan.deletes.map((eventId) => ({
      kind: 'deleted' as const,
      run: () => api.deleteEvent(targetCalendarId, eventId),
    })),
  ];

  const result: ExportResult = {
    calendarId: targetCalendarId,
    added: 0,
    updated: 0,
    deleted: 0,
    failed: 0,
    total: steps.length,
  };

  // ponytail: 1 件ずつ順に送る。予定が数百件を超えて待ち時間が問題になったら、
  // Google API のレート制限内で並列化する
  onProgress?.(0, steps.length);
  for (const [index, step] of steps.entries()) {
    try {
      await step.run();
      result[step.kind] += 1;
    } catch {
      // 1 件の失敗で残りを止めない。失敗は件数として呼び出し側が表示する
      result.failed += 1;
    }
    onProgress?.(index + 1, steps.length);
  }

  return result;
}
