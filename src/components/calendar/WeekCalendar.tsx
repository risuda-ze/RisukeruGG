'use client';

import { format, startOfWeek, addDays, startOfDay, isToday, isSameDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { ScheduleEntry, Category } from '@/types/entities';
import {
  eventOccupiesDay,
  getEventLastDay,
  isMultiDayEvent,
  getEventDayCount,
  getEventDayIndex,
} from '@/lib/utils/eventDays';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Icon } from '@/components/ui/Icon';

interface WeekCalendarProps {
  currentDate: Date;
  schedules: ScheduleEntry[];
  categories: Category[];
  onEventClick: (schedule: ScheduleEntry) => void;
  onDateClick?: (date: Date) => void;
}

/** 日曜始まりの曜日ヘッダーラベル */
const DOW_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const DEFAULT_EVENT_COLOR = '#7d68c5'; // DESIGN.md primary（dark）
const GCAL_EVENT_COLOR = '#4ade80';
const MEMBER_EVENT_COLOR = '#60a5fa';

function getEventStyle(
  categoryId: string | null,
  categories: Category[],
  source?: 'google' | 'member'
): { background: string; borderLeftColor: string } {
  if (source === 'google') {
    return { background: `${GCAL_EVENT_COLOR}55`, borderLeftColor: GCAL_EVENT_COLOR };
  }
  if (source === 'member') {
    return { background: `${MEMBER_EVENT_COLOR}55`, borderLeftColor: MEMBER_EVENT_COLOR };
  }
  const cat = categories.find((c) => c.id === categoryId);
  const color = cat?.color ?? DEFAULT_EVENT_COLOR;
  return { background: `${color}55`, borderLeftColor: color };
}

/** 曜日インデックスから色クラスを返す（0=日, 6=土） */
function getDowColorClass(i: number): string {
  if (i === 0) return 'text-live';
  if (i === 6) return 'text-info';
  return 'text-text-muted';
}

/** 週内でイベントが占める列範囲を取得する（0-indexed, null = 週外） */
function getEventWeekCols(
  event: ScheduleEntry,
  days: Date[]
): { start: number; end: number } | null {
  let startCol = -1;
  let endCol = -1;
  for (let i = 0; i < days.length; i++) {
    if (eventOccupiesDay(event, days[i])) {
      if (startCol === -1) startCol = i;
      endCol = i;
    }
  }
  if (startCol === -1) return null;
  return { start: startCol, end: endCol };
}

