import { describe, expect, it, vi } from 'vitest';
import {
  EXPORT_NOTE,
  SCHEDULE_ID_KEY,
  exportSchedules,
  planExport,
  selectExportTargets,
  toGoogleEvent,
  type CalendarApi,
  type ExportContext,
  type GoogleEventInput,
  type GoogleEventResource,
} from '@/lib/googleCalendar/export';
import type { ScheduleEntry } from '@/types/entities';

/** JST の日時（実行環境のタイムゾーンに依存させない） */
function jst(value: string): Date {
  return new Date(`${value}+09:00`);
}

const NOW = jst('2026-11-18T14:32:00');

const CONTEXT: ExportContext = {
  memberNames: { u1: 'りす', u2: 'さとう' },
  categoryNames: { c1: '配信' },
};

function schedule(id: string, overrides: Partial<ScheduleEntry> = {}): ScheduleEntry {
  return {
    id,
    title: `予定 ${id}`,
    categoryId: null,
    startAt: jst('2026-11-20T21:00:00'),
    endAt: jst('2026-11-20T23:00:00'),
    description: '',
    participantIds: [],
    collabPartnerName: null,
    linkedTaskIds: [],
    updatedAt: NOW,
    createdBy: 'u1',
    createdAt: NOW,
    allDay: false,
    ...overrides,
  };
}

/** Google から返ってくる形に直す（id を付け、時刻は Google が返す +09:00 表記にする） */
function asResource(id: string, event: GoogleEventInput): GoogleEventResource {
  const time = (t: GoogleEventInput['start']) =>
    'date' in t
      ? { date: t.date }
      : { dateTime: new Date(t.dateTime).toISOString().replace('Z', '+00:00') };
  return { ...event, id, start: time(event.start), end: time(event.end) };
}

describe('selectExportTargets（当日 0:00 JST 以降に終了する予定）', () => {
  it('前日までに終了した予定は対象外、当日以降に終了する予定は対象', () => {
    const targets = selectExportTargets(
      [
        schedule('past', {
          startAt: jst('2026-11-17T21:00:00'),
          endAt: jst('2026-11-17T23:00:00'),
        }),
        schedule('overnight', {
          startAt: jst('2026-11-17T23:00:00'),
          endAt: jst('2026-11-18T01:00:00'),
        }),
        schedule('today-done', {
          startAt: jst('2026-11-18T09:00:00'),
          endAt: jst('2026-11-18T10:00:00'),
        }),
        schedule('future'),
      ],
      NOW
    );
    expect(targets.map((s) => s.id)).toEqual(['overnight', 'today-done', 'future']);
  });

  it.each([
    ['JST 0:30（UTC では前日）', '2026-11-18T00:30:00'],
    ['JST 23:59', '2026-11-18T23:59:00'],
  ])('基準は JST の当日 0:00 で、実行環境のタイムゾーンに依らない: %s', (_label, now) => {
    const targets = selectExportTargets(
      [
        schedule('before', {
          startAt: jst('2026-11-17T22:00:00'),
          endAt: jst('2026-11-17T23:59:59'),
        }),
        schedule('after', {
          startAt: jst('2026-11-17T23:00:00'),
          endAt: jst('2026-11-18T00:00:01'),
        }),
      ],
      jst(now)
    );
    expect(targets.map((s) => s.id)).toEqual(['after']);
  });

  it('当日 0:00 ちょうどに終了する予定（前日の終日予定）は対象外', () => {
    const targets = selectExportTargets(
      [
        schedule('yesterday-allday', {
          allDay: true,
          startAt: jst('2026-11-17T00:00:00'),
          endAt: jst('2026-11-18T00:00:00'),
        }),
        schedule('today-allday', {
          allDay: true,
          startAt: jst('2026-11-18T00:00:00'),
          endAt: jst('2026-11-19T00:00:00'),
        }),
      ],
      NOW
    );
    expect(targets.map((s) => s.id)).toEqual(['today-allday']);
  });
});

