import { z } from 'zod';
import type { CalendarApi, GoogleEventInput, GoogleEventResource } from './export';

/** Google カレンダー API（v3）のクライアント。書き出し（SC-008 系）で使う操作だけを持つ */

const BASE_URL = 'https://www.googleapis.com/calendar/v3';

/** Google カレンダー API が 2xx 以外を返した */
export class GoogleCalendarApiError extends Error {
  constructor(public readonly status: number) {
    super(`Google Calendar API error: ${status}`);
    this.name = 'GoogleCalendarApiError';
  }
}

const eventTimeSchema = z.object({ date: z.string().optional(), dateTime: z.string().optional() });

const eventSchema = z.object({
  id: z.string(),
  summary: z.string().optional(),
  description: z.string().optional(),
  start: eventTimeSchema.optional(),
  end: eventTimeSchema.optional(),
  extendedProperties: z.object({ private: z.record(z.string(), z.string()).optional() }).optional(),
  reminders: z
    .object({ useDefault: z.boolean().optional(), overrides: z.array(z.unknown()).optional() })
    .optional(),
});

const eventListSchema = z.object({
  items: z.array(eventSchema).optional(),
  nextPageToken: z.string().optional(),
});

const calendarSchema = z.object({ id: z.string() });

/** 削除済み・存在しないリソースを表すステータス */
function isGone(status: number): boolean {
  return status === 404 || status === 410;
}

export function createCalendarApi(accessToken: string): CalendarApi {
  async function request(path: string, method: string, body?: unknown): Promise<Response> {
    return fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  async function requestOk(path: string, method: string, body?: unknown): Promise<Response> {
    const response = await request(path, method, body);
    if (!response.ok) throw new GoogleCalendarApiError(response.status);
    return response;
  }

  const eventsPath = (calendarId: string) => `/calendars/${encodeURIComponent(calendarId)}/events`;

  return {
    async createCalendar(summary: string): Promise<string> {
      const response = await requestOk('/calendars', 'POST', { summary, timeZone: 'Asia/Tokyo' });
      return calendarSchema.parse(await response.json()).id;
    },

    async listEvents(calendarId: string): Promise<GoogleEventResource[] | null> {
      const events: GoogleEventResource[] = [];
      let pageToken: string | undefined;
      do {
        const params = new URLSearchParams({ maxResults: '2500', singleEvents: 'true' });
        if (pageToken) params.set('pageToken', pageToken);
        const response = await request(`${eventsPath(calendarId)}?${params}`, 'GET');
        // 利用者が Google 側でカレンダーを削除していた場合は「存在しない」として返す
        if (isGone(response.status)) return null;
        if (!response.ok) throw new GoogleCalendarApiError(response.status);
        const page = eventListSchema.parse(await response.json());
        events.push(...(page.items ?? []));
        pageToken = page.nextPageToken;
      } while (pageToken);
      return events;
    },

    async insertEvent(calendarId: string, event: GoogleEventInput): Promise<void> {
      await requestOk(eventsPath(calendarId), 'POST', event);
    },

    async updateEvent(calendarId: string, eventId: string, event: GoogleEventInput): Promise<void> {
      // 終日 ⇔ 時刻ありの切り替えで古い項目が残らないよう、PATCH ではなく全体を置き換える
      await requestOk(`${eventsPath(calendarId)}/${encodeURIComponent(eventId)}`, 'PUT', event);
    },

    async deleteEvent(calendarId: string, eventId: string): Promise<void> {
      const response = await request(
        `${eventsPath(calendarId)}/${encodeURIComponent(eventId)}`,
        'DELETE'
      );
      // 既に消えているなら目的は達している
      if (!response.ok && !isGone(response.status)) {
        throw new GoogleCalendarApiError(response.status);
      }
    },
  };
}
