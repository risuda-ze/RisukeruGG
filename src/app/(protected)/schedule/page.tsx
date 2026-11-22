'use client';

import { useEffect, useRef, useState } from 'react';
import { addMonths, subMonths, addWeeks, subWeeks, format } from 'date-fns';
import { useAuthStore } from '@/stores/auth';
import { useScheduleStore } from '@/stores/schedule';
import { useCategoryStore } from '@/stores/categories';
import { TopBar } from '@/components/layout/TopBar';
import { MonthCalendar } from '@/components/calendar/MonthCalendar';
import { WeekCalendar } from '@/components/calendar/WeekCalendar';
import { ScheduleModal } from '@/components/calendar/ScheduleModal';
import { GoogleCalendarExportNotice } from '@/components/calendar/GoogleCalendarExportNotice';
import { Spinner } from '@/components/ui/Spinner';
import { HintBar } from '@/components/ui/HintBar';
import { useHintDismiss } from '@/hooks/useHintDismiss';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useGoogleCalendarExport } from '@/hooks/useGoogleCalendarExport';
import { Icon } from '@/components/ui/Icon';
import type { ScheduleEntry } from '@/types/entities';
import { buttonVariants } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';
import { canManageCreated } from '@/lib/utils/teamRoles';

type CalendarView = 'month' | 'week';

/* 同じ見た目のボタンが複数あるものだけ定数にまとめる */
const DATE_NAV_ARROW =
  'flex size-8.5 cursor-pointer items-center justify-center rounded-sm text-text-2 transition-colors duration-(--duration-fast) ease-out hover:bg-surface-2 hover:text-text';
const MOBILE_NAV_ARROW =
  'flex h-11 w-9 flex-none cursor-pointer items-center justify-center text-text-2 transition-colors duration-(--duration-fast) ease-out active:text-text';
const MORE_MENU_ITEM =
  'flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-sm px-2.5 text-left text-[0.86rem] text-text-2 transition-colors duration-(--duration-fast) ease-out hover:bg-surface hover:text-text active:bg-surface active:text-text';

const EXPORT_LABEL = 'Google カレンダーに書き出す';

/** 週/月の表示切替。compact はモバイルヘッダー用の詰めた寸法 */
function ViewToggle({
  view,
  onChange,
  compact = false,
}: {
  view: CalendarView;
  onChange: (view: CalendarView) => void;
  compact?: boolean;
}) {
  return (
    <div className={cn('inline-flex rounded-md border border-border bg-surface', compact ? 'p-0.5' : 'gap-0.5 p-0.75')}>
      {(['week', 'month'] as const).map((v) => (
        <button
          key={v}
          className={cn(
            'cursor-pointer rounded-sm font-semibold transition-colors duration-(--duration-fast) ease-out',
            compact ? 'px-3.25 py-1.5 text-[0.76rem]' : 'px-4.5 py-1.75 text-[0.84rem]',
            view === v ? 'bg-primary text-text-on-primary' : 'text-text-2 hover:bg-surface-2 hover:text-text'
          )}
          onClick={() => onChange(v)}
        >
          {v === 'week' ? '週' : '月'}
        </button>
      ))}
    </div>
  );
}

