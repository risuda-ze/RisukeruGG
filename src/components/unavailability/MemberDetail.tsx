'use client';

import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { DialogShell } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { useScrollWindow } from '@/hooks/useScrollWindow';
import { countHours } from '@/lib/unavailability/mask';
import { monthOf } from '@/lib/unavailability/range';
import {
  MONTH_LOAD_MARGIN_DAYS,
  dayLabel,
  jstHour,
  lastUpdatedLabel,
  layoutNotes,
  monthsAround,
  scrollOffsetFor,
  virtualRange,
} from '@/lib/unavailability/view';
import type { MemberUnavailability } from '@/lib/unavailability/view';
import { cn } from '@/lib/utils/cn';
import type { TeamMember } from '@/types/entities';

interface MemberDetailProps {
  member: TeamMember;
  /** 読み込み済みの月をまとめた内容。月ドキュメントが 1 つも無ければ undefined */
  data: MemberUnavailability | undefined;
  /** 表示範囲（前月 1 日〜翌月末日）の日付 */
  dates: string[];
  today: string;
  /** 一覧でクリックした日 */
  initialDate: string;
  loadedMonths: ReadonlySet<string>;
  onNeedMonths: (months: string[]) => void;
  onClose: () => void;
}

const HOUR_H = 40;
const DAY_H = 44;
/** 横スクロールしても残す、時刻と対応不可の列の幅 */
const AXIS_W = 200;
const LANE_W = 220;

/**
 * メンバー詳細（閲覧）。縦の時間軸に対応不可とメモを並べる（UN-060〜UN-065）。
 * 行方向を仮想スクロールし、表示行と前後 1 画面ぶんだけ描画する（UN-091）。
 */
