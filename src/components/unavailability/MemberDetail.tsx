'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DialogShell } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Switch } from '@/components/ui/Switch';
import { NoteForm } from '@/components/unavailability/NoteForm';
import type { NoteFields } from '@/components/unavailability/NoteForm';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useScrollWindow } from '@/hooks/useScrollWindow';
import { saveUnavailabilityMonth } from '@/lib/repositories/unavailability';
import {
  EMPTY_DRAFT,
  buildSaves,
  countNotesInMonth,
  draftedDays,
  draftedNotes,
  dropSavedMonths,
  isDirty,
  noteKey,
  paintHours,
} from '@/lib/unavailability/draft';
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
import type { DayMasks } from '@/types/unavailability';

interface MemberDetailProps {
  teamId: string;
  member: TeamMember;
  /** 自分の詳細か。true のときだけ入力・メモの操作を出す（UN-010, UN-065） */
  editable: boolean;
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
/** 横スクロールしても残す、日時と対応不可の列の幅。モバイルはメモ 1 列が横スクロールなしで収まる幅にする */
const AXIS_W = { pc: 228, mobile: 176 };
const LANE_W = { pc: 220, mobile: 200 };
/** ドラッグ中、スクロール領域の上下端からこの距離に入ったら自動でスクロールする */
const EDGE_SCROLL_ZONE = 28;

/** 表示範囲の先頭からの時間数 → その 1 時間が対応不可か。範囲外は false */
function isUnavailableAt(dates: string[], days: DayMasks, hourIndex: number): boolean {
  const date = dates[Math.floor(hourIndex / 24)];
  return date !== undefined && ((days[date] ?? 0) & (1 << (hourIndex % 24))) !== 0;
}

/** 1 時間の見せ方。saved: 保存済みの対応不可 / added: 未保存の塗り / removed: 未保存の消し */
type HourKind = 'saved' | 'added' | 'removed' | null;

const BLOCK_CLASS: Record<Exclude<HourKind, null>, string> = {
  // 予定カードと同じ左レール + 淡い面
  saved: 'border-l-[3px] border-danger bg-[color-mix(in_oklab,var(--danger)_45%,transparent)]',
  // 未保存は破線で区別する
  added:
    'border-[1.5px] border-dashed border-danger bg-[color-mix(in_oklab,var(--danger)_22%,transparent)]',
  removed: 'border-[1.5px] border-dashed border-text-muted',
};

/**
 * メンバー詳細。縦の時間軸に対応不可とメモを並べる（UN-060〜UN-068）。
 * 自分の詳細では、対応不可の列をドラッグして塗り・消し、メモを追加・編集・削除できる。
 * 変更は「保存」を押すまでこの部品の中に持ち、Firestore へは書かない（UN-036, UN-070, UN-071）。
 * 行方向を仮想スクロールし、表示行と前後 1 画面ぶんだけ描画する（UN-091）。
 */
export function MemberDetail({
  teamId,
  member,
  editable,
  data,
  dates,
  today,
  initialDate,
  loadedMonths,
  onNeedMonths,
  onClose,
}: MemberDetailProps) {
  const [dayMode, setDayMode] = useState(false);
  const isMobile = useMediaQuery(767);
  const axisW = isMobile ? AXIS_W.mobile : AXIS_W.pc;
  const laneW = isMobile ? LANE_W.mobile : LANE_W.pc;
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

  // ── 未保存の変更（自分の詳細だけ）
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  /** ドラッグ中の範囲（時間数）。paint: 始点が空なら塗る、対応不可なら消す */
  const [drag, setDrag] = useState<{ anchor: number; current: number; paint: boolean } | null>(
    null
  );
  const [saving, setSaving] = useState(false);
  /** 開いているメモのフォーム。key が null なら追加 */
  const [noteForm, setNoteForm] = useState<{ key: string | null; initial: NoteFields } | null>(
    null
  );
  const [confirmingClose, setConfirmingClose] = useState(false);

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

  // 未読込の月は、保存済みの内容が分からないので入力させない
  const isLoaded = useCallback((date: string) => loadedMonths.has(monthOf(date)), [loadedMonths]);

  // 購読データ（保存済み）の上に、未保存の変更とドラッグ中の範囲を重ねる
  const savedDays = data?.days ?? EMPTY_DRAFT.days;
  const days = useMemo(() => {
    const drafted = draftedDays(data, draft);
    return drag
      ? {
          ...drafted,
          ...paintHours(drafted, dates, drag.anchor, drag.current, drag.paint, isLoaded),
        }
      : drafted;
  }, [data, draft, drag, dates, isLoaded]);
  const allNotes = useMemo(() => draftedNotes(data, draft), [data, draft]);
  const dirty = editable && isDirty(data, draft);

  // 未保存のままリロード・タブを閉じようとしたら、ブラウザの確認を出す
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const notes = useMemo(() => {
    const byNote = new Map(allNotes.map((drafted) => [drafted.note, drafted]));
    return layoutNotes(allNotes.map(({ note }) => note)).flatMap(({ note, lane }) => {
      const day = dates.indexOf(note.date);
      const drafted = byNote.get(note);
      return day === -1 || !drafted
        ? []
        : [{ note, lane, key: drafted.key, unsaved: drafted.unsaved, row: day * 24 + note.start }];
    });
  }, [allNotes, dates]);
  const laneCount = Math.max(1, ...notes.map((n) => n.lane + 1));

  const viewport = win?.size ?? 0;
  const { start, end } = virtualRange(win?.offset ?? 0, viewport, rowH, count, viewport);
  const rows = Array.from({ length: Math.max(0, end - start) }, (_, i) => start + i);
  // いちばん上に全体が見えている行。時間単位の表示では、この行に日付を出す
  const topRow = Math.ceil((win?.offset ?? 0) / rowH);

  const hourKind = (hourIndex: number): HourKind => {
    const on = isUnavailableAt(dates, days, hourIndex);
    const wasOn = isUnavailableAt(dates, savedDays, hourIndex);
    if (on) return wasOn ? 'saved' : 'added';
    return wasOn ? 'removed' : null;
  };

  const toggleDayMode = (next: boolean) => {
    // 切り替え前に先頭にあった日時を、切り替え後も先頭にする
    setDayMode(next);
    setTarget({ from: Math.floor((el?.scrollTop ?? 0) / rowH) * hoursPerRow, to: null });
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

  // ── 塗り・消し（UN-070）
  const canPaint = editable && !saving;
  /** 範囲を塗る・消す変更を、未保存の変更に足す */
  const commitPaint = (from: number, to: number, paint: boolean) =>
    setDraft((prev) => ({
      ...prev,
      days: {
        ...prev.days,
        ...paintHours(draftedDays(data, prev), dates, from, to, paint, isLoaded),
      },
    }));
  /** ポインターの位置にある時間（表示範囲の先頭からの時間数） */
  const hourAt = (scroller: HTMLElement, clientY: number) => {
    const y = clientY - scroller.getBoundingClientRect().top + scroller.scrollTop;
    return Math.min(count - 1, Math.max(0, Math.floor(y / HOUR_H)));
  };
  const startDrag = (event: React.PointerEvent, hourIndex: number) => {
    if (!canPaint || !el || event.button !== 0) return;
    event.preventDefault();
    // 以降の移動は、セルの外に出てもスクロール領域で受け取る
    el.setPointerCapture(event.pointerId);
    setDrag({
      anchor: hourIndex,
      current: hourIndex,
      paint: !isUnavailableAt(dates, days, hourIndex),
    });
  };
  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const scroller = event.currentTarget;
    const box = scroller.getBoundingClientRect();
    // ponytail: 端での自動スクロールはポインターが動いたときだけ進む。
    // 止めたまま進めたくなったら requestAnimationFrame のループに替える
    if (event.clientY > box.bottom - EDGE_SCROLL_ZONE) scroller.scrollBy({ top: HOUR_H / 2 });
    if (event.clientY < box.top + EDGE_SCROLL_ZONE) scroller.scrollBy({ top: -HOUR_H / 2 });
    const current = hourAt(scroller, event.clientY);
    if (current !== drag.current) setDrag({ ...drag, current });
  };
  const endDrag = (commit: boolean) => {
    if (!drag) return;
    if (commit) commitPaint(drag.anchor, drag.current, drag.paint);
    setDrag(null);
  };

  // ── メモ（UN-030〜UN-036）
  const openAddNote = (hourIndex: number) => {
    const clamped = Math.min(dates.length * 24 - 1, Math.max(0, hourIndex));
    const hour = clamped % 24;
    setNoteForm({
      key: null,
      initial: { date: dates[Math.floor(clamped / 24)], start: hour, end: hour + 1, text: '' },
    });
  };
  const submitNote = (fields: NoteFields) => {
    if (!noteForm) return;
    const editing = allNotes.find((drafted) => drafted.key === noteForm.key);
    const note = { ...fields, id: editing ? editing.note.id : crypto.randomUUID() };
    const key = noteForm.key ?? noteKey(note);
    setDraft((prev) => ({ ...prev, notes: { ...prev.notes, [key]: note } }));
    setNoteForm(null);
  };
  const deleteNote = () => {
    const key = noteForm?.key;
    if (!key) return;
    setDraft((prev) => ({ ...prev, notes: { ...prev.notes, [key]: null } }));
    setNoteForm(null);
  };

  // ── 保存（UN-071）。月ドキュメントごとに 1 回書く。読み取りはしない
  const save = async () => {
    const saves = buildSaves(data, draft);
    setSaving(true);
    const results = await Promise.allSettled(
      saves.map(({ month, changes }) =>
        saveUnavailabilityMonth(teamId, member.userId, month, changes)
      )
    );
    const savedMonths = new Set(
      saves.filter((_, i) => results[i].status === 'fulfilled').map(({ month }) => month)
    );
    // 書けた月の変更だけ取り除く。失敗した月の変更は画面に残す
    setDraft((prev) => dropSavedMonths(prev, savedMonths));
    setSaving(false);
    if (savedMonths.size === saves.length) {
      toast.success('対応不可時間を保存しました');
    } else {
      toast.error('保存に失敗しました。入力した内容は残っています。もう一度お試しください。');
    }
  };

  /** 未保存の変更があれば、黙って破棄せず確認する */
  const requestClose = () => {
    if (saving) return;
    if (dirty) setConfirmingClose(true);
    else onClose();
  };

  const lastUpdated = lastUpdatedLabel(data?.updatedAt, today);
  const inputRange = {
    min: `${dates[0]}T00:00`,
    max: `${dates[dates.length - 1]}T23:00`,
    step: 3600,
  };

  return (
    <DialogShell
      onClose={requestClose}
      label={`${member.displayName}（${lastUpdated}）`}
      data-testid="un-detail"
      // モバイルは下寄せの全幅シート、PC は固定幅のカード
      className="flex h-[92dvh] w-full flex-col overflow-hidden rounded-t-lg border border-border bg-card md:h-[min(780px,calc(100vh-64px))] md:w-[min(760px,calc(100vw-64px))] md:rounded-lg"
    >
      <div className="flex shrink-0 items-center gap-3 border-b border-border py-2 pr-2 pl-4 md:pl-6">
        <Avatar initials={member.displayName} src={member.avatarUrl} />
        {/* タイトルはメンバー名と最終更新。同じ大きさ・同じ色で横に並べる */}
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-4">
          <h2 data-testid="un-detail-name" className="text-h3 truncate text-text">
            {member.displayName}
          </h2>
          <span data-testid="un-detail-updated" className="text-h3 text-text">
            {lastUpdated}
          </span>
        </div>
        <button
          type="button"
          onClick={requestClose}
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
        {editable && !dayMode && (
          <p data-testid="un-edit-hint" className="text-caption w-full text-text-muted">
            時刻の右の列をドラッグすると対応不可を塗れます（対応不可の上から始めると消します）。その右の欄を押すとメモを追加できます。変更は「保存」で確定します。
          </p>
        )}
      </div>

      <div
        ref={setEl}
        data-testid="un-detail-scroll"
        className="min-h-0 flex-1 overflow-auto overscroll-contain"
        onPointerMove={moveDrag}
        onPointerUp={() => endDrag(true)}
        onPointerCancel={() => endDrag(false)}
      >
        {ready && (
          <div
            className="relative min-w-full"
            style={{
              height: count * rowH,
              width: dayMode ? undefined : axisW + laneCount * laneW,
            }}
          >
            <div style={{ height: start * rowH }} />

            {dayMode &&
              rows.map((row) => {
                const date = dates[row];
                const { md, weekday } = dayLabel(date);
                const hours = countHours(days[date] ?? 0);
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
                    {!isLoaded(date) ? (
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
                const kind = hourKind(row);
                const unavailable = kind === 'saved' || kind === 'added';
                const { md, weekday } = dayLabel(date);
                const time = `${String(hour).padStart(2, '0')}:00`;
                const block = kind && (
                  // 文字は入れず、色とつながりで示す。前後の 1 時間（日をまたぐ場合を含む）が
                  // 同じ状態なら、区切らずにつなげる
                  <div
                    data-testid="un-block"
                    data-kind={kind}
                    className={cn(
                      'pointer-events-none absolute inset-x-1.5',
                      BLOCK_CLASS[kind],
                      hourKind(row - 1) === kind ? 'top-0 border-t-0' : 'top-1 rounded-t-sm',
                      // つながる行では、行の罫線（下 1px）まで覆う
                      hourKind(row + 1) === kind ? '-bottom-px border-b-0' : 'bottom-1 rounded-b-sm'
                    )}
                  >
                    <span className="sr-only">
                      {kind === 'removed' ? '対応不可を消す（未保存）' : '対応不可'}
                      {kind === 'added' && '（未保存）'}
                    </span>
                  </div>
                );
                const loading = !isLoaded(date) && hour === 0 && (
                  <span className="absolute inset-0 flex items-center px-1.5 text-[0.6875rem] text-text-muted">
                    読み込み中…
                  </span>
                );
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
                    {/* 日時と対応不可の列は、メモ欄を横スクロールしても残す（UN-064） */}
                    <div
                      style={{ width: axisW }}
                      className="sticky left-0 z-20 flex shrink-0 bg-card"
                    >
                      {/* 日付と時刻は幅を固定し、時刻は 2 桁・等幅数字で縦に揃える */}
                      <div className="font-num text-caption flex shrink-0 items-center pr-2 pl-3 whitespace-nowrap md:pl-6">
                        <span data-testid="un-hour-date" className="w-18 font-bold text-text">
                          {(hour === 0 || row === topRow) && `${md}（${weekday}）`}
                        </span>
                        <span className="w-10 text-right text-text-2">{time}</span>
                      </div>
                      {editable ? (
                        // タッチでは、この列の上だけドラッグを塗りに使う（touch-none）。
                        // 縦スクロールは日時の列かメモ欄で行う
                        <button
                          type="button"
                          data-testid="un-paint"
                          aria-pressed={unavailable}
                          aria-label={`${md}（${weekday}）${time} 対応不可`}
                          disabled={!canPaint || !isLoaded(date)}
                          onPointerDown={(event) => startDrag(event, row)}
                          onKeyDown={(event) => {
                            if (event.key !== 'Enter' && event.key !== ' ') return;
                            event.preventDefault();
                            commitPaint(row, row, !unavailable);
                          }}
                          className="relative min-w-0 flex-1 cursor-pointer touch-none outline-none select-none hover:bg-surface focus-visible:bg-surface-2 disabled:cursor-default"
                        >
                          {block}
                          {loading}
                        </button>
                      ) : (
                        <div className="relative min-w-0 flex-1">
                          {block}
                          {loading}
                        </div>
                      )}
                    </div>
                    {editable && (
                      <button
                        type="button"
                        data-testid="un-note-slot"
                        aria-label={`${md}（${weekday}）${time} にメモを追加`}
                        onClick={() => openAddNote(row)}
                        className="min-w-0 flex-1 cursor-pointer outline-none hover:bg-surface focus-visible:bg-surface-2"
                      />
                    )}
                  </div>
                );
              })}

            {/* メモ。同じ時間帯のメモは横に並べる */}
            {!dayMode &&
              notes
                .filter(({ note, row }) => row < end && row + (note.end - note.start) > start)
                .map(({ note, lane, key, unsaved, row }) => {
                  const expanded = expandedNote === key;
                  const height = (note.end - note.start) * HOUR_H - 5;
                  return (
                    <button
                      key={key}
                      type="button"
                      data-testid="un-note"
                      data-unsaved={unsaved}
                      // 自分のメモは押すと編集、他人のメモは押すと全文を表示する
                      aria-expanded={editable ? undefined : expanded}
                      title={note.text}
                      onClick={() =>
                        editable
                          ? setNoteForm({ key, initial: note })
                          : setExpandedNote(expanded ? null : key)
                      }
                      style={{
                        top: row * HOUR_H + 2,
                        left: axisW + lane * laneW + 8,
                        width: laneW - 16,
                        ...(expanded ? { minHeight: height } : { height }),
                      }}
                      className={`text-caption absolute cursor-pointer overflow-hidden rounded-md rounded-tl-xs border border-blue-border bg-blue-tint px-2.5 py-1 text-left leading-snug text-blue-text ${
                        expanded ? 'z-[15]' : 'z-10'
                      } ${unsaved ? 'border-dashed' : ''}`}
                    >
                      <span className="font-num mr-1.5 font-bold">
                        {note.start}:00〜{note.end}:00
                      </span>
                      {note.text}
                      {unsaved && <span className="sr-only">（未保存）</span>}
                    </button>
                  );
                })}
          </div>
        )}
      </div>

      {editable && (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-2 border-t border-border px-4 py-3 md:px-6">
          <Button
            variant="ghost"
            onClick={() => openAddNote(topRow * hoursPerRow)}
            disabled={saving}
            className="mr-auto px-4"
          >
            <Icon name="add" size={16} />
            メモを追加
          </Button>
          {dirty && (
            <span data-testid="un-unsaved" className="text-caption text-warning">
              未保存の変更があります
            </span>
          )}
          <Button onClick={save} disabled={!dirty} loading={saving}>
            保存
          </Button>
        </div>
      )}

      {noteForm && (
        <NoteForm
          editing={noteForm.key !== null}
          initial={noteForm.initial}
          minDate={dates[0]}
          maxDate={dates[dates.length - 1]}
          isLoaded={isLoaded}
          countOthers={(month) =>
            countNotesInMonth(
              allNotes.filter((drafted) => drafted.key !== noteForm.key),
              month
            )
          }
          onSubmit={submitNote}
          onDelete={deleteNote}
          onClose={() => setNoteForm(null)}
        />
      )}

      <Modal
        open={confirmingClose}
        onClose={() => setConfirmingClose(false)}
        title="保存していない変更があります"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmingClose(false)}>
              編集に戻る
            </Button>
            <Button variant="danger" onClick={onClose}>
              破棄して閉じる
            </Button>
          </>
        }
      >
        閉じると、入力した対応不可とメモの変更は保存されずに破棄されます。
      </Modal>
    </DialogShell>
  );
}
