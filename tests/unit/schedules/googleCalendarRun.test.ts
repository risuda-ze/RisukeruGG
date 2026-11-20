import { describe, expect, it, vi } from 'vitest';

// 認可モジュールが Firebase を初期化しないようにする
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class {},
  reauthenticateWithPopup: vi.fn(),
}));

import { GoogleCalendarApiError } from '@/lib/googleCalendar/api';
import { CalendarAuthError } from '@/lib/googleCalendar/auth';
import type { CalendarApi } from '@/lib/googleCalendar/export';
import { exportCalendarName, runExport, type RunExportOptions } from '@/lib/googleCalendar/run';
import type { ScheduleEntry } from '@/types/entities';

const NOW = new Date('2026-11-18T14:32:00+09:00');

function schedule(id: string): ScheduleEntry {
  return {
    id,
    title: id,
    categoryId: null,
    startAt: new Date('2026-11-20T21:00:00+09:00'),
    endAt: new Date('2026-11-20T23:00:00+09:00'),
    description: '',
    participantIds: [],
    collabPartnerName: null,
    linkedTaskIds: [],
    updatedAt: NOW,
    createdBy: 'u1',
    createdAt: NOW,
    allDay: false,
  };
}

function setup(overrides: Partial<RunExportOptions> = {}, apiOverrides: Partial<CalendarApi> = {}) {
  const api: CalendarApi = {
    createCalendar: vi.fn(async () => 'cal-1'),
    listEvents: vi.fn(async () => []),
    insertEvent: vi.fn(async () => {}),
    updateEvent: vi.fn(async () => {}),
    deleteEvent: vi.fn(async () => {}),
    ...apiOverrides,
  };
  const options = {
    email: 'sample@example.com',
    teamName: 'サンプルチーム',
    calendarId: null,
    schedules: [schedule('s1'), schedule('s2')],
    context: { memberNames: {}, categoryNames: {} },
    now: NOW,
    requestAccessToken: vi.fn(async () => 'token'),
    createApi: vi.fn(() => api),
    saveCalendarId: vi.fn(async () => {}),
    saveExportedAt: vi.fn(async () => {}),
    ...overrides,
  } satisfies RunExportOptions;
  return { api, options };
}

describe('runExport', () => {
  it('専用カレンダーの名前は「RisukeruGG - {チーム名}」', () => {
    expect(exportCalendarName('サンプルチーム')).toBe('RisukeruGG - サンプルチーム');
  });

  it('すべて成功したら calendarId と最終書き出し日時を保存し、件数を通知する', async () => {
    const { options } = setup();
    const notice = await runExport(options);

    expect(notice).toEqual({
      kind: 'success',
      calendarName: 'RisukeruGG - サンプルチーム',
      added: 2,
      updated: 0,
      deleted: 0,
    });
    expect(options.createApi).toHaveBeenCalledWith('token');
    expect(options.saveCalendarId).toHaveBeenCalledWith('cal-1');
    expect(options.saveExportedAt).toHaveBeenCalledTimes(1);
  });

  it('一部が失敗したら失敗件数を通知し、最終書き出し日時は更新しない', async () => {
    const { options } = setup(
      {},
      { insertEvent: vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue(undefined) }
    );
    const notice = await runExport(options);

    expect(notice).toEqual({ kind: 'partial', total: 2, failed: 1 });
    expect(options.saveExportedAt).not.toHaveBeenCalled();
  });

  it('同意を拒否したら何も書き出さず、拒否として通知する', async () => {
    const { options } = setup({
      requestAccessToken: vi.fn(async () => {
        throw new CalendarAuthError('denied');
      }),
    });
    const notice = await runExport(options);

    expect(notice).toEqual({ kind: 'error', reason: 'denied', email: 'sample@example.com' });
    expect(options.createApi).not.toHaveBeenCalled();
    expect(options.saveExportedAt).not.toHaveBeenCalled();
  });

  it('別アカウントを選んだら、ログイン中のメールアドレス付きで通知する', async () => {
    const { options } = setup({
      requestAccessToken: vi.fn(async () => {
        throw new CalendarAuthError('account_mismatch');
      }),
    });
    expect(await runExport(options)).toEqual({
      kind: 'error',
      reason: 'account_mismatch',
      email: 'sample@example.com',
    });
  });

  it.each([401, 403])('Google 側で権限が無い（%i）場合は拒否として通知する', async (status) => {
    const { options } = setup(
      {},
      { createCalendar: vi.fn().mockRejectedValue(new GoogleCalendarApiError(status)) }
    );
    expect(await runExport(options)).toMatchObject({ kind: 'error', reason: 'denied' });
    expect(options.saveExportedAt).not.toHaveBeenCalled();
  });

  it('それ以外の API エラー・保存の失敗は失敗として通知する', async () => {
    const apiDown = setup(
      { calendarId: 'cal-1' },
      { listEvents: vi.fn().mockRejectedValue(new GoogleCalendarApiError(500)) }
    );
    expect(await runExport(apiDown.options)).toMatchObject({ kind: 'error', reason: 'failed' });

    const saveFailed = setup({ saveExportedAt: vi.fn().mockRejectedValue(new Error('offline')) });
    expect(await runExport(saveFailed.options)).toMatchObject({ kind: 'error', reason: 'failed' });
  });
});
