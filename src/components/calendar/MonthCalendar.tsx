'use client';

import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  startOfDay,
  endOfDay,
  isSameMonth,
  isToday,
} from 'date-fns';
import type { ScheduleEntry, ScheduleCategory } from '@/types/entities';

interface MonthCalendarProps {
  year: number;
  month: number; // 1-12
  schedules: ScheduleEntry[];
  categories: ScheduleCategory[];
  onEventClick: (schedule: ScheduleEntry) => void;
  onDateClick?: (date: Date) => void;
}

/** 日曜始まりの曜日ヘッダーラベル */
const DOW_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const DEFAULT_EVENT_COLOR = '#7F77DD';
const GCAL_EVENT_COLOR = '#4ade80';

/** イベントバーの高さ (px) */
const EVENT_H = 22;
/** イベントバー間のギャップ (px) */
const EVENT_GAP = 2;
/** 日付番号エリアの高さ (px) */
const DATE_H = 26;
/** 表示する最大トラック数（超えたら単日エリアに折り込み） */
const MAX_TRACKS = 2;

/** カテゴリ/ソースに基づくイベントカラーを返す */
function getEventColor(
  categoryId: string | null,
  categories: ScheduleCategory[],
  source?: 'google'
): string {
  if (source === 'google') return GCAL_EVENT_COLOR;
  const cat = categories.find((c) => c.id === categoryId);
  return cat?.color ?? DEFAULT_EVENT_COLOR;
}

/** 貪欲法によるトラック割り当て（重複なし） */
function assignTracks(
  events: Array<{ id: string; colStart: number; colEnd: number }>
): Record<string, number> {
  const result: Record<string, number> = {};
  /* colStart 昇順にソート */
  const sorted = [...events].sort((a, b) => a.colStart - b.colStart || a.colEnd - b.colEnd);
  /* 各トラックの最後の使用 colEnd を追跡 */
  const trackEnds: number[] = [];
  for (const evt of sorted) {
    let t = 0;
    while (t < trackEnds.length && trackEnds[t] >= evt.colStart) t++;
    result[evt.id] = t;
    trackEnds[t] = evt.colEnd;
  }
  return result;
}

