import type { ScheduleEntry } from '@/types/entities';

interface GCalDateTime {
  dateTime?: string;
  date?: string;
}

interface GCalEvent {
  id: string;
  summary?: string;
  description?: string;
  start: GCalDateTime;
  end: GCalDateTime;
  status?: string;
}

interface GCalEventsResponse {
  items?: GCalEvent[];
  error?: { code: number; message: string };
}

function parseGCalDate(dt: GCalDateTime): Date {
  if (dt.dateTime) return new Date(dt.dateTime);
  if (dt.date) return new Date(dt.date + 'T00:00:00');
  return new Date();
}

export type GCalFetchError = 'auth_expired' | 'api_error' | 'network_error' | null;

export async function fetchGCalEvents(
  accessToken: string,
  timeMin: Date,
  timeMax: Date
): Promise<{ events: ScheduleEntry[]; error: GCalFetchError }> {
  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  });

  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const data = (await response.json()) as GCalEventsResponse;

    if (!response.ok) {
      return { events: [], error: response.status === 401 ? 'auth_expired' : 'api_error' };
    }

    const events: ScheduleEntry[] = (data.items ?? [])
      .filter((e) => e.status !== 'cancelled')
      .map((e) => {
        const startAt = parseGCalDate(e.start);
        const endAt = parseGCalDate(e.end);
        return {
          id: `gcal_${e.id}`,
          title: e.summary ?? '(タイトルなし)',
          categoryId: null,
          startAt,
          endAt,
          description: e.description ?? '',
          participantIds: [],
          collabPartnerName: null,
          linkedTaskIds: [],
          updatedAt: startAt,
          createdBy: '',
          createdAt: startAt,
          source: 'google' as const,
        };
      });

    return { events, error: null };
  } catch {
    return { events: [], error: 'network_error' };
  }
}
