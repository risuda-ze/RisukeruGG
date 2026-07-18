'use client';

import { useEffect, useRef, useState } from 'react';
import {
  addMonths, subMonths, addWeeks, subWeeks, format, startOfWeek,
  startOfMonth, endOfMonth, endOfWeek, isSameDay,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAuthStore } from '@/stores/auth';
import { useScheduleStore } from '@/stores/schedule';
import { useCategoryStore } from '@/stores/categories';
import { subscribeMemberCalendarEvents } from '@/lib/repositories/memberCalendars';
import { fetchGCalEvents } from '@/lib/googleCalendar';
import type { GCalFetchError } from '@/lib/googleCalendar';
import { TopBar } from '@/components/layout/TopBar';
import { MonthCalendar } from '@/components/calendar/MonthCalendar';
import { WeekCalendar } from '@/components/calendar/WeekCalendar';
import { ScheduleModal } from '@/components/calendar/ScheduleModal';
import { Spinner } from '@/components/ui/Spinner';
import { HintBar } from '@/components/ui/HintBar';
import { useHintDismiss } from '@/hooks/useHintDismiss';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Icon } from '@/components/ui/Icon';
import type { ScheduleEntry, MemberCalendarEvent } from '@/types/entities';
import { getEventLastDay } from '@/lib/utils/eventDays';

