import type { ScheduleEntry } from '@/types/entities';
import { GoogleCalendarApiError } from './api';
import { CalendarAuthError, type CalendarAuthErrorReason } from './auth';
import { exportSchedules, type CalendarApi, type ExportContext } from './export';

/** 書き出しの結果として画面に出す通知（SC-008-1） */
export type ExportNotice =
  | { kind: 'success'; calendarName: string; added: number; updated: number; deleted: number }
  | { kind: 'partial'; total: number; failed: number }
  | { kind: 'error'; reason: CalendarAuthErrorReason; email: string | null };

/** 専用副カレンダーの名前（SC-008-3） */
export function exportCalendarName(teamName: string): string {
  return `RisukeruGG - ${teamName}`;
}

/** 例外を通知の理由に変換する。Google 側で権限が無い（401 / 403）場合は同意の拒否として扱う */
function toErrorReason(error: unknown): CalendarAuthErrorReason {
  if (error instanceof CalendarAuthError) return error.reason;
  if (error instanceof GoogleCalendarApiError && (error.status === 401 || error.status === 403)) {
    return 'denied';
  }
  return 'failed';
}

export interface RunExportOptions {
  /** ログイン中のメールアドレス（別アカウントを選んだときの案内に使う） */
  email: string | null;
  teamName: string;
  /** 前回の書き出し先。初回は null */
  calendarId: string | null;
  schedules: ScheduleEntry[];
  context: ExportContext;
  now: Date;
  /** カレンダー権限の同意を求め、その場限りのアクセストークンを得る */
  requestAccessToken: () => Promise<string>;
  createApi: (accessToken: string) => CalendarApi;
  saveCalendarId: (calendarId: string) => Promise<void>;
  saveExportedAt: () => Promise<void>;
  onProgress?: (done: number, total: number) => void;
}

/**
 * 認可 → 書き出し → 状態の保存までを行い、画面に出す通知を返す。
 * 失敗はすべて通知として返す（サイレント失敗させない。SC-008-1）。
 */
export async function runExport(options: RunExportOptions): Promise<ExportNotice> {
  const calendarName = exportCalendarName(options.teamName);
  try {
    const accessToken = await options.requestAccessToken();
    const result = await exportSchedules({
      api: options.createApi(accessToken),
      calendarId: options.calendarId,
      calendarName,
      schedules: options.schedules,
      context: options.context,
      now: options.now,
      onCalendarCreated: options.saveCalendarId,
      onProgress: options.onProgress,
    });

    // 一部でも失敗したら最終書き出し日時は更新しない
    if (result.failed > 0) return { kind: 'partial', total: result.total, failed: result.failed };

    await options.saveExportedAt();
    return {
      kind: 'success',
      calendarName,
      added: result.added,
      updated: result.updated,
      deleted: result.deleted,
    };
  } catch (error) {
    return { kind: 'error', reason: toErrorReason(error), email: options.email };
  }
}