/** 週行コンポーネント: 複数日バー + 単日イベントを描画 */
function WeekRow({
  weekDays,
  multiDayEvents,
  singleDaySchedules,
  categories,
  firstDay,
  onEventClick,
  onDateClick,
}: {
  weekDays: Date[];
  multiDayEvents: ScheduleEntry[];
  singleDaySchedules: ScheduleEntry[];
  categories: ScheduleCategory[];
  firstDay: Date;
  onEventClick: (s: ScheduleEntry) => void;
  onDateClick?: (d: Date) => void;
}) {
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];

  /* この週で表示すべき複数日イベントと列範囲を計算 */
  type EventCol = { id: string; colStart: number; colEnd: number; event: ScheduleEntry };
  const eventCols: EventCol[] = [];

  for (const s of multiDayEvents) {
    /* 週内に含まれるか確認 */
    if (s.startAt > endOfDay(weekEnd) || s.endAt < startOfDay(weekStart)) continue;

    /* 週内の開始列 */
    let colStart = -1;
    let colEnd = -1;
    for (let i = 0; i < 7; i++) {
      const inDay = s.startAt <= endOfDay(weekDays[i]) && s.endAt >= startOfDay(weekDays[i]);
      if (inDay) {
        if (colStart === -1) colStart = i;
        colEnd = i;
      }
    }
    if (colStart === -1) continue;
    eventCols.push({ id: s.id, colStart, colEnd, event: s });
  }

  /* トラック割り当て */
  const tracks = assignTracks(eventCols.map((e) => ({ id: e.id, colStart: e.colStart, colEnd: e.colEnd })));
  const maxTrack = eventCols.length > 0 ? Math.max(...Object.values(tracks)) : -1;
  const visibleTracks = Math.min(maxTrack + 1, MAX_TRACKS);

  /* 単日エリアの上部オフセット（日付番号 + 複数日バー分） */
  const topOffset = DATE_H + visibleTracks * (EVENT_H + EVENT_GAP) + 4;

  return (
    <div className="flex-1 relative border-b border-border last:border-b-0 min-h-0">
      {/* ── 日付セルグリッド ───────────────────────────────────── */}
      <div className="grid grid-cols-7 h-full">
        {weekDays.map((day) => {
          const isCurrentMonth = isSameMonth(day, firstDay);
          const isCurrentDay = isToday(day);

          /* 単日イベントのみ（複数日は絶対配置バーで描画） */
          const daySingles = singleDaySchedules
            .filter((s) => s.startAt <= endOfDay(day) && s.endAt >= startOfDay(day))
            .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

          return (
            <div
              key={day.toISOString()}
              className={[
                'border-r border-border last:border-r-0 relative overflow-hidden transition-colors',
                !isCurrentMonth ? 'opacity-40 bg-bg' : '',
                isCurrentDay ? 'bg-[rgba(127,119,221,0.05)]' : '',
                onDateClick ? 'cursor-pointer' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{ paddingTop: `${topOffset}px` }}
              onClick={() => onDateClick?.(day)}
            >
              {/* 日付番号（絶対配置） */}
              <div
                className="absolute left-1.5 flex items-center"
                style={{ top: '4px', height: `${DATE_H}px` }}
              >
                <span
                  className={[
                    'inline-flex items-center justify-center w-[22px] h-[22px] rounded-full text-[11px] font-bold',
                    isCurrentDay ? 'bg-purple-d text-purple-l' : 'text-muted',
                  ].join(' ')}
                >
                  {format(day, 'd')}
                </span>
              </div>

              {/* 単日イベント */}
              <div className="flex flex-col gap-[2px] px-1 pb-1 overflow-y-auto h-full">
                {daySingles.map((s) => {
                  const color = getEventColor(s.categoryId, categories, s.source);
                  const cat = categories.find((c) => c.id === s.categoryId);
                  return (
                    <button
                      key={s.id}
                      className="w-full text-left px-1.5 rounded-[4px] text-[10px] font-semibold text-white whitespace-nowrap overflow-hidden shrink-0 border-l-[3px] transition-opacity hover:opacity-80 flex items-center gap-1"
                      style={{
                        height: `${EVENT_H}px`,
                        background: `${color}28`,
                        borderLeftColor: color,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(s);
                      }}
                      title={s.title}
                    >
                      {cat?.icon && (
                        <span className="material-icons text-[10px] opacity-80 shrink-0">
                          {cat.icon}
                        </span>
                      )}
                      <span className="opacity-75 shrink-0 font-num">{format(s.startAt, 'HH:mm')}</span>
                      <span className="truncate">{s.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 複数日イベントバー（絶対配置オーバーレイ） ─────────── */}
      {eventCols.map(({ id, colStart, colEnd, event: s }) => {
        const track = tracks[id];
        /* MAX_TRACKS 超えは非表示（単日エリア内で折り込む対応は省略） */
        if (track >= MAX_TRACKS) return null;

        const color = getEventColor(s.categoryId, categories, s.source);
        const cat = categories.find((c) => c.id === s.categoryId);
        const startsBefore = startOfDay(s.startAt) < startOfDay(weekStart);
        const endsAfter = startOfDay(s.endAt) > startOfDay(weekEnd);

        const leftPct = `${(colStart / 7) * 100}%`;
        const widthPct = `${((colEnd - colStart + 1) / 7) * 100}%`;
        const topPx = DATE_H + 4 + track * (EVENT_H + EVENT_GAP);

        return (
          <button
            key={`${s.id}-w${weekStart.getTime()}`}
            className={[
              'absolute flex items-center gap-1 text-[11px] font-semibold text-white',
              'transition-opacity hover:opacity-80 overflow-hidden border-l-[3px]',
              'animate-puni',
              !startsBefore ? 'rounded-l-[4px]' : 'border-l-transparent',
              !endsAfter ? 'rounded-r-[4px]' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              left: leftPct,
              width: widthPct,
              top: `${topPx}px`,
              height: `${EVENT_H}px`,
              background: `${color}28`,
              borderLeftColor: startsBefore ? 'transparent' : color,
              paddingLeft: startsBefore ? '4px' : '6px',
              paddingRight: endsAfter ? '2px' : '6px',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onEventClick(s);
            }}
            title={s.title}
          >
            {/* 前週から続いている表示 */}
            {startsBefore && (
              <span className="opacity-50 shrink-0 text-[10px] leading-none">◀</span>
            )}
            {/* アイコン（開始日のある場合のみ） */}
            {!startsBefore && cat?.icon && (
              <span className="material-icons text-[10px] opacity-80 shrink-0">{cat.icon}</span>
            )}
            <span className="truncate flex-1">{s.title}</span>
            {/* 次週に続いている表示 */}
            {endsAfter && (
              <span className="opacity-50 shrink-0 text-[10px] leading-none">▶</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function MonthCalendar({
  year,
  month,
  schedules,
  categories,
  onEventClick,
  onDateClick,
}: MonthCalendarProps) {
  const firstDay = new Date(year, month - 1, 1);

  /* 日曜始まりのカレンダー全日リスト */
  const calStart = startOfWeek(startOfMonth(firstDay), { weekStartsOn: 0 });
  const calEnd = endOfWeek(endOfMonth(firstDay), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });
  const weekCount = days.length / 7;

  /* 複数日 vs 単日に分類 */
  const multiDaySchedules = schedules.filter(
    (s) => startOfDay(s.startAt).getTime() < startOfDay(s.endAt).getTime()
  );
  const singleDaySchedules = schedules.filter(
    (s) => startOfDay(s.startAt).getTime() === startOfDay(s.endAt).getTime()
  );

  return (
    <div className="flex flex-col flex-1 bg-surface overflow-hidden">
      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 border-b border-border bg-card shrink-0">
        {DOW_LABELS.map((d, i) => (
          <div
            key={d}
            className={`text-center py-2 text-[11px] font-bold tracking-widest ${
              i === 0 ? 'text-live' : i === 6 ? 'text-purple-l' : 'text-muted'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* 週行グリッド */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {Array.from({ length: weekCount }, (_, week) => {
          const weekDays = days.slice(week * 7, (week + 1) * 7);
          return (
            <WeekRow
              key={weekDays[0].toISOString()}
              weekDays={weekDays}
              multiDayEvents={multiDaySchedules}
              singleDaySchedules={singleDaySchedules}
              categories={categories}
              firstDay={firstDay}
              onEventClick={onEventClick}
              onDateClick={onDateClick}
            />
          );
        })}
      </div>
    </div>
  );
}