export function MemberDetail({
  member,
  data,
  dates,
  today,
  initialDate,
  loadedMonths,
  onNeedMonths,
  onClose,
}: MemberDetailProps) {
  const [dayMode, setDayMode] = useState(false);
  const { el, setEl, win } = useScrollWindow(false);
  const ready = win !== null;
  // 表示位置。表示範囲の先頭からの時間数で持つ（to は排他的境界）
  const [target, setTarget] = useState<{ from: number | null; to: number | null }>(() => ({
    // 先頭行は、クリックした日が当日なら現在時刻、それ以外はその日の 0:00（UN-061）
    from: dates.indexOf(initialDate) * 24 + (initialDate === today ? jstHour(new Date()) : 0),
    to: null,
  }));
  const [range, setRange] = useState({ from: '', to: '' });
  const [expandedNote, setExpandedNote] = useState<string | null>(null);

  const rowH = dayMode ? DAY_H : HOUR_H;
  const hoursPerRow = dayMode ? 24 : 1;
  const count = (dates.length * 24) / hoursPerRow;

  // 表示位置の移動（初期表示・日時の指定・表示の切り替え）
  useLayoutEffect(() => {
    if (!el || !ready) return;
    const offset = scrollOffsetFor(
      target.from === null ? null : Math.floor(target.from / hoursPerRow),
      target.to === null ? null : Math.ceil(target.to / hoursPerRow) - 1,
      rowH,
      el.clientHeight
    );
    if (offset !== null) el.scrollTo({ top: offset });
  }, [el, ready, target, hoursPerRow, rowH]);

  // 表示中の範囲が前月・翌月の端に近づいたら、その月の購読を足す（UN-090）
  useEffect(() => {
    if (!el || !win) return;
    // 表示位置の移動直後は win.offset が古いので、実際のスクロール量を読む
    const visible = virtualRange(el.scrollTop, win.size, rowH, count, 0);
    onNeedMonths(
      monthsAround(
        dates,
        Math.floor((visible.start * hoursPerRow) / 24),
        Math.ceil((visible.end * hoursPerRow) / 24),
        MONTH_LOAD_MARGIN_DAYS
      )
    );
  }, [el, win, rowH, count, hoursPerRow, dates, onNeedMonths]);

  const notes = useMemo(
    () =>
      layoutNotes(data?.notes ?? []).flatMap(({ note, lane }) => {
        const day = dates.indexOf(note.date);
        return day === -1
          ? []
          : [{ note, lane, key: `${note.date}:${note.id}`, row: day * 24 + note.start }];
      }),
    [data, dates]
  );
  const laneCount = Math.max(1, ...notes.map((n) => n.lane + 1));

  const viewport = win?.size ?? 0;
  const { start, end } = virtualRange(win?.offset ?? 0, viewport, rowH, count, viewport);
  const rows = Array.from({ length: Math.max(0, end - start) }, (_, i) => start + i);
  const topDate =
    dates[Math.min(dates.length - 1, Math.floor(((win?.offset ?? 0) / rowH) * (hoursPerRow / 24)))];
  const top = dayLabel(topDate);

  const toggleDayMode = (next: boolean) => {
    // 切り替え前に先頭にあった日時を、切り替え後も先頭にする
    const topRow = Math.floor((el?.scrollTop ?? 0) / rowH);
    setDayMode(next);
    setTarget({ from: topRow * hoursPerRow, to: null });
  };

  /** `yyyy-mm-ddTHH:mm` → 表示範囲の先頭からの時間数。未指定・範囲外は null */
  const toHours = (value: string) => {
    const day = dates.indexOf(value.slice(0, 10));
    return value === '' || day === -1 ? null : day * 24 + Number(value.slice(11, 13));
  };
  const moveTo = (next: { from: string; to: string }) => {
    setRange(next);
    const from = toHours(next.from);
    const to = toHours(next.to);
    if (from !== null || to !== null) setTarget({ from, to });
  };

  const title = `${member.displayName} の対応不可`;
  const inputRange = {
    min: `${dates[0]}T00:00`,
    max: `${dates[dates.length - 1]}T23:00`,
    step: 3600,
  };

  return (
    <DialogShell
      onClose={onClose}
      label={title}
      data-testid="un-detail"
      // モバイルは下寄せの全幅シート、PC は固定幅のカード
      className="flex h-[92dvh] w-full flex-col overflow-hidden rounded-t-lg border border-border bg-card md:h-[min(780px,calc(100vh-64px))] md:w-[min(760px,calc(100vw-64px))] md:rounded-lg"
    >
      <div className="flex shrink-0 items-center gap-3 border-b border-border py-2 pr-2 pl-4 md:pl-6">
        <Avatar initials={member.displayName} src={member.avatarUrl} />
        <div className="min-w-0 flex-1">
          <h2 className="text-h3 truncate">{title}</h2>
          <p className="text-caption text-text-muted">{lastUpdatedLabel(data?.updatedAt, today)}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-sm text-text-2 transition-colors duration-(--duration-fast) hover:bg-surface-2 hover:text-text"
        >
          <Icon name="close" size={18} />
        </button>
      </div>

      <div className="flex shrink-0 flex-wrap items-end gap-x-4 gap-y-2 border-b border-border px-4 py-3 md:px-6">
        <Input
          id="un-detail-from"
          type="datetime-local"
          label="開始日時"
          value={range.from}
          onChange={(e) => moveTo({ ...range, from: e.target.value })}
          {...inputRange}
        />
        <Input
          id="un-detail-to"
          type="datetime-local"
          label="終了日時"
          value={range.to}
          onChange={(e) => moveTo({ ...range, to: e.target.value })}
          {...inputRange}
        />
        <Switch
          label="日単位で表示"
          checked={dayMode}
          onCheckedChange={toggleDayMode}
          className="h-11"
        />
        <span
          data-testid="un-detail-top-date"
          className="font-num text-caption ml-auto self-center text-text-2"
        >
          {top.md}（{top.weekday}）から表示中
        </span>
      </div>

      <div
        ref={setEl}
        data-testid="un-detail-scroll"
        className="min-h-0 flex-1 overflow-auto overscroll-contain"
      >
        {ready && (
          <div
            className="relative min-w-full"
            style={{
              height: count * rowH,
              width: dayMode ? undefined : AXIS_W + laneCount * LANE_W,
            }}
          >
            <div style={{ height: start * rowH }} />

            {dayMode &&
              rows.map((row) => {
                const date = dates[row];
                const { md, weekday } = dayLabel(date);
                const hours = countHours(data?.days[date] ?? 0);
                return (
                  <div
                    key={date}
                    data-testid="un-day-row"
                    data-date={date}
                    data-hours={hours}
                    className={cn(
                      'flex h-11 items-center gap-3 border-b border-border px-4 md:px-6',
                      date === today && 'bg-surface'
                    )}
                  >
                    <span className="font-num w-32 shrink-0 text-sm text-text">
                      {md}（{weekday}）
                      {date === today && (
                        <span className="text-caption ml-1.5 text-text-2">今日</span>
                      )}
                    </span>
                    {!loadedMonths.has(monthOf(date)) ? (
                      <span className="text-caption text-text-muted">読み込み中…</span>
                    ) : hours > 0 ? (
                      <Badge variant="danger">対応不可 {hours}時間</Badge>
                    ) : (
                      <span className="text-caption text-text-muted">対応不可なし</span>
                    )}
                  </div>
                );
              })}

            {!dayMode &&
              rows.map((row) => {
                const date = dates[Math.floor(row / 24)];
                const hour = row % 24;
                const unavailable = ((data?.days[date] ?? 0) & (1 << hour)) !== 0;
                const { md, weekday } = dayLabel(date);
                return (
                  <div
                    key={row}
                    data-testid="un-hour"
                    data-date={date}
                    data-hour={hour}
                    data-unavailable={unavailable}
                    className={cn(
                      'flex h-10 border-b',
                      hour === 23 ? 'border-border-strong' : 'border-border'
                    )}
                  >
                    {/* 時刻と対応不可の列は、メモ欄を横スクロールしても残す（UN-064） */}
                    <div
                      style={{ width: AXIS_W }}
                      className="sticky left-0 z-20 flex shrink-0 bg-card"
                    >
                      <div className="font-num text-caption flex flex-1 items-center justify-end gap-2 pr-3 text-text-2">
                        {hour === 0 && (
                          <span className="font-bold text-text">
                            {md}（{weekday}）
                          </span>
                        )}
                        <span>{hour}:00</span>
                      </div>
                      <div
                        // 文字サイズと文字色を併用するため cn を通さない（cn がサイズを落とす）
                        className={`text-caption flex w-22 shrink-0 items-center border-l-[3px] px-2 font-semibold ${
                          unavailable
                            ? 'border-danger bg-[color-mix(in_oklab,var(--danger)_45%,transparent)] text-text'
                            : 'border-border text-text-muted'
                        }`}
                      >
                        {loadedMonths.has(monthOf(date))
                          ? unavailable && '対応不可'
                          : hour === 0 && '読み込み中…'}
                      </div>
                    </div>
                  </div>
                );
              })}

            {/* メモ。同じ時間帯のメモは横に並べる */}
            {!dayMode &&
              notes
                .filter(({ note, row }) => row < end && row + (note.end - note.start) > start)
                .map(({ note, lane, key, row }) => {
                  const expanded = expandedNote === key;
                  const height = (note.end - note.start) * HOUR_H - 5;
                  return (
                    <button
                      key={key}
                      type="button"
                      data-testid="un-note"
                      aria-expanded={expanded}
                      title={note.text}
                      onClick={() => setExpandedNote(expanded ? null : key)}
                      style={{
                        top: row * HOUR_H + 2,
                        left: AXIS_W + lane * LANE_W + 6,
                        width: LANE_W - 12,
                        ...(expanded ? { minHeight: height } : { height }),
                      }}
                      className={`text-caption absolute cursor-pointer overflow-hidden rounded-md rounded-tl-xs border border-blue-border bg-blue-tint px-2.5 py-1 text-left leading-snug text-blue-text ${
                        expanded ? 'z-[15]' : 'z-10'
                      }`}
                    >
                      <span className="font-num mr-1.5 font-bold">
                        {note.start}:00〜{note.end}:00
                      </span>
                      {note.text}
                    </button>
                  );
                })}
          </div>
        )}
      </div>
    </DialogShell>
  );
}