export function WeekCalendar({
  currentDate,
  schedules,
  categories,
  onEventClick,
  onDateClick,
}: WeekCalendarProps) {
  /* スマホ縦持ち（md 未満）はアジェンダ表示のみをマウント（PC グリッドとの二重マウントを回避） */
  const isMobile = useMediaQuery(767);
  /* 日曜始まり（weekStartsOn: 0）*/
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  /* allDay フラグ付き・複数日・単日イベントに分類（終了境界は排他的に解釈） */
  const allDaySchedules = schedules.filter((s) => s.allDay);
  const multiDaySchedules = schedules.filter((s) => !s.allDay && isMultiDayEvent(s));
  const singleDaySchedules = schedules.filter((s) => !s.allDay && !isMultiDayEvent(s));
  /* all-day ストリップ: allDay + 複数日 */
  const allDayInWeek = [...allDaySchedules, ...multiDaySchedules].filter(
    (s) => getEventWeekCols(s, days) !== null
  );
  /* モバイル連日ストリップ: 複数日イベントのみ（単日終日は日別リスト側だけに出す） */
  const multiDayStripInWeek = allDayInWeek.filter((s) => isMultiDayEvent(s));

  return (
    <div className="calweekview">

      {/* ── 曜日ヘッダー（デスクトップ） ────────────────────── */}
      {!isMobile && (
      <div className="cwv__head grid">
        {days.map((day, i) => {
          const isCurrentDay = isToday(day);
          return (
            <button
              key={day.toISOString()}
              className={`cwv__daybtn${isCurrentDay ? ' is-today' : ''}`}
              onClick={() => onDateClick?.(day)}
              title="この日に予定を追加"
            >
              <span className={`cwv__wd${i === 0 ? ' is-sun' : i === 6 ? ' is-sat' : ''}`}>{DOW_LABELS[i]}</span>
              <span className="cwv__dnum">{format(day, 'd')}</span>
            </button>
          );
        })}
      </div>
      )}

      {/* ── all-day ストリップ（デスクトップ） ── */}
      {!isMobile && allDayInWeek.length > 0 && (
        <div
          className="grid grid-cols-7 border-b border-border shrink-0 bg-card/20 py-1 gap-y-0.5"
          style={{ gridAutoRows: '22px' }}
        >
          {allDayInWeek.map((event) => {
            const cols = getEventWeekCols(event, days)!;
            const evStyle = getEventStyle(event.categoryId, categories, event.source);
            const cat = categories.find((c) => c.id === event.categoryId);
            /* 週の外に伸びている場合は角丸/ボーダーを調整 */
            const startsBefore = startOfDay(event.startAt) < startOfDay(days[0]);
            const endsAfter = getEventLastDay(event) > startOfDay(days[6]);

            return (
              <button
                key={event.id}
                className={[
                  'flex items-center gap-1.5 text-[13px] font-medium text-white px-2 py-1',
                  'transition-[filter] hover:brightness-[1.16] overflow-hidden border-l-[3px]',
                  'animate-puni',
                  !startsBefore ? 'ml-1 rounded-l-[6px]' : 'ml-0 border-l-transparent',
                  !endsAfter ? 'mr-1 rounded-r-[6px]' : 'mr-0',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{
                  gridColumn: `${cols.start + 1} / ${cols.end + 2}`,
                  background: evStyle.background,
                  borderLeftColor: !startsBefore ? evStyle.borderLeftColor : 'transparent',
                  willChange: 'filter',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick(event);
                }}
                title={event.title}
              >
                {cat?.icon && (
                  <span className="material-icons text-[10px] opacity-80 shrink-0">{cat.icon}</span>
                )}
                <span className="truncate">{event.title}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── モバイル: アジェンダリスト表示 ──────────────────── */}
      {isMobile && (
      <div className="flex-1 overflow-y-auto divide-y divide-border/60">
        {/* 連日予定ストリップ（週内で一度だけ表示）。
            単日の終日イベントは日別リスト側にのみ出し、二重表示を避ける */}
        {multiDayStripInWeek.length > 0 && (
          <div className="px-3 py-2.5 flex flex-col gap-1.5 bg-card/25">
            <span className="text-[10px] font-medium tracking-widest text-text-muted/70 px-1">
              連日の予定
            </span>
            {multiDayStripInWeek.map((event) => {
              const style = getEventStyle(event.categoryId, categories, event.source);
              const last = getEventLastDay(event);
              const rangeLabel = isSameDay(event.startAt, last)
                ? format(event.startAt, 'M/d(E)', { locale: ja })
                : `${format(event.startAt, 'M/d(E)', { locale: ja })}〜${format(last, 'M/d(E)', { locale: ja })}`;
              return (
                <button
                  key={event.id}
                  className="w-full text-left flex items-center gap-2.5 pl-3 pr-3 py-2 rounded-[8px] border-l-[3px] transition-opacity active:opacity-70 min-h-[44px]"
                  style={style}
                  onClick={() => onEventClick(event)}
                >
                  <span className="text-[13px] font-medium text-white truncate flex-1">
                    {event.title}
                  </span>
                  <span className="text-[11px] font-num text-white/55 shrink-0">
                    {rangeLabel}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {days.map((day, i) => {
          /* 複数日対応: 当日の範囲内にある全イベントを取得 */
          const daySchedules = schedules
            .filter((s) => eventOccupiesDay(s, day))
            .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
          const isCurrentDay = isToday(day);

          return (
            <div key={day.toISOString()}>
              <div
                className={`flex items-center gap-2 px-4 py-2 ${
                  isCurrentDay ? 'bg-[color-mix(in oklab, var(--primary) 8%, transparent)]' : 'bg-card/40'
                }`}
              >
                <span className={`text-[10px] font-medium tracking-widest ${getDowColorClass(i)}/60`}>
                  {DOW_LABELS[i]}
                </span>
                <span
                  className={`text-[14px] font-medium font-num ${
                    isCurrentDay ? 'text-purple-l' : getDowColorClass(i)
                  }`}
                >
                  {format(day, 'M/d', { locale: ja })}
                </span>
                {isCurrentDay && (
                  <span className="text-[10px] font-medium text-purple-l bg-purple-d/40 px-1.5 py-0.5 rounded-full">
                    今日
                  </span>
                )}
                {/* 予定がある日: 日付ヘッダー右端の追加ボタン（編集権限がある場合のみ） */}
                {onDateClick && daySchedules.length > 0 && (
                  <button
                    onClick={() => onDateClick(day)}
                    className="ml-auto shrink-0 w-9 h-9 -my-1 flex items-center justify-center rounded-[8px] text-text-muted active:text-accent active:bg-surface transition-colors"
                    aria-label={`${format(day, 'M月d日', { locale: ja })}に予定を追加`}
                  >
                    <Icon name="add" size={18} />
                  </button>
                )}
              </div>

              {daySchedules.length === 0 ? (
                onDateClick ? (
                  /* 予定が無い日: 追加を促す空状態行（タップで作成モーダル） */
                  <button
                    onClick={() => onDateClick(day)}
                    className="w-full text-left flex items-center gap-2 px-5 py-2.5 min-h-[44px] text-[12px] text-text-muted/45 active:text-accent transition-colors"
                  >
                    <Icon name="add" size={15} />
                    <span>予定を追加</span>
                  </button>
                ) : (
                  <div className="px-5 py-3 text-[12px] text-text-muted/40">—</div>
                )
              ) : (
                <div className="px-3 py-2 flex flex-col gap-1.5">
                  {daySchedules.map((s) => {
                    const style = getEventStyle(s.categoryId, categories, s.source);
                    const cat = categories.find((c) => c.id === s.categoryId);
                    const isMulti = isMultiDayEvent(s);
                    const isContinuation = isMulti && !isSameDay(s.startAt, day);

                    /* 継続日: 薄い 1 行チップ（n/総日目） */
                    if (isContinuation) {
                      return (
                        <button
                          key={s.id}
                          className="w-full text-left flex items-center gap-2.5 px-3 h-8 rounded-[8px] border-l-[3px] opacity-60 transition-opacity active:opacity-40"
                          style={{ borderLeftColor: style.borderLeftColor, background: 'transparent' }}
                          onClick={() => onEventClick(s)}
                        >
                          <span className="text-[12px] font-medium text-text-muted truncate flex-1">
                            {s.title}
                          </span>
                          <span className="text-[10px] font-num text-text-muted/70 shrink-0">
                            {getEventDayIndex(s, day)}/{getEventDayCount(s)}日目
                          </span>
                        </button>
                      );
                    }

                    /* 開始日 or 単日: 通常カード（複数日の開始日は開始マーク付き） */
                    return (
                      <button
                        key={s.id}
                        className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-[8px] border-l-[3px] transition-opacity active:opacity-70 min-h-[44px]"
                        style={style}
                        onClick={() => onEventClick(s)}
                      >
                        {cat?.icon && (
                          <span className="material-icons text-[14px] opacity-80 shrink-0">
                            {cat.icon}
                          </span>
                        )}
                        <span className="text-[12px] font-num text-white/60 shrink-0 w-10">
                          {s.allDay ? '終日' : format(s.startAt, 'HH:mm')}
                        </span>
                        <span className="text-[14px] font-medium text-white truncate flex-1 flex items-center gap-1.5">
                          {isMulti && (
                            <Icon name="chevron_right" size={14} className="text-white/50 shrink-0" />
                          )}
                          <span className="truncate">{s.title}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}

      {/* ── デスクトップ: 単日イベントのグリッド ────────────── */}
      {!isMobile && (
      <div className="cwv__cols grid">
        {days.map((day) => {
          const daySingleSchedules = singleDaySchedules
            .filter((s) => eventOccupiesDay(s, day))
            .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
          const isCurrentDay = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={`cwv__col${isCurrentDay ? ' is-today' : ''}`}
              onClick={() => onDateClick?.(day)}
            >
              {daySingleSchedules.length === 0 ? (
                <span className="cwv__emptyhint">＋ 追加</span>
              ) : (
                daySingleSchedules.map((s) => {
                  const evStyle = getEventStyle(s.categoryId, categories, s.source);
                  const cat = categories.find((c) => c.id === s.categoryId);
                  return (
                    <button
                      key={s.id}
                      className="cwv__evt w-full text-left"
                      style={{ '--evt': evStyle.borderLeftColor, '--evt-bg': evStyle.background } as React.CSSProperties}
                      onClick={(e) => { e.stopPropagation(); onEventClick(s); }}
                      title={s.title}
                    >
                      <div className="cwv__evt-top">
                        {cat?.icon && (
                          <span className="material-icons text-[12px] opacity-80 shrink-0" style={{ color: evStyle.borderLeftColor }}>{cat.icon}</span>
                        )}
                        <span className="cwv__evt-time">{format(s.startAt, 'HH:mm')}</span>
                      </div>
                      <span className="cwv__evt-title">{s.title}</span>
                    </button>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