export default function SchedulePage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const currentTeamId = useAuthStore((s) => s.currentTeamId);
  const members = useAuthStore((s) => s.members);
  const schedules = useScheduleStore((s) => s.schedules);
  const loading = useScheduleStore((s) => s.loading);
  const subscribe = useScheduleStore((s) => s.subscribe);
  const categories = useCategoryStore((s) => s.categories);
  const subscribeCategories = useCategoryStore((s) => s.subscribe);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  /* スマホ縦持ちでは初期表示を週（アジェンダ）にして、密な月グリッドを避ける */
  const isMobile = useMediaQuery(767);
  const didInitMobileView = useRef(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleEntry | null>(null);
  /* セルクリック時の初期日付（ScheduleModal に渡す） */
  const [clickedDate, setClickedDate] = useState<Date | null>(null);
  /* ヒントバーの表示/非表示（localStorage 永続化） */
  const { visible: hintVisible, dismiss: dismissHint, show: showHint } = useHintDismiss('riskeru_hint_schedule');
  /* Google カレンダーへの書き出し（SC-008 系） */
  const gcalExport = useGoogleCalendarExport();
  /* モバイルヘッダーの「⋯」メニュー開閉 */
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);


  const myMember = members.find((m) => m.userId === currentUser?.uid);
  /* スケジュールの作成は所属者全員。編集・削除はメンバーか作成者（スケジュールごとに判定） */
  const canCreate = !!myMember;

  /* マウント時に一度だけ、スマホなら初期ビューを週表示に切り替える。
     ビュー選択（週/月）はこの画面の React state のみで管理しており、
     localStorage 等への永続化は行っていない。そのためこの初期化が効くのは
     マウント時の1回だけで、以降ユーザーが月表示へ切り替えても強制的に週へ
     戻すことはない（ページを開き直すと再びモバイル既定＝週表示から始まる）。 */
  useEffect(() => {
    if (didInitMobileView.current) return;
    didInitMobileView.current = true;
    if (isMobile) setView('week'); // eslint-disable-line react-hooks/set-state-in-effect
  }, [isMobile]);

  useEffect(() => {
    if (!currentTeamId) return;
    const u1 = subscribe(currentTeamId);
    const u2 = subscribeCategories(currentTeamId);
    return () => {
      u1();
      u2();
    };
  }, [currentTeamId, subscribe, subscribeCategories]);

  // モバイルヘッダー「⋯」メニュー: 外側タップで閉じる
  useEffect(() => {
    if (!moreOpen) return;
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [moreOpen]);

  /* Firestore購読が更新したらselectedScheduleを同期 */
  useEffect(() => {
    if (!selectedSchedule) return;
    const updated = schedules.find((s) => s.id === selectedSchedule.id);
    if (updated && updated.updatedAt.getTime() !== selectedSchedule.updatedAt.getTime()) {
      setSelectedSchedule(updated); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [schedules, selectedSchedule?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const lastExportedLabel = gcalExport.lastExportedAt
    ? `最終書き出し ${format(gcalExport.lastExportedAt, 'M/d HH:mm')}`
    : null;
  const exportProgressLabel = gcalExport.progress
    ? `書き出し中… ${gcalExport.progress.done} / ${gcalExport.progress.total}`
    : '書き出し中…';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;


  /* 前後ナビゲーション */
  function goBack() {
    setCurrentDate(view === 'month' ? subMonths(currentDate, 1) : subWeeks(currentDate, 1));
  }
  function goForward() {
    setCurrentDate(view === 'month' ? addMonths(currentDate, 1) : addWeeks(currentDate, 1));
  }


  return (
    <div className="flex flex-col flex-1 overflow-hidden relative">
      {/* トップバー */}
      <TopBar title="スケジュール" subtitle="予定の確認・追加・編集ができます" />

      {/* カレンダーヘッダー */}
      <div className="shrink-0 border-b border-border bg-surface px-4 pt-1.5 md:px-7">
        {/* ── PC ヘッダー（md 以上・従来レイアウトを維持） ── */}
        {!isMobile && (
        <div className="flex flex-none flex-wrap items-center gap-4 pt-1 pb-4">
          {/* 週/月セグメントトグル */}
          <ViewToggle view={view} onChange={setView} />

          {/* YYYY年MM月 */}
          <span className="text-h2 whitespace-nowrap">{year}年 <span className="font-num text-brand-2">{month}月</span></span>

          {/* 右グループ */}
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2.5">
            {/* 予定追加 */}
            {canCreate && (
              <button
                onClick={() => { setClickedDate(null); setShowCreate(true); }}
                className={buttonVariants({ variant: 'primary', size: 'sm' })}
              >
                <Icon name="add" size={16} />
                <span className="hidden md:inline">予定を追加</span>
              </button>
            )}

            {/* Google カレンダーへの書き出し */}
            {lastExportedLabel && (
              <span className="font-num text-caption whitespace-nowrap text-text-2">{lastExportedLabel}</span>
            )}
            <button
              onClick={gcalExport.run}
              disabled={!gcalExport.ready || gcalExport.running}
              className={buttonVariants({ variant: 'ghost', size: 'sm' })}
            >
              {gcalExport.running ? (
                <>
                  <span className="inline-block size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  <span className="font-num">{exportProgressLabel}</span>
                </>
              ) : (
                <>
                  <Icon name="event_available" size={16} />
                  <span>{EXPORT_LABEL}</span>
                </>
              )}
            </button>

            {/* 日付ナビ */}
            <div className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-surface p-0.75">
              <button className={DATE_NAV_ARROW} onClick={goBack} aria-label={view === 'month' ? '前月' : '前の週'}>
                <Icon name="chevron_left" size={18} />
              </button>
              <button
                className="h-8.5 cursor-pointer rounded-sm px-3.5 text-[0.82rem] font-semibold text-text transition-colors duration-(--duration-fast) ease-out hover:bg-surface-2"
                onClick={() => setCurrentDate(new Date())}
              >
                今日
              </button>
              <button className={DATE_NAV_ARROW} onClick={goForward} aria-label={view === 'month' ? '翌月' : '次の週'}>
                <Icon name="chevron_right" size={18} />
              </button>
            </div>

            {/* ヘルプトグル */}
            <button
              onClick={() => hintVisible ? dismissHint() : showHint()}
              className={cn(
                'flex size-9.5 flex-none cursor-pointer items-center justify-center rounded-md border border-border transition-colors duration-(--duration-fast) ease-out',
                hintVisible ? 'bg-surface-2 text-brand-2' : 'bg-surface text-text-2 hover:border-border-strong hover:text-text'
              )}
              aria-label={hintVisible ? 'ヒントを閉じる' : 'ヒントを表示'}
            >
              <Icon name="help_outline" size={17} />
            </button>
          </div>
        </div>
        )}

        {/* ── モバイルヘッダー（md 未満・44px 1 行に統合） ── */}
        {isMobile && (
        <div className="flex h-11 items-center gap-2 pb-1.5">
          {/* 週/月セグメント */}
          <ViewToggle view={view} onChange={setView} compact />

          {/* 月ナビ（‹ N月 › ・年を小さく併記） */}
          <div className="inline-flex items-center gap-0.5">
            <button className={MOBILE_NAV_ARROW} onClick={goBack} aria-label={view === 'month' ? '前月' : '前の週'}>
              <Icon name="chevron_left" size={20} />
            </button>
            <span className="flex min-w-11.5 flex-col items-center leading-none">
              <span className="font-num text-[9px] font-semibold tracking-[0.04em] text-text-muted">{year}</span>
              <span className="font-num mt-px text-[1.15rem] font-bold whitespace-nowrap text-brand-2">{month}月</span>
            </span>
            <button className={MOBILE_NAV_ARROW} onClick={goForward} aria-label={view === 'month' ? '翌月' : '次の週'}>
              <Icon name="chevron_right" size={20} />
            </button>
          </div>

          {/* 今日 */}
          <button
            className="h-8.5 flex-none cursor-pointer rounded-md border border-border bg-surface px-3 text-[0.8rem] font-semibold text-text transition-colors duration-(--duration-fast) ease-out active:border-border-strong"
            onClick={() => setCurrentDate(new Date())}
          >
            今日
          </button>

          <span className="flex-auto" />

          {/* ⋯ 低頻度操作メニュー */}
          <div className="relative" ref={moreRef}>
            <button
              className={cn(
                'flex size-11 flex-none cursor-pointer items-center justify-center rounded-md transition-colors duration-(--duration-fast) ease-out',
                moreOpen ? 'bg-surface-2 text-text' : 'text-text-2'
              )}
              onClick={() => setMoreOpen((v) => !v)}
              aria-label="その他の操作"
              aria-expanded={moreOpen}
            >
              <Icon name="more_horiz" size={22} />
            </button>
            {moreOpen && (
              <div className="absolute top-[calc(100%+6px)] right-0 z-[130] w-61 rounded-md border border-border bg-card p-1.5 animate-pop-modal">
                {/* ヒント表示切替 */}
                <button
                  className={MORE_MENU_ITEM}
                  onClick={() => { if (hintVisible) dismissHint(); else showHint(); setMoreOpen(false); }}
                >
                  <Icon name="help_outline" size={18} />
                  <span>{hintVisible ? 'ヒントを隠す' : 'ヒントを表示'}</span>
                </button>
                {/* Google カレンダーへの書き出し */}
                <button
                  className={cn(MORE_MENU_ITEM, 'disabled:pointer-events-none disabled:opacity-40')}
                  disabled={!gcalExport.ready || gcalExport.running}
                  onClick={() => { setMoreOpen(false); void gcalExport.run(); }}
                >
                  <Icon name="event_available" size={18} />
                  <span className="flex flex-col py-1">
                    <span>{EXPORT_LABEL}</span>
                    {lastExportedLabel && (
                      <span className="font-num text-[0.6875rem] text-text-2">{lastExportedLabel}</span>
                    )}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Google カレンダー書き出しの進行（モバイルはヘッダーにボタンが無いためここに出す） */}
      {isMobile && gcalExport.running && (
        <div
          role="status"
          className="flex shrink-0 items-center gap-2 border-b border-border bg-info-tint px-4 py-2.5 text-[0.8125rem] text-text"
        >
          <span className="inline-block size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span className="font-num">Google カレンダーに{exportProgressLabel}</span>
        </div>
      )}

      {/* Google カレンダー書き出しの結果 */}
      {gcalExport.notice && (
        <GoogleCalendarExportNotice
          notice={gcalExport.notice}
          onDismiss={gcalExport.dismissNotice}
          onRetry={gcalExport.run}
        />
      )}

      {/* ヒントバー（初回表示・?ボタンで再表示）: visible は useHintDismiss で一元管理 */}
      {hintVisible && (
        <HintBar onDismiss={dismissHint}>
          カレンダーの日付をクリックすると週表示に切り替わります。「予定を追加」ボタンまたはセルをクリックして予定を追加できます。
        </HintBar>
      )}

      {/* カレンダー本体 */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-4">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : view === 'month' ? (
          <MonthCalendar
            year={year}
            month={month}
            schedules={schedules}
            categories={categories}
            onEventClick={setSelectedSchedule}
            onDateClick={canCreate ? (d) => { setClickedDate(d ?? null); setShowCreate(true); } : undefined}
            onDateLabelClick={(date) => {
              setCurrentDate(date);
              setView('week');
            }}
          />
        ) : (
          <WeekCalendar
            currentDate={currentDate}
            schedules={schedules}
            categories={categories}
            onEventClick={setSelectedSchedule}
            onDateClick={canCreate ? (d) => { setClickedDate(d ?? null); setShowCreate(true); } : undefined}
          />
        )}
      </div>

      {/* スケジュール詳細オーバーレイ */}
      {selectedSchedule && currentTeamId && (
        <ScheduleModal
          schedule={selectedSchedule}
          teamId={currentTeamId}
          canEdit={canManageCreated(myMember?.role, selectedSchedule.createdBy, currentUser?.uid)}
          categories={categories}
          onClose={() => setSelectedSchedule(null)}
          onDeleted={() => setSelectedSchedule(null)}
        />
      )}

      {/* スケジュール追加モーダル（新規作成） */}
      {showCreate && currentTeamId && (
        <ScheduleModal
          schedule={null}
          initialDate={clickedDate ?? undefined}
          teamId={currentTeamId}
          canEdit
          categories={categories}
          onClose={() => { setShowCreate(false); setClickedDate(null); }}
          onDeleted={() => {}}
        />
      )}
    </div>
  );
}