describe('toGoogleEvent', () => {
  it('時刻あり予定は dateTime と Asia/Tokyo で渡す', () => {
    const event = toGoogleEvent(schedule('s1'), CONTEXT);
    expect(event.summary).toBe('予定 s1');
    expect(event.start).toEqual({ dateTime: '2026-11-20T12:00:00.000Z', timeZone: 'Asia/Tokyo' });
    expect(event.end).toEqual({ dateTime: '2026-11-20T14:00:00.000Z', timeZone: 'Asia/Tokyo' });
    expect(event.extendedProperties.private[SCHEDULE_ID_KEY]).toBe('s1');
  });

  it('終日・複数日の予定は日付で渡し、最終日が 1 日ずれない', () => {
    // 11/22〜11/23 の 2 日間（保存値は 11/24 0:00 までの排他的終了）
    const event = toGoogleEvent(
      schedule('s1', {
        allDay: true,
        startAt: jst('2026-11-22T00:00:00'),
        endAt: jst('2026-11-24T00:00:00'),
      }),
      CONTEXT
    );
    expect(event.start).toEqual({ date: '2026-11-22' });
    expect(event.end).toEqual({ date: '2026-11-24' });
  });

  it('Google 側の通知を付けない', () => {
    expect(toGoogleEvent(schedule('s1'), CONTEXT).reminders).toEqual({
      useDefault: false,
      overrides: [],
    });
  });

  it('説明にカテゴリ・参加メンバー・コラボ相手・本文・注意書きを入れる', () => {
    const event = toGoogleEvent(
      schedule('s1', {
        categoryId: 'c1',
        participantIds: ['u1', 'u2', 'unknown'],
        collabPartnerName: 'たなか',
        description: '  ランクマッチ  ',
      }),
      CONTEXT
    );
    expect(event.description).toBe(
      [
        'カテゴリ: 配信\n参加メンバー: りす、さとう\nコラボ相手: たなか',
        'ランクマッチ',
        EXPORT_NOTE,
      ].join('\n\n')
    );
  });

  it('付加情報も本文も無い予定は注意書きだけになる', () => {
    expect(toGoogleEvent(schedule('s1'), CONTEXT).description).toBe(EXPORT_NOTE);
  });
});

