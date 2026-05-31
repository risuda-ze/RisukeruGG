'use client';

import { useState } from 'react';
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
import { ja } from 'date-fns/locale';
import type { ScheduleEntry, ScheduleCategory } from '@/types/entities';

interface MonthCalendarProps {
  year: number;
  month: number; // 1-12
  schedules: ScheduleEntry[];
  categories: ScheduleCategory[];
  onEventClick: (schedule: ScheduleEntry) => void;
  onDateClick?: (date: Date) => void;
  /** 日付番号をクリックしたとき（週表示への切り替えに使用） */
  onDateLabelClick?: (date: Date) => void;
}

/** 日曜始まりの曜日ヘッダーラベル */
const DOW_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const DEFAULT_EVENT_COLOR = '#7F77DD';
const GCAL_EVENT_COLOR = '#4ade80';
const MEMBER_EVENT_COLOR = '#60a5fa';

/** イベントバーの高さ (px) */
const EVENT_H = 24;
/** イベントバー間のギャップ (px) */
const EVENT_GAP = 2;
/** 日付番号エリアの高さ (px) */
const DATE_H = 20;
/** 表示する最大トラック数 */
const MAX_TRACKS = 2;
/** 単日カード・複数日バーの左右余白 (px) */
const CELL_PAD = 4;

/** カテゴリ/ソースに基づくイベントカラーを返す */
function getEventColor(
  categoryId: string | null,
  categories: ScheduleCategory[],
  source?: 'google' | 'member'
): string {
  if (source === 'google') return GCAL_EVENT_COLOR;
  if (source === 'member') return MEMBER_EVENT_COLOR;
  const cat = categories.find((c) => c.id === categoryId);
  return cat?.color ?? DEFAULT_EVENT_COLOR;
}

/** 貪欲法によるトラック割り当て（重複なし） */
function assignTracks(
  events: Array<{ id: string; colStart: number; colEnd: number }>
): Record<string, number> {
  const result: Record<string, number> = {};
  const sorted = [...events].sort((a, b) => a.colStart - b.colStart || a.colEnd - b.colEnd);
  const trackEnds: number[] = [];
  for (const evt of sorted) {
    let t = 0;
    while (t < trackEnds.length && trackEnds[t] >= evt.colStart) t++;
    result[evt.id] = t;
    trackEnds[t] = evt.colEnd;
  }
  return result;
}

/** ホバー時のツールチップ */
type DayTooltip = { day: Date; x: number; y: number } | null;