export default function SchedulePage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const currentTeamId = useAuthStore((s) => s.currentTeamId);
  const members = useAuthStore((s) => s.members);
  const googleAccessToken = useAuthStore((s) => s.googleAccessToken);
  const signIn = useAuthStore((s) => s.signIn);
  const authLoading = useAuthStore((s) => s.loading);
  const schedules = useScheduleStore((s) => s.schedules);
  const loading = useScheduleStore((s) => s.loading);
  const subscribe = useScheduleStore((s) => s.subscribe);
  const categories = useCategoryStore((s) => s.categories);
  const subscribeCategories = useCategoryStore((s) => s.subscribe);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');
  /* スマホ縦持ちでは初期表示を週（アジェンダ）にして、密な月グリッドを避ける */
  const isMobile = useMediaQuery(767);
  const didInitMobileView = useRef(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleEntry | null>(null);
  /* セルクリック時の初期日付（ScheduleModal に渡す） */
  const [clickedDate, setClickedDate] = useState<Date | null>(null);
  const [gcalEvents, setGcalEvents] = useState<ScheduleEntry[]>([]);
  const [gcalError, setGcalError] = useState<GCalFetchError>(null);
  const [showMemberCalendars, setShowMemberCalendars] = useState(false);
  const [memberCalendarEvents, setMemberCalendarEvents] = useState<MemberCalendarEvent[]>([]);
  /* ヒントバーの表示/非表示（localStorage 永続化） */
  const { visible: hintVisible, dismiss: dismissHint, show: showHint } = useHintDismiss('riskeru_hint_schedule');
  /* Googleカレンダー接続バナーの表示/非表示（×で閉じたら localStorage 永続化） */
  const { visible: gcalBannerVisible, dismiss: dismissGcalBanner } = useHintDismiss('riskeru_gcal_banner_schedule');
  /* モバイルヘッダーの「⋯」メニュー開閉 */
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  /* 読み取り専用ポップアップのドラッグ移動 */
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });
  const popupIsDragging = useRef(false);
  const popupDragStart = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });
  const popupMouseDownOnOverlay = useRef(false);
  const popupPanelRef = useRef<HTMLDivElement>(null);

  const myMember = members.find((m) => m.userId === currentUser?.uid);
  const canEdit = myMember?.role === 'operator' || myMember?.role === 'member';

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

  // メンバーの予定をFirestoreからリアルタイム取得（トグルON時のみ購読）
  useEffect(() => {
    if (!currentTeamId || !showMemberCalendars) return;
    return subscribeMemberCalendarEvents(currentTeamId, setMemberCalendarEvents);
  }, [currentTeamId, showMemberCalendars]);

  // モバイルヘッダー「⋯」メニュー: 外側タップで閉じる
  useEffect(() => {
    if (!moreOpen) return;
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [moreOpen]);

  // 読み取り専用ポップアップのドラッグ
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!popupIsDragging.current) return;
      setPopupPos({
        x: popupDragStart.current.posX + e.clientX - popupDragStart.current.mouseX,
        y: popupDragStart.current.posY + e.clientY - popupDragStart.current.mouseY,
      });
    }
    function onUp() { popupIsDragging.current = false; }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, []);

  // ポップアップが切り替わったらドラッグ位置をリセット
  useEffect(() => {
    setPopupPos({ x: 0, y: 0 }); // eslint-disable-line react-hooks/set-state-in-effect
  }, [selectedSchedule?.id]);

  function handlePopupDragStart(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('button, input, select, a')) return;
    popupIsDragging.current = true;
    popupDragStart.current = { mouseX: e.clientX, mouseY: e.clientY, posX: popupPos.x, posY: popupPos.y };
    e.preventDefault();
  }

  // Googleカレンダーの個人予定を取得
  useEffect(() => {
    if (!googleAccessToken) {
      setGcalEvents([]); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }
    const timeMin = view === 'month'
      ? startOfMonth(currentDate)
      : startOfWeek(currentDate, { weekStartsOn: 0 });
    const timeMax = view === 'month'
      ? endOfMonth(currentDate)
      : endOfWeek(currentDate, { weekStartsOn: 0 });

    fetchGCalEvents(googleAccessToken, timeMin, timeMax).then(({ events, error }) => {
      setGcalEvents(events);
      setGcalError(error);
    });
  }, [googleAccessToken, currentDate, view]);

  /* Firestore購読が更新したらselectedScheduleを同期 */
  useEffect(() => {
    if (!selectedSchedule) return;
    const updated = schedules.find((s) => s.id === selectedSchedule.id);
    if (updated && updated.updatedAt.getTime() !== selectedSchedule.updatedAt.getTime()) {
      setSelectedSchedule(updated); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [schedules, selectedSchedule?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // メンバーの予定をScheduleEntry形式に変換 (T027/T029/T030)
  const memberScheduleEntries: ScheduleEntry[] = (showMemberCalendars ? memberCalendarEvents : [])
    // 自分のGoogleカレンダーが有効な場合、自分のFirestore同期予定は除外して重複を防ぐ
    .filter((e) => !(e.userId === currentUser?.uid && googleAccessToken))
    .map((e) => ({
      id: `mcal_${e.id}`,
      title: e.title,
      categoryId: null,
      startAt: e.startAt,
      endAt: e.endAt,
      description: '',
      participantIds: [],
      collabPartnerName: null,
      linkedTaskIds: [],
      updatedAt: e.syncedAt,
      createdBy: e.userId,
      createdAt: e.syncedAt,
      source: 'member' as const,
      allDay: e.allDay,
    }));

  const allSchedules = [...schedules, ...gcalEvents, ...memberScheduleEntries];

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
      <div
        className="shrink-0 px-4 md:px-7"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--card-border)', paddingTop: 6 }}
      >
        {/* ── PC ヘッダー（md 以上・従来レイアウトを維持） ── */}
        {!isMobile && (
        <div className="calhd">
          {/* 週/月セグメントトグル */}
          <div className="segtoggle">
            <button className={view === 'week' ? 'is-on' : ''} onClick={() => setView('week')}>週</button>
            <button className={view === 'month' ? 'is-on' : ''} onClick={() => setView('month')}>月</button>
          </div>

          {/* YYYY年MM月 */}
          <span className="calhd__month">{year}年 <span className="font-num" style={{ color: 'var(--text-accent)' }}>{month}月</span></span>

          {/* 右グループ */}
          <div className="calhd__right">
            {/* 予定追加 */}
            {canEdit && (
              <button
                onClick={() => { setClickedDate(null); setShowCreate(true); }}
                className="btn btn--primary btn--sm"
              >
                <Icon name="add" size={16} />
                <span className="hidden md:inline">予定を追加</span>
              </button>
            )}

            {/* メンバーの予定表示切替 */}
            <button
              onClick={() => setShowMemberCalendars((v) => !v)}
              className={`btn btn--sm ${showMemberCalendars ? 'btn--ghost' : 'btn--subtle'}`}
            >
              <Icon name="groups" size={15} />
              <span className="hidden md:inline">{showMemberCalendars ? 'メンバー表示中' : 'メンバーの予定'}</span>
            </button>

            {/* 日付ナビ */}
            <div className="datenav">
              <button className="datenav__arrow" onClick={goBack} aria-label={view === 'month' ? '前月' : '前の週'}>
                <Icon name="chevron_left" size={18} />
              </button>
              <button className="datenav__today" onClick={() => setCurrentDate(new Date())}>今日</button>
              <button className="datenav__arrow" onClick={goForward} aria-label={view === 'month' ? '翌月' : '次の週'}>
                <Icon name="chevron_right" size={18} />
              </button>
            </div>

            {/* ヘルプトグル */}
            <button
              onClick={() => hintVisible ? dismissHint() : showHint()}
              className={`helptoggle${hintVisible ? ' is-on' : ''}`}
              aria-label={hintVisible ? 'ヒントを閉じる' : 'ヒントを表示'}
            >
              <Icon name="help_outline" size={17} />
            </button>
          </div>
        </div>
        )}

        {/* ── モバイルヘッダー（md 未満・44px 1 行に統合） ── */}
        {isMobile && (
        <div className="mcalbar">
          {/* 週/月セグメント */}
          <div className="mseg">
            <button className={view === 'week' ? 'is-on' : ''} onClick={() => setView('week')}>週</button>
            <button className={view === 'month' ? 'is-on' : ''} onClick={() => setView('month')}>月</button>
          </div>

          {/* 月ナビ（‹ N月 › ・年を小さく併記） */}
          <div className="mcalnav">
            <button className="mcalnav__arrow" onClick={goBack} aria-label={view === 'month' ? '前月' : '前の週'}>
              <Icon name="chevron_left" size={20} />
            </button>
            <span className="mcalnav__label">
              <span className="mcalnav__year font-num">{year}</span>
              <span className="mcalnav__month font-num">{month}月</span>
            </span>
            <button className="mcalnav__arrow" onClick={goForward} aria-label={view === 'month' ? '翌月' : '次の週'}>
              <Icon name="chevron_right" size={20} />
            </button>
          </div>

          {/* 今日 */}
          <button className="mcaltoday" onClick={() => setCurrentDate(new Date())}>今日</button>

          <span className="mcalbar__spacer" />

          {/* ⋯ 低頻度操作メニュー */}
          <div className="relative" ref={moreRef}>
            <button
              className={`mcalmore${moreOpen ? ' is-on' : ''}`}
              onClick={() => setMoreOpen((v) => !v)}
              aria-label="その他の操作"
              aria-expanded={moreOpen}
            >
              <Icon name="more_horiz" size={22} />
            </button>
            {moreOpen && (
              <div className="mcalmenu animate-pop-modal">
                {/* メンバーの予定 表示/非表示 */}
                <button
                  className="mcalmenu__item"
                  onClick={() => { setShowMemberCalendars((v) => !v); setMoreOpen(false); }}
                >
                  <Icon name="groups" size={18} />
                  <span>{showMemberCalendars ? 'メンバーの予定を隠す' : 'メンバーの予定を表示'}</span>
                </button>
                {/* ヒント表示切替 */}
                <button
                  className="mcalmenu__item"
                  onClick={() => { if (hintVisible) dismissHint(); else showHint(); setMoreOpen(false); }}
                >
                  <Icon name="help_outline" size={18} />
                  <span>{hintVisible ? 'ヒントを隠す' : 'ヒントを表示'}</span>
                </button>
                {/* Googleカレンダー接続 */}
                <button
                  className="mcalmenu__item"
                  onClick={async () => {
                    setMoreOpen(false);
                    try { await signIn(); setGcalError(null); } catch { /* ポップアップブロック等は無視 */ }
                  }}
                >
                  <Icon name="event" size={18} />
                  <span>{googleAccessToken ? 'Googleカレンダー再接続' : 'Googleカレンダーを接続'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* ヒントバー（初回表示・?ボタンで再表示）: visible は useHintDismiss で一元管理 */}
      {hintVisible && (
        <HintBar onDismiss={dismissHint}>
          カレンダーの日付をクリックすると週表示に切り替わります。「予定を追加」ボタンまたはセルをクリックして予定を追加できます。
        </HintBar>
      )}


      {/* Googleカレンダー接続バナー（未接続・認証期限切れ共通・×で閉じたら永続非表示） */}
      {!authLoading && !googleAccessToken && gcalBannerVisible && (
        <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-amber/10 border-b border-amber/30 text-[12px] text-amber-l">
          <span className="material-icons text-[16px]">
            {gcalError === 'auth_expired' ? 'warning' : 'link_off'}
          </span>
          <span className="flex-1">
            {gcalError === 'auth_expired'
              ? 'Googleカレンダーの認証が切れています。'
              : 'Googleカレンダーに接続すると、個人の予定をここに表示できます。'}
          </span>
          <button
            onClick={async () => {
              try {
                await signIn();
                setGcalError(null);
              } catch {
                /* ポップアップがブロックされた場合などは無視 */
              }
            }}
            className="shrink-0 px-3 py-1 rounded-[6px] text-[11px] font-bold bg-amber/20 border border-amber/50 hover:bg-amber/30 transition-colors"
          >
            {gcalError === 'auth_expired' ? '再接続' : '接続する'}
          </button>
          <button
            onClick={dismissGcalBanner}
            aria-label="バナーを閉じる"
            className="shrink-0 flex items-center justify-center w-6 h-6 rounded-[6px] text-amber-l/70 hover:text-amber-l hover:bg-amber/15 transition-colors"
          >
            <Icon name="close" size={15} />
          </button>
        </div>
      )}

      {/* カレンダー本体 */}
      <div className="calwrap">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : view === 'month' ? (
          <MonthCalendar
            year={year}
            month={month}
            schedules={allSchedules}
            categories={categories}
            onEventClick={setSelectedSchedule}
            onDateClick={canEdit ? (d) => { setClickedDate(d ?? null); setShowCreate(true); } : undefined}
            onDateLabelClick={(date) => {
              setCurrentDate(date);
              setView('week');
            }}
          />
        ) : (
          <WeekCalendar
            currentDate={currentDate}
            schedules={allSchedules}
            categories={categories}
            onEventClick={setSelectedSchedule}
            onDateClick={canEdit ? (d) => { setClickedDate(d ?? null); setShowCreate(true); } : undefined}
          />
        )}
      </div>

      {/* メンバーの予定の詳細（読み取り専用） */}
      {selectedSchedule?.source === 'member' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onMouseDown={(e) => { popupMouseDownOnOverlay.current = !popupPanelRef.current?.contains(e.target as Node); }}
          onClick={() => { if (popupMouseDownOnOverlay.current) setSelectedSchedule(null); }}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div
            ref={popupPanelRef}
            className="relative z-10 w-[calc(100vw-32px)] max-w-md bg-card border border-border rounded-[20px] overflow-hidden"
            style={{ transform: `translate(${popupPos.x}px, ${popupPos.y}px)` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-start justify-between gap-3 p-6 pb-4 cursor-move"
              onMouseDown={handlePopupDragStart}
            >
              <div className="flex items-center gap-2">
                <Icon name="groups" size={18} className="text-[#60a5fa]" />
                <span className="text-[11px] font-semibold" style={{ color: '#60a5fa' }}>メンバーの予定</span>
              </div>
              <button onClick={() => setSelectedSchedule(null)} className="text-muted hover:text-text">
                <Icon name="close" size={20} />
              </button>
            </div>
            <div className="px-6 pb-6">
              <h3 className="text-[17px] font-bold text-text mb-3">{selectedSchedule.title}</h3>
              <p className="text-[13px] text-muted">
                {selectedSchedule.allDay
                  ? isSameDay(selectedSchedule.startAt, getEventLastDay(selectedSchedule))
                    ? format(selectedSchedule.startAt, 'M月d日(E)', { locale: ja }) + ' 終日'
                    : format(selectedSchedule.startAt, 'M月d日(E)', { locale: ja }) +
                      ' – ' +
                      format(getEventLastDay(selectedSchedule), 'M月d日(E)', { locale: ja }) +
                      ' 終日'
                  : format(selectedSchedule.startAt, 'M月d日(E) HH:mm', { locale: ja }) +
                    ' – ' +
                    format(selectedSchedule.endAt, 'HH:mm')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* スケジュール詳細オーバーレイ（チーム予定） */}
      {selectedSchedule && !selectedSchedule.source && currentTeamId && (
        <ScheduleModal
          schedule={selectedSchedule}
          teamId={currentTeamId}
          canEdit={canEdit}
          categories={categories}
          onClose={() => setSelectedSchedule(null)}
          onDeleted={() => setSelectedSchedule(null)}
        />
      )}

      {/* Googleカレンダー予定の詳細（読み取り専用） */}
      {selectedSchedule?.source === 'google' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onMouseDown={(e) => { popupMouseDownOnOverlay.current = !popupPanelRef.current?.contains(e.target as Node); }}
          onClick={() => { if (popupMouseDownOnOverlay.current) setSelectedSchedule(null); }}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div
            ref={popupPanelRef}
            className="relative z-10 w-[calc(100vw-32px)] max-w-md bg-card border border-border rounded-[20px] overflow-hidden"
            style={{ transform: `translate(${popupPos.x}px, ${popupPos.y}px)` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-start justify-between gap-3 p-6 pb-4 cursor-move"
              onMouseDown={handlePopupDragStart}
            >
              <div className="flex items-center gap-2">
                <Icon name="event" size={18} className="text-green" />
                <span className="text-[11px] font-semibold" style={{ color: 'var(--green)' }}>Googleカレンダー</span>
              </div>
              <button onClick={() => setSelectedSchedule(null)} className="text-muted hover:text-text">
                <Icon name="close" size={20} />
              </button>
            </div>
            <div className="px-6 pb-6">
              <h3 className="text-[17px] font-bold text-text mb-3">{selectedSchedule.title}</h3>
              <p className="text-[13px] text-muted mb-1">
                {format(selectedSchedule.startAt, 'M月d日(E) HH:mm', { locale: ja })}
                {' – '}
                {format(selectedSchedule.endAt, 'HH:mm')}
              </p>
              {selectedSchedule.description && (
                <p className="text-[12px] text-muted mt-3 whitespace-pre-wrap">{selectedSchedule.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* スケジュール追加モーダル（チーム予定・新規作成） */}
      {showCreate && currentTeamId && (
        <ScheduleModal
          schedule={null}
          initialDate={clickedDate ?? undefined}
          teamId={currentTeamId}
          canEdit={canEdit}
          categories={categories}
          onClose={() => { setShowCreate(false); setClickedDate(null); }}
          onDeleted={() => {}}
        />
      )}
    </div>
  );
}
