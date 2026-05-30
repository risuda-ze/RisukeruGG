import { describe, expect, it } from 'vitest';
import type { MemberCalendarEvent, ScheduleEntry } from '@/types/entities';

function buildMemberCalendarEvent(
  id: string,
  userId: string,
  overrides?: Partial<MemberCalendarEvent>
): MemberCalendarEvent {
  const baseDate = new Date('2026-05-21T10:00:00.000Z');

  return {
    id,
    title: `${userId} の予定`,
    startAt: baseDate,
    endAt: new Date('2026-05-21T11:00:00.000Z'),
    allDay: false,
    sourceEventId: `source-${id}`,
    syncedAt: new Date('2026-05-20T00:00:00.000Z'),
    userId,
    teamId: 'team-alpha',
    ...overrides,
  };
}

/** SchedulePage のメンバー予定変換ロジックを純粋関数化 */
function buildMemberScheduleEntries(
  events: MemberCalendarEvent[],
  options: {
    showMemberCalendars: boolean;
    currentUserId: string | null;
    hasGoogleAccessToken: boolean;
  }
): ScheduleEntry[] {
  if (!options.showMemberCalendars) {
    return [];
  }

  return events
    .filter((event) => !(event.userId === options.currentUserId && options.hasGoogleAccessToken))
    .map((event) => ({
      id: `mcal_${event.id}`,
      title: event.title,
      categoryId: null,
      startAt: event.startAt,
      endAt: event.endAt,
      description: '',
      participantIds: [],
      collabPartnerName: null,
      linkedTaskIds: [],
      updatedAt: event.syncedAt,
      createdBy: event.userId,
      createdAt: event.syncedAt,
      source: 'member' as const,
      allDay: event.allDay,
    }));
}

describe('メンバー予定の表示ロジック', () => {
  it('トグルがOFFならメンバー予定を表示しない', () => {
    const events = [buildMemberCalendarEvent('evt-1', 'user-2')];

    expect(
      buildMemberScheduleEntries(events, {
        showMemberCalendars: false,
        currentUserId: 'user-1',
        hasGoogleAccessToken: false,
      })
    ).toEqual([]);
  });

  it('トグルがONなら他メンバーの同期済み予定を表示する', () => {
    const events = [
      buildMemberCalendarEvent('evt-1', 'user-2', { title: 'マネージャー健太 の予定' }),
    ];

    expect(
      buildMemberScheduleEntries(events, {
        showMemberCalendars: true,
        currentUserId: 'user-1',
        hasGoogleAccessToken: false,
      })
    ).toMatchObject([
      {
        id: 'mcal_evt-1',
        title: 'マネージャー健太 の予定',
        createdBy: 'user-2',
        source: 'member',
      },
    ]);
  });

  it('自分の Google カレンダー直接取得が有効な場合は、自分の同期済み予定を除外する', () => {
    const events = [
      buildMemberCalendarEvent('evt-self', 'user-1', { title: '自分 の予定' }),
      buildMemberCalendarEvent('evt-other', 'user-2', { title: '他メンバー の予定' }),
    ];

    expect(
      buildMemberScheduleEntries(events, {
        showMemberCalendars: true,
        currentUserId: 'user-1',
        hasGoogleAccessToken: true,
      }).map((event) => event.id)
    ).toEqual(['mcal_evt-other']);
  });

  it('Google カレンダー未接続なら自分の同期済み予定も表示する', () => {
    const events = [buildMemberCalendarEvent('evt-self', 'user-1', { title: '自分 の予定' })];

    expect(
      buildMemberScheduleEntries(events, {
        showMemberCalendars: true,
        currentUserId: 'user-1',
        hasGoogleAccessToken: false,
      })
    ).toMatchObject([
      {
        id: 'mcal_evt-self',
        title: '自分 の予定',
      },
    ]);
  });

  it('終日予定フラグを維持して読み取り専用予定へ変換する', () => {
    const events = [buildMemberCalendarEvent('evt-all-day', 'user-2', { allDay: true })];

    expect(
      buildMemberScheduleEntries(events, {
        showMemberCalendars: true,
        currentUserId: 'user-1',
        hasGoogleAccessToken: false,
      })
    ).toMatchObject([
      {
        id: 'mcal_evt-all-day',
        source: 'member',
        allDay: true,
      },
    ]);
  });
});