describe('planExport', () => {
  const desiredOf = (...schedules: ScheduleEntry[]) =>
    schedules.map((s) => toGoogleEvent(s, CONTEXT));

  it('Google 側に無い予定は追加する', () => {
    const plan = planExport(desiredOf(schedule('s1')), [], NOW);
    expect(plan.inserts).toHaveLength(1);
    expect(plan.updates).toEqual([]);
    expect(plan.deletes).toEqual([]);
  });

  it('内容が一致していれば何もしない（再書き出しは冪等）', () => {
    const desired = desiredOf(
      schedule('s1'),
      schedule('s2', {
        allDay: true,
        startAt: jst('2026-11-22T00:00:00'),
        endAt: jst('2026-11-24T00:00:00'),
      })
    );
    const existing = desired.map((event, i) => asResource(`g${i}`, event));
    expect(planExport(desired, existing, NOW)).toEqual({ inserts: [], updates: [], deletes: [] });
  });

  it('Google が +09:00 表記・overrides 省略で返しても一致と判定する', () => {
    const desired = desiredOf(schedule('s1'));
    const fromGoogle: GoogleEventResource = {
      ...asResource('g1', desired[0]),
      start: { dateTime: '2026-11-20T21:00:00+09:00' },
      end: { dateTime: '2026-11-20T23:00:00+09:00' },
      reminders: { useDefault: false },
    };
    expect(planExport(desired, [fromGoogle], NOW)).toEqual({
      inserts: [],
      updates: [],
      deletes: [],
    });
  });

  it('RisukeruGG 側で変更された予定は上書きする', () => {
    const before = desiredOf(schedule('s1'));
    const after = desiredOf(schedule('s1', { title: '変更後' }));
    const plan = planExport(after, [asResource('g1', before[0])], NOW);
    expect(plan.updates).toEqual([{ eventId: 'g1', event: after[0] }]);
    expect(plan.inserts).toEqual([]);
  });

  it('Google 側で編集された予定は RisukeruGG の内容で上書きする', () => {
    const desired = desiredOf(schedule('s1'));
    const edited: GoogleEventResource[] = [
      { ...asResource('g1', desired[0]), summary: 'Google 側で変えたタイトル' },
      {
        ...asResource('g2', desiredOf(schedule('s2'))[0]),
        reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 10 }] },
      },
    ];
    const plan = planExport([...desired, ...desiredOf(schedule('s2'))], edited, NOW);
    expect(plan.updates.map((u) => u.eventId)).toEqual(['g1', 'g2']);
  });

  it('時刻あり ⇔ 終日の切り替えは上書きする', () => {
    const timed = desiredOf(schedule('s1'));
    const allDay = desiredOf(
      schedule('s1', {
        allDay: true,
        startAt: jst('2026-11-20T00:00:00'),
        endAt: jst('2026-11-21T00:00:00'),
      })
    );
    expect(planExport(allDay, [asResource('g1', timed[0])], NOW).updates).toHaveLength(1);
  });

  it('RisukeruGG 側で削除された予定は、当日以降に終了するものだけ削除する', () => {
    const gone = desiredOf(
      schedule('future-gone'),
      schedule('past-gone', {
        startAt: jst('2026-11-10T21:00:00'),
        endAt: jst('2026-11-10T23:00:00'),
      }),
      schedule('past-allday-gone', {
        allDay: true,
        startAt: jst('2026-11-17T00:00:00'),
        endAt: jst('2026-11-18T00:00:00'),
      })
    );
    const existing = gone.map((event, i) => asResource(`g${i}`, event));
    expect(planExport([], existing, NOW).deletes).toEqual(['g0']);
  });

  it('risukeruScheduleId を持たないイベントには触れない', () => {
    const manual: GoogleEventResource = {
      id: 'manual',
      summary: '利用者が Google 側で足した予定',
      start: { dateTime: '2026-11-25T10:00:00+09:00' },
      end: { dateTime: '2026-11-25T11:00:00+09:00' },
    };
    expect(planExport([], [manual], NOW)).toEqual({ inserts: [], updates: [], deletes: [] });
  });

  it('同じ予定のイベントが重複していれば 1 つだけ残す', () => {
    const desired = desiredOf(schedule('s1'));
    const plan = planExport(
      desired,
      [asResource('g1', desired[0]), asResource('g2', desired[0])],
      NOW
    );
    expect(plan).toEqual({ inserts: [], updates: [], deletes: ['g2'] });
  });
});

