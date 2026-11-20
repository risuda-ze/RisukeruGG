'use client';

import { useEffect, useLayoutEffect } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { useScrollWindow } from '@/hooks/useScrollWindow';
import { monthOf } from '@/lib/unavailability/range';
import {
  MONTH_LOAD_MARGIN_DAYS,
  centerOffset,
  countUnavailable,
  dayLabel,
  lastUpdatedLabel,
  monthsAround,
  scrollOffsetFor,
  virtualRange,
  weekCenter,
} from '@/lib/unavailability/view';
import type { MemberUnavailability } from '@/lib/unavailability/view';
import { cn } from '@/lib/utils/cn';
import type { TeamMember } from '@/types/entities';

/** 期間の指定。空文字は未指定 */
export interface PeriodFocus {
  from: string;
  to: string;
}

interface UnavailabilityGridProps {
  /** 表示範囲（前月 1 日〜翌月末日）の日付 */
  dates: string[];
  today: string;
  /** 表示するメンバー（自分が先頭） */
  members: TeamMember[];
  selfId: string | null;
  byMember: ReadonlyMap<string, MemberUnavailability>;
  /** 最初のスナップショットを受け取った月 */
  loadedMonths: ReadonlySet<string>;
  /** true: 行＝日・列＝メンバー（モバイル）。false: 行＝メンバー・列＝日 */
  vertical: boolean;
  /** 表示位置。オブジェクトが変わるたびに移動する。両方未指定なら当日の週を中央にする */
  focus: PeriodFocus;
  onNeedMonths: (months: string[]) => void;
  onCellClick: (userId: string, date: string) => void;
}

// PC（列＝日）
const LABEL_W = 220;
const MIN_COL_W = 44;
/** 初期表示でおよそ 1 ヶ月ぶんの列が収まるようにする */
const DAYS_PER_SCREEN = 31;
// モバイル（行＝日）
const HEAD_H = 92;
const ROW_H = 44;

/** 日の並び方向の、固定見出しの大きさと 1 日ぶんの大きさ */
function dayAxis(vertical: boolean, clientSize: number): { lead: number; itemSize: number } {
  if (vertical) return { lead: HEAD_H, itemSize: ROW_H };
  return {
    lead: LABEL_W,
    itemSize: Math.max(MIN_COL_W, Math.floor((clientSize - LABEL_W) / DAYS_PER_SCREEN)),
  };
}

// cn は独自の文字サイズ（text-caption 等）と文字色を同じ分類として後勝ちでまとめ、サイズを落とす。
// 両方を付ける箇所は cn を通さずテンプレート文字列で組み立てる

