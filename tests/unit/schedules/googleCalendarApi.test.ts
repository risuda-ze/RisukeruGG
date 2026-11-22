import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// firebase/auth の再認証ポップアップをモックする
const reauthenticateMock = vi.fn();
const credentialFromResultMock = vi.fn();
const addScopeMock = vi.fn();
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class {
    static credentialFromResult = (...args: unknown[]) => credentialFromResultMock(...args);
    addScope = addScopeMock;
    setCustomParameters = vi.fn();
  },
  reauthenticateWithPopup: (...args: unknown[]) => reauthenticateMock(...args),
}));

// Firebase クライアント初期化を避けるため db をダミー化
vi.mock('@/lib/firebase/client', () => ({ db: {} }));

import { FirebaseError } from 'firebase/app';
import type { User } from 'firebase/auth';
import { createCalendarApi, GoogleCalendarApiError } from '@/lib/googleCalendar/api';
import {
  CALENDAR_SCOPE,
  CalendarAuthError,
  requestCalendarAccessToken,
} from '@/lib/googleCalendar/auth';
import { parseGoogleCalendarExports } from '@/lib/repositories/googleCalendarExports';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('createCalendarApi', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('アクセストークンを Bearer で送る', async () => {
    fetchMock.mockResolvedValueOnce(json({ id: 'cal-1' }));
    const id = await createCalendarApi('token-abc').createCalendar('RisukeruGG - チーム');

    expect(id).toBe('cal-1');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://www.googleapis.com/calendar/v3/calendars');
    expect(init.headers.Authorization).toBe('Bearer token-abc');
    expect(JSON.parse(init.body)).toEqual({
      summary: 'RisukeruGG - チーム',
      timeZone: 'Asia/Tokyo',
    });
  });

  it('listEvents は全ページを取得する', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ items: [{ id: 'a' }], nextPageToken: 'p2' }))
      .mockResolvedValueOnce(json({ items: [{ id: 'b' }] }));
    const events = await createCalendarApi('t').listEvents('cal@group.calendar.google.com');

    expect(events?.map((e) => e.id)).toEqual(['a', 'b']);
    expect(fetchMock.mock.calls[0][0]).toContain(
      '/calendars/cal%40group.calendar.google.com/events'
    );
    expect(fetchMock.mock.calls[1][0]).toContain('pageToken=p2');
  });

  it.each([404, 410])('listEvents はカレンダーが無い（%i）とき null を返す', async (status) => {
    fetchMock.mockResolvedValueOnce(json({}, status));
    expect(await createCalendarApi('t').listEvents('gone')).toBeNull();
  });

  it('listEvents は権限エラーを例外にする', async () => {
    fetchMock.mockResolvedValueOnce(json({}, 403));
    await expect(createCalendarApi('t').listEvents('cal')).rejects.toMatchObject({ status: 403 });
  });

  it('insertEvent / updateEvent は失敗を例外にする', async () => {
    const event = {
      summary: 's',
      description: '',
      start: { date: '2026-11-22' },
      end: { date: '2026-11-23' },
      extendedProperties: { private: {} },
      reminders: { useDefault: false as const, overrides: [] as [] },
    };
    fetchMock.mockResolvedValueOnce(json({}, 500)).mockResolvedValueOnce(json({ id: 'e' }));
    const api = createCalendarApi('t');

    await expect(api.insertEvent('cal', event)).rejects.toBeInstanceOf(GoogleCalendarApiError);
    await api.updateEvent('cal', 'e', event);
    expect(fetchMock.mock.calls[1][1].method).toBe('PUT');
  });

  it('deleteEvent は既に消えているイベントを成功として扱い、それ以外の失敗は例外にする', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(json({}, 410))
      .mockResolvedValueOnce(json({}, 500));
    const api = createCalendarApi('t');

    await api.deleteEvent('cal', 'e1');
    await api.deleteEvent('cal', 'e2');
    await expect(api.deleteEvent('cal', 'e3')).rejects.toMatchObject({ status: 500 });
  });
});

describe('requestCalendarAccessToken', () => {
  const user = { email: 'sample@example.com' } as User;
  afterEach(() => {
    reauthenticateMock.mockReset();
    credentialFromResultMock.mockReset();
    addScopeMock.mockReset();
  });

  it('calendar.app.created スコープだけを要求し、アクセストークンを返す', async () => {
    reauthenticateMock.mockResolvedValueOnce({});
    credentialFromResultMock.mockReturnValueOnce({ accessToken: 'token-abc' });

    expect(await requestCalendarAccessToken(user)).toBe('token-abc');
    expect(addScopeMock.mock.calls).toEqual([[CALENDAR_SCOPE]]);
    expect(CALENDAR_SCOPE).toBe('https://www.googleapis.com/auth/calendar.app.created');
  });

  it.each([
    ['auth/popup-closed-by-user', 'denied'],
    ['auth/user-cancelled', 'denied'],
    ['auth/user-mismatch', 'account_mismatch'],
    ['auth/popup-blocked', 'popup_blocked'],
    ['auth/network-request-failed', 'failed'],
  ])('%s は %s として扱う', async (code, reason) => {
    reauthenticateMock.mockRejectedValueOnce(new FirebaseError(code, code));
    await expect(requestCalendarAccessToken(user)).rejects.toMatchObject({ reason });
  });

  it('アクセストークンが返らなければ同意の拒否として扱う', async () => {
    reauthenticateMock.mockResolvedValueOnce({});
    credentialFromResultMock.mockReturnValueOnce(null);
    await expect(requestCalendarAccessToken(user)).rejects.toBeInstanceOf(CalendarAuthError);
  });
});

describe('parseGoogleCalendarExports', () => {
  const exportedAt = new Date('2026-11-18T05:32:00Z');
  const timestamp = { toDate: () => exportedAt };

  it('チームごとの calendarId と最終書き出し日時を読む', () => {
    expect(
      parseGoogleCalendarExports({
        teamA: { calendarId: 'cal-a', exportedAt: timestamp },
        teamB: { calendarId: 'cal-b', exportedAt: null },
      })
    ).toEqual({
      teamA: { calendarId: 'cal-a', exportedAt },
      teamB: { calendarId: 'cal-b', exportedAt: null },
    });
  });

  it('フィールドが無い・形が合わない場合は空として扱う', () => {
    expect(parseGoogleCalendarExports(undefined)).toEqual({});
    expect(parseGoogleCalendarExports('broken')).toEqual({});
    expect(parseGoogleCalendarExports({ teamA: { exportedAt: timestamp }, teamB: 1 })).toEqual({});
  });
});