describe('exportSchedules', () => {
  /** メモリ上で動く Google カレンダーの代役 */
  function fakeApi(initial: Record<string, GoogleEventResource[]> = {}) {
    const calendars = new Map(Object.entries(initial));
    let seq = 0;
    const api: CalendarApi = {
      createCalendar: vi.fn(async () => {
        const id = `cal-${++seq}`;
        calendars.set(id, []);
        return id;
      }),
      listEvents: vi.fn(async (calendarId) => calendars.get(calendarId) ?? null),
      insertEvent: vi.fn(async (calendarId, event) => {
        calendars.get(calendarId)?.push(asResource(`ev-${++seq}`, event));
      }),
      updateEvent: vi.fn(async (calendarId, eventId, event) => {
        const events = calendars.get(calendarId) ?? [];
        events[events.findIndex((e) => e.id === eventId)] = asResource(eventId, event);
      }),
      deleteEvent: vi.fn(async (calendarId, eventId) => {
        const events = calendars.get(calendarId) ?? [];
        events.splice(
          events.findIndex((e) => e.id === eventId),
          1
        );
      }),
    };
    return { api, calendars };
  }

  const base = {
    calendarName: 'RisukeruGG - サンプルチーム',
    context: CONTEXT,
    now: NOW,
  };

  it('初回は専用カレンダーを作って ID を保存し、対象の予定をすべて追加する', async () => {
    const { api, calendars } = fakeApi();
    const onCalendarCreated = vi.fn(async () => {});
    const result = await exportSchedules({
      ...base,
      api,
      calendarId: null,
      schedules: [schedule('s1'), schedule('s2')],
      onCalendarCreated,
    });

    expect(api.createCalendar).toHaveBeenCalledWith('RisukeruGG - サンプルチーム');
    expect(onCalendarCreated).toHaveBeenCalledWith('cal-1');
    expect(result).toEqual({
      calendarId: 'cal-1',
      added: 2,
      updated: 0,
      deleted: 0,
      failed: 0,
      total: 2,
    });
    expect(calendars.get('cal-1')).toHaveLength(2);
  });

  it('再書き出しでは同じカレンダーを使い、変更が無ければ何も送らない', async () => {
    const { api } = fakeApi();
    const onCalendarCreated = vi.fn(async () => {});
    const schedules = [schedule('s1'), schedule('s2')];
    const first = await exportSchedules({
      ...base,
      api,
      calendarId: null,
      schedules,
      onCalendarCreated,
    });
    const second = await exportSchedules({
      ...base,
      api,
      calendarId: first.calendarId,
      schedules,
      onCalendarCreated,
    });

    expect(api.createCalendar).toHaveBeenCalledTimes(1);
    expect(onCalendarCreated).toHaveBeenCalledTimes(1);
    expect(second).toMatchObject({
      calendarId: 'cal-1',
      added: 0,
      updated: 0,
      deleted: 0,
      total: 0,
    });
  });

  it('変更・削除・追加を 1 回の再書き出しで反映する', async () => {
    const { api, calendars } = fakeApi();
    const onCalendarCreated = vi.fn(async () => {});
    const first = await exportSchedules({
      ...base,
      api,
      calendarId: null,
      schedules: [schedule('keep'), schedule('change'), schedule('remove')],
      onCalendarCreated,
    });
    const second = await exportSchedules({
      ...base,
      api,
      calendarId: first.calendarId,
      schedules: [schedule('keep'), schedule('change', { title: '変更後' }), schedule('new')],
      onCalendarCreated,
    });

    expect(second).toMatchObject({ added: 1, updated: 1, deleted: 1, failed: 0, total: 3 });
    expect(
      calendars
        .get('cal-1')
        ?.map((e) => e.summary)
        .sort()
    ).toEqual(['予定 keep', '予定 new', '変更後'].sort());
  });

  it('Google 側でカレンダーが削除されていたら作り直す', async () => {
    const { api } = fakeApi();
    const onCalendarCreated = vi.fn(async () => {});
    const result = await exportSchedules({
      ...base,
      api,
      calendarId: 'deleted-on-google',
      schedules: [schedule('s1')],
      onCalendarCreated,
    });

    expect(onCalendarCreated).toHaveBeenCalledWith('cal-1');
    expect(result).toMatchObject({ calendarId: 'cal-1', added: 1 });
  });

  it('一部の予定が失敗しても残りを続け、失敗件数を返す', async () => {
    const { api } = fakeApi();
    vi.mocked(api.insertEvent).mockRejectedValueOnce(new Error('rate limit'));
    const progress: Array<[number, number]> = [];
    const result = await exportSchedules({
      ...base,
      api,
      calendarId: null,
      schedules: [schedule('s1'), schedule('s2'), schedule('s3')],
      onCalendarCreated: async () => {},
      onProgress: (done, total) => progress.push([done, total]),
    });

    expect(result).toMatchObject({ added: 2, failed: 1, total: 3 });
    expect(progress).toEqual([
      [0, 3],
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
  });

  it('カレンダーの作成に失敗したら例外を投げ、何も書き出さない', async () => {
    const { api } = fakeApi();
    vi.mocked(api.createCalendar).mockRejectedValueOnce(new Error('forbidden'));
    await expect(
      exportSchedules({
        ...base,
        api,
        calendarId: null,
        schedules: [schedule('s1')],
        onCalendarCreated: async () => {},
      })
    ).rejects.toThrow('forbidden');
    expect(api.insertEvent).not.toHaveBeenCalled();
  });

  it('カレンダー ID の保存に失敗したら例外を投げ、何も書き出さない', async () => {
    const { api } = fakeApi();
    await expect(
      exportSchedules({
        ...base,
        api,
        calendarId: null,
        schedules: [schedule('s1')],
        onCalendarCreated: async () => {
          throw new Error('permission-denied');
        },
      })
    ).rejects.toThrow('permission-denied');
    expect(api.insertEvent).not.toHaveBeenCalled();
  });
});