/** 全メンバーの対応不可を日単位で並べる一覧。日の並び方向だけ仮想スクロールする（UN-050〜UN-055, UN-091） */
export function UnavailabilityGrid({
  dates,
  today,
  members,
  selfId,
  byMember,
  loadedMonths,
  vertical,
  focus,
  onNeedMonths,
  onCellClick,
}: UnavailabilityGridProps) {
  const { el, setEl, win } = useScrollWindow(!vertical);
  const ready = win !== null;

  // 表示位置の移動（初期表示・期間の指定・条件の解除）
  useLayoutEffect(() => {
    if (!el || !ready) return;
    const { lead, itemSize } = dayAxis(vertical, vertical ? el.clientHeight : el.clientWidth);
    const viewport = (vertical ? el.clientHeight : el.clientWidth) - lead;
    const indexOf = (date: string) => {
      const index = dates.indexOf(date);
      return index === -1 ? null : index;
    };
    const offset =
      scrollOffsetFor(indexOf(focus.from), indexOf(focus.to), itemSize, viewport) ??
      centerOffset(dates.indexOf(weekCenter(today)), itemSize, viewport);
    el.scrollTo(vertical ? { top: offset } : { left: offset });
  }, [el, ready, vertical, dates, today, focus]);

  // 表示中の範囲が前月・翌月の端に近づいたら、その月の購読を足す（UN-090）
  useEffect(() => {
    if (!el || !win) return;
    const { lead, itemSize } = dayAxis(vertical, win.size);
    // 表示位置の移動直後は win.offset が古いので、実際のスクロール量を読む
    const offset = vertical ? el.scrollTop : el.scrollLeft;
    const visible = virtualRange(offset, win.size - lead, itemSize, dates.length, 0);
    onNeedMonths(monthsAround(dates, visible.start, visible.end, MONTH_LOAD_MARGIN_DAYS));
  }, [el, win, vertical, dates, onNeedMonths]);

  const { lead, itemSize } = dayAxis(vertical, win?.size ?? 0);
  const viewport = Math.max(0, (win?.size ?? 0) - lead);
  // 表示中と前後 1 画面ぶんだけ描画する
  const { start, end } = virtualRange(win?.offset ?? 0, viewport, itemSize, dates.length, viewport);
  const shownDates = dates.slice(start, end);
  const memberIds = members.map((m) => m.userId);

  const days = shownDates.map((date) => {
    const loaded = loadedMonths.has(monthOf(date));
    return {
      date,
      loaded,
      isToday: date === today,
      ...dayLabel(date),
      count: loaded ? countUnavailable(memberIds, byMember, date) : null,
    };
  });

  const cell = (member: TeamMember, day: (typeof days)[number], style: React.CSSProperties) => {
    const unavailable = (byMember.get(member.userId)?.days[day.date] ?? 0) !== 0;
    return (
      <button
        key={vertical ? member.userId : day.date}
        type="button"
        data-testid="un-cell"
        data-user={member.userId}
        data-date={day.date}
        data-unavailable={unavailable}
        aria-label={`${member.displayName} ${day.md}（${day.weekday}）${
          day.loaded ? (unavailable ? '対応不可あり' : '対応不可なし') : '読み込み中'
        }`}
        onClick={() => onCellClick(member.userId, day.date)}
        style={style}
        className={cn(
          'flex h-11 shrink-0 cursor-pointer items-center justify-center border-l border-border text-base font-bold transition-colors duration-(--duration-instant) hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand',
          vertical && 'w-18',
          unavailable && 'bg-danger-tint text-danger',
          !day.loaded && 'text-text-disabled',
          // 当日の列を枡線で示す（行＝日のときは日付セルの面で示す）
          day.isToday && !vertical && 'border-l-border-strong'
        )}
      >
        {day.loaded ? unavailable && '×' : '…'}
      </button>
    );
  };

  const countLabel = (day: (typeof days)[number]) => (
    <span
      data-testid="un-count"
      data-date={day.date}
      aria-label={day.count === null ? '読み込み中' : `対応不可 ${day.count}人`}
      className={`font-num text-caption ${day.count ? 'font-bold text-danger' : 'text-text-muted'}`}
    >
      {day.count === null ? '…' : `${day.count}人`}
    </span>
  );

  const memberLabel = (member: TeamMember) =>
    lastUpdatedLabel(byMember.get(member.userId)?.updatedAt, today);

  return (
    <div
      ref={setEl}
      data-testid="un-grid"
      className="min-h-0 flex-1 overflow-auto overscroll-contain"
    >
      {ready && !vertical && (
        <div style={{ width: LABEL_W + dates.length * itemSize }}>
          {/* 見出し: 日付と、その日の不可人数 */}
          <div className="sticky top-0 z-30 flex h-16 bg-surface-2">
            <div
              style={{ width: LABEL_W }}
              className="sticky left-0 z-10 flex shrink-0 flex-col justify-between bg-surface-2 px-4 py-2"
            >
              <span className="eyebrow text-text-2">メンバー</span>
              <span className="text-caption text-text-2">対応不可の人数</span>
            </div>
            <div style={{ width: start * itemSize }} className="shrink-0" />
            {days.map((day) => (
              <div
                key={day.date}
                data-testid="un-day"
                data-date={day.date}
                style={{ width: itemSize }}
                className={cn(
                  'flex shrink-0 flex-col items-center justify-between border-l border-border py-1.5',
                  day.isToday && 'border-l-border-strong bg-card'
                )}
              >
                <span
                  className={`font-num text-caption ${day.isToday ? 'font-bold text-text' : 'text-text-2'}`}
                >
                  {day.md}
                </span>
                <span className="text-caption text-text-muted">
                  {day.isToday ? '今日' : day.weekday}
                </span>
                {countLabel(day)}
              </div>
            ))}
          </div>

          {members.map((member, i) => {
            const isSelf = member.userId === selfId;
            const bg = i % 2 === 0 ? 'bg-canvas' : 'bg-surface';
            return (
              <div
                key={member.userId}
                data-testid="un-member-row"
                data-user={member.userId}
                // 自分の行は縦スクロールしても見出しの直下に残す（UN-052）
                className={cn(
                  'flex',
                  bg,
                  isSelf && 'sticky top-16 z-20 border-b border-border-strong'
                )}
              >
                <div
                  style={{ width: LABEL_W }}
                  className={cn(
                    'sticky left-0 z-10 flex h-11 shrink-0 items-center gap-2.5 px-4',
                    bg
                  )}
                >
                  <Avatar initials={member.displayName} src={member.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-text">
                        {member.displayName}
                      </span>
                      {isSelf && (
                        <Badge variant="primary" className="px-1.5 py-0">
                          自分
                        </Badge>
                      )}
                    </div>
                    <div
                      data-testid="un-last-updated"
                      className="text-caption truncate text-text-muted"
                    >
                      {memberLabel(member)}
                    </div>
                  </div>
                </div>
                <div style={{ width: start * itemSize }} className="shrink-0" />
                {days.map((day) => cell(member, day, { width: itemSize }))}
              </div>
            );
          })}
        </div>
      )}

      {ready && vertical && (
        <div
          style={{ height: HEAD_H + dates.length * ROW_H }}
          className="flex min-w-full w-max flex-col"
        >
          {/* 見出し: メンバー */}
          <div style={{ height: HEAD_H }} className="sticky top-0 z-30 flex shrink-0 bg-surface-2">
            <div className="sticky left-0 z-10 flex w-28 shrink-0 flex-col justify-end bg-surface-2 px-3 py-2 whitespace-nowrap">
              <span className="eyebrow text-text-2">日付</span>
              <span className="text-caption text-text-2">対応不可の人数</span>
            </div>
            {members.map((member) => (
              <div
                key={member.userId}
                data-testid="un-member-col"
                data-user={member.userId}
                className="flex w-18 shrink-0 flex-col items-center justify-center gap-0.5 border-l border-border px-1"
              >
                <Avatar initials={member.displayName} src={member.avatarUrl} size="sm" />
                <span className="text-caption w-full truncate text-center text-text">
                  {member.userId === selfId ? '自分' : member.displayName}
                </span>
                <span
                  data-testid="un-last-updated"
                  className="w-full truncate text-center text-[0.6875rem] leading-tight text-text-muted"
                >
                  {memberLabel(member).replace('最終更新 ', '')}
                </span>
              </div>
            ))}
          </div>
          <div style={{ height: start * ROW_H }} className="shrink-0" />
          {days.map((day, i) => {
            const bg = (start + i) % 2 === 0 ? 'bg-canvas' : 'bg-surface';
            return (
              <div
                key={day.date}
                data-testid="un-day"
                data-date={day.date}
                className={cn('flex shrink-0', bg)}
              >
                <div
                  className={cn(
                    'sticky left-0 z-10 flex h-11 w-28 shrink-0 items-center justify-between gap-1 px-3 whitespace-nowrap',
                    day.isToday ? 'bg-card' : bg
                  )}
                >
                  <span
                    className={`font-num text-caption ${day.isToday ? 'font-bold text-text' : 'text-text-2'}`}
                  >
                    {day.md}
                    <span className="ml-0.5 text-text-muted">
                      {day.isToday ? '今日' : day.weekday}
                    </span>
                  </span>
                  {countLabel(day)}
                </div>
                {members.map((member) => cell(member, day, {}))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