/** 週行コンポーネント */
function WeekRow({
  weekDays,
  multiDayEvents,
  singleDaySchedules,
  categories,
  firstDay,
  onEventClick,
  onDateClick,
  onDateLabelClick,
  onDayHover,
  onDayHoverEnd,
}: {
  weekDays: Date[];
  multiDayEvents: ScheduleEntry[];
  singleDaySchedules: ScheduleEntry[];
  categories: ScheduleCategory[];
  firstDay: Date;
  onEventClick: (s: ScheduleEntry) => void;
  onDateClick?: (d: Date) => void;
  onDateLabelClick?: (d: Date) => void;
  onDayHover: (day: Date, x: number, y: number) => void;
  onDayHoverEnd: () => void;
}) {
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];

  /* この週で表示すべき複数日イベントと列範囲を計算 */
  type EventCol = { id: string; colStart: number; colEnd: number; event: ScheduleEntry };
  const eventCols: EventCol[] = [];

  for (const s of multiDayEvents) {
    if (s.startAt > endOfDay(weekEnd) || s.endAt < startOfDay(weekStart)) continue;
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

  /* 複数日イベントを期間の長い順（降順）でソートしてからトラック割り当て */
  const sortedEventCols = [...eventCols].sort(
    (a, b) => (b.colEnd - b.colStart) - (a.colEnd - a.colStart)
  );
  const tracks = assignTracks(sortedEventCols.map((e) => ({ id: e.id, colStart: e.colStart, colEnd: e.colEnd })));

  /* 日単位で「そのカラムをカバーする複数日バー本数」を求め、セルごとの paddingTop を算出する
   * バーがない日は日付直下（DATE_H + 4）から始まり、バーがある日だけその分下がる */
  const colTopOffset: number[] = Array(7).fill(DATE_H + 4);
  for (const { id, colStart, colEnd } of eventCols) {
    const track = tracks[id];
    if (track >= MAX_TRACKS) continue;
    const offset = DATE_H + (track + 1) * (EVENT_H + EVENT_GAP) + 4;
    for (let col = colStart; col <= colEnd; col++) {
      if (offset > colTopOffset[col]) colTopOffset[col] = offset;
    }
  }

  /* 各カラムでオーバーフローした複数日イベント数を集計 */
  const overflowByCol: Record<number, number> = {};
  for (const { id, colStart, colEnd } of eventCols) {
    if (tracks[id] >= MAX_TRACKS) {
      for (let col = colStart; col <= colEnd; col++) {
        overflowByCol[col] = (overflowByCol[col] ?? 0) + 1;
      }
    }
  }

  return (
    <div className="flex-1 relative border-b border-border last:border-b-0 min-h-0">
      {/* ── 日付セルグリッド ── */}
      <div className="grid grid-cols-7 h-full">
        {weekDays.map((day, colIndex) => {
          const isCurrentMonth = isSameMonth(day, firstDay);
          const isCurrentDay = isToday(day);
          const daySingles = singleDaySchedules
            .filter((s) => s.startAt <= endOfDay(day) && s.endAt >= startOfDay(day))
            .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

          {/* この日付セルに表示中の複数日バー本数（MAX_TRACKS 以下のもの） */}
          const visibleBarCount = eventCols.filter(
            ({ id, colStart, colEnd }) =>
              tracks[id] < MAX_TRACKS && colStart <= colIndex && colIndex <= colEnd
          ).length;
          /* 単日イベントは 3件合計 から複数日バー数を引いた残りを表示上限とする */
          const MAX_TOTAL = 3;
          const singleLimit = Math.max(0, MAX_TOTAL - visibleBarCount);
          const visibleSingles = daySingles.slice(0, singleLimit);
          const hiddenSingleCount = daySingles.length - visibleSingles.length;
          /* 複数日バーのオーバーフロー（MAX_TRACKSを超えたバー）も合計に含める */
          const totalOverflow = (overflowByCol[colIndex] ?? 0) + hiddenSingleCount;

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
              style={{ paddingTop: `${colTopOffset[colIndex]}px` }}
              onClick={() => onDateClick?.(day)}
            >
              {/* 日付番号（ホバーでツールチップ表示） */}
              <div
                className="absolute left-1.5 flex items-center"
                style={{ top: '4px', height: `${DATE_H}px` }}
              >
                <span
                  className={[
                    'inline-flex items-center justify-center w-[22px] h-[22px] rounded-full text-[11px] font-medium',
                    onDateLabelClick ? 'cursor-pointer hover:bg-purple-d/60' : 'cursor-default hover:bg-purple-d/40',
                    'transition-colors',
                    isCurrentDay ? 'bg-purple-d text-purple-l' : 'text-muted hover:text-purple-l',
                  ].join(' ')}
                  onMouseEnter={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    onDayHover(day, rect.right + 6, rect.top);
                  }}
                  onMouseLeave={onDayHoverEnd}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDateLabelClick?.(day);
                  }}
                >
                  {format(day, 'd')}
                </span>
              </div>

              {/* 単日イベント（最大 singleLimit 件）+ オーバーフロー表示 */}
              <div className="flex flex-col gap-[2px] px-1 pb-1 overflow-y-auto h-full">
                {visibleSingles.map((s) => {
                  const color = getEventColor(s.categoryId, categories, s.source);
                  const cat = categories.find((c) => c.id === s.categoryId);
                  return (
                    <button
                      key={s.id}
                      className="w-full text-left px-1.5 rounded-[4px] text-[13px] font-medium text-white whitespace-nowrap overflow-hidden shrink-0 border-l-[3px] transition-opacity hover:opacity-80 flex items-center gap-1 animate-pop-scale"
                      style={{ height: `${EVENT_H}px`, background: `${color}55`, borderLeftColor: color }}
                      onClick={(e) => { e.stopPropagation(); onEventClick(s); }}
                      title={s.title}
                    >
                      {cat?.icon && (
                        <span className="material-icons text-[10px] opacity-80 shrink-0">{cat.icon}</span>
                      )}
                      <span className="opacity-75 shrink-0 font-num">{format(s.startAt, 'HH:mm')}</span>
                      <span className="truncate">{s.title}</span>
                    </button>
                  );
                })}
                {/* +N件：クリックで週表示に切り替え */}
                {totalOverflow > 0 && (
                  <button
                    className="text-[10px] text-muted px-1 py-0.5 font-semibold shrink-0 hover:text-purple-l transition-colors text-left"
                    onClick={(e) => { e.stopPropagation(); onDateLabelClick?.(day); }}
                  >
                    +{totalOverflow}件
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 複数日イベントバー（絶対配置） ── */}
      {eventCols.map(({ id, colStart, colEnd, event: s }) => {
        const track = tracks[id];
        if (track >= MAX_TRACKS) return null;

        const color = getEventColor(s.categoryId, categories, s.source);
        const cat = categories.find((c) => c.id === s.categoryId);
        const startsBefore = startOfDay(s.startAt) < startOfDay(weekStart);
        const endsAfter = startOfDay(s.endAt) > startOfDay(weekEnd);

        /* 単日カードと同等の余白を確保: 境界側は0px、開始・終了側は4px */
        const marginLeft = !startsBefore ? CELL_PAD : 0;
        const marginRight = !endsAfter ? CELL_PAD : 0;

        const leftPct = `${(colStart / 7) * 100}%`;
        const widthPct = `${((colEnd - colStart + 1) / 7) * 100}%`;
        const topPx = DATE_H + 4 + track * (EVENT_H + EVENT_GAP);

        return (
          <button
            key={`${s.id}-w${weekStart.getTime()}`}
            className={[
              'absolute overflow-hidden border-l-[3px] animate-pop-scale',
              'transition-opacity hover:opacity-80 text-white',
              'flex items-center',
              !startsBefore ? 'rounded-l-[4px]' : 'border-l-transparent',
              !endsAfter ? 'rounded-r-[4px]' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              left: `calc(${leftPct} + ${marginLeft}px)`,
              width: `calc(${widthPct} - ${marginLeft + marginRight}px)`,
              top: `${topPx}px`,
              height: `${EVENT_H}px`,
              background: `${color}55`,
              borderLeftColor: startsBefore ? 'transparent' : color,
              paddingLeft: startsBefore ? '3px' : '5px',
              paddingRight: endsAfter ? '2px' : '5px',
              gap: '3px',
            }}
            onClick={(e) => { e.stopPropagation(); onEventClick(s); }}
            title={s.title}
          >
            {/* 左: ◀ or アイコン、次に開始時刻（日程は表示しない） */}
            <div className="flex items-center gap-0.5 shrink-0">
              {startsBefore ? (
                <span className="opacity-50 text-[9px] leading-none">◀</span>
              ) : (
                <>
                  {cat?.icon && (
                    <span className="material-icons text-[10px] opacity-80 leading-none">{cat.icon}</span>
                  )}
                  {!s.allDay && (
                    <span className="opacity-65 text-[11px] font-num leading-none whitespace-nowrap">
                      {format(s.startAt, 'HH:mm')}
                    </span>
                  )}
                </>
              )}
            </div>
            {/* タイトル（左揃え） */}
            <span className="flex-1 text-left text-[13px] font-medium truncate leading-none">
              {s.title}
            </span>
            {/* 右: ▶ */}
            {endsAfter && (
              <span className="opacity-50 text-[9px] leading-none shrink-0">▶</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** 日付ホバーツールチップ（読み取り専用プレビュー） */
function DayTooltipPanel({
  tooltip,
  schedules,
  categories,
}: {
  tooltip: NonNullable<DayTooltip>;
  schedules: ScheduleEntry[];
  categories: ScheduleCategory[];
}) {
  const daySchedules = schedules
    .filter((s) => s.startAt <= endOfDay(tooltip.day) && s.endAt >= startOfDay(tooltip.day))
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  /* パネルサイズ（元の1.5倍）と画面上下オーバーフロー対策 */
  const PANEL_W = 360;
  const approxItemH = 44;
  const panelH = 36 + daySchedules.length * approxItemH + 8;

  const x = typeof window !== 'undefined'
    ? Math.max(8, Math.min(tooltip.x, window.innerWidth - PANEL_W - 8))
    : tooltip.x;

  /* 画面の下半分にカーソルがある場合はパネルを上方向に展開 */
  const isLowerHalf = typeof window !== 'undefined' && tooltip.y > window.innerHeight / 2;
  const y = isLowerHalf ? tooltip.y - panelH - 8 : tooltip.y;

  return (
    <div
      className="fixed z-[400] rounded-[12px] border border-border bg-card shadow-xl overflow-hidden pointer-events-none"
      style={{ left: x, top: y, width: PANEL_W }}
    >
      {/* ヘッダー */}
      <div className="px-3 py-2 border-b border-border bg-surface/60">
        <p className="text-[12px] font-medium text-text">
          {format(tooltip.day, 'M月d日(E)', { locale: ja })}
        </p>
      </div>

      {daySchedules.length === 0 ? (
        <p className="px-3 py-3 text-[11px] text-muted italic">予定なし</p>
      ) : (
        <div className="flex flex-col">
          {daySchedules.map((s) => {
            const color = getEventColor(s.categoryId, categories, s.source);
            const cat = categories.find((c) => c.id === s.categoryId);
            return (
              <div
                key={s.id}
                className="flex items-center gap-2 px-3 py-2 border-b border-border/50 last:border-b-0"
                style={{ borderLeftColor: color, borderLeftWidth: '2px' }}
              >
                {cat?.icon && (
                  <span className="material-icons text-[12px] shrink-0" style={{ color }}>
                    {cat.icon}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-text truncate">{s.title}</p>
                  <p className="text-[10px] text-muted font-num">
                    {format(s.startAt, 'HH:mm')} – {format(s.endAt, 'HH:mm')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
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
  onDateLabelClick,
}: MonthCalendarProps) {
  const firstDay = new Date(year, month - 1, 1);

  const calStart = startOfWeek(startOfMonth(firstDay), { weekStartsOn: 0 });
  const calEnd = endOfWeek(endOfMonth(firstDay), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });
  const weekCount = days.length / 7;

  /* ホバーツールチップの状態 */
  const [dayTooltip, setDayTooltip] = useState<DayTooltip>(null);

  /* allDay フラグ付き単日イベントも複数日バーとして扱う */
  const multiDaySchedules = schedules.filter(
    (s) => s.allDay || startOfDay(s.startAt).getTime() < startOfDay(s.endAt).getTime()
  );
  const singleDaySchedules = schedules.filter(
    (s) => !s.allDay && startOfDay(s.startAt).getTime() === startOfDay(s.endAt).getTime()
  );

  return (
    <div className="flex flex-col flex-1 bg-bg overflow-hidden">
      {/* 曜日ヘッダー（高さ削減） */}
      <div className="grid grid-cols-7 border-b border-border bg-card shrink-0">
        {DOW_LABELS.map((d, i) => (
          <div
            key={d}
            className={`text-center py-1 text-[11px] font-medium tracking-widest ${
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
              onDateLabelClick={onDateLabelClick}
              onDayHover={(day, x, y) => setDayTooltip({ day, x, y })}
              onDayHoverEnd={() => setDayTooltip(null)}
            />
          );
        })}
      </div>

      {/* 日付ホバーツールチップ */}
      {dayTooltip && (
        <DayTooltipPanel
          tooltip={dayTooltip}
          schedules={schedules}
          categories={categories}
        />
      )}
    </div>
  );
}
