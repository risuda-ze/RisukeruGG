'use client';

import { useEffect, useRef, useState } from 'react';
import {
  addMonths, subMonths, addWeeks, subWeeks, format, startOfWeek,
  startOfMonth, endOfMonth, endOfWeek,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAuthStore } from '@/stores/auth';
import { useScheduleStore } from '@/stores/schedule';
import { useScheduleCategoryStore } from '@/stores/scheduleCategories';
import { createSchedule } from '@/lib/repositories/schedules';
import { subscribeMemberCalendarEvents } from '@/lib/repositories/memberCalendars';
import { fetchGCalEvents } from '@/lib/googleCalendar';
import type { GCalFetchError } from '@/lib/googleCalendar';
import { TopBar } from '@/components/layout/TopBar';
import { MonthCalendar } from '@/components/calendar/MonthCalendar';
import { WeekCalendar } from '@/components/calendar/WeekCalendar';
import { ScheduleDetailModal } from '@/components/calendar/ScheduleDetailModal';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { ScheduleForm } from '@/components/calendar/ScheduleForm';
import type { ScheduleEntry, MemberCalendarEvent } from '@/types/entities';

export default function SchedulePage() {
  const { currentUser, currentTeamId, members, googleAccessToken, signIn, loading: authLoading } = useAuthStore();
  const { schedules, loading, subscribe } = useScheduleStore();
  const { categories, subscribe: subscribeCategories } = useScheduleCategoryStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleEntry | null>(null);
  const [gcalEvents, setGcalEvents] = useState<ScheduleEntry[]>([]);
  const [gcalError, setGcalError] = useState<GCalFetchError>(null);
  const [showMemberCalendars, setShowMemberCalendars] = useState(false);
  const [memberCalendarEvents, setMemberCalendarEvents] = useState<MemberCalendarEvent[]>([]);

  /* 読み取り専用ポップアップのドラッグ移動 */
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });
  const popupIsDragging = useRef(false);
  const popupDragStart = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });
  const popupMouseDownOnOverlay = useRef(false);
  const popupPanelRef = useRef<HTMLDivElement>(null);

  const myMember = members.find((m) => m.userId === currentUser?.uid);
  const canEdit = myMember?.role === 'operator' || myMember?.role === 'member';

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

  function openScheduleDetails(schedule: ScheduleEntry) {
    setPopupPos({ x: 0, y: 0 });
    setSelectedSchedule(schedule);
  }

  function handlePopupDragStart(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('button, input, select, a')) return;
    popupIsDragging.current = true;
    popupDragStart.current = { mouseX: e.clientX, mouseY: e.clientY, posX: popupPos.x, posY: popupPos.y };
    e.preventDefault();
  }

  // Googleカレンダーの個人予定を取得
  useEffect(() => {
    if (!googleAccessToken) return;
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

  const activeSelectedSchedule = !selectedSchedule || selectedSchedule.source
    ? selectedSchedule
    : schedules.find((schedule) => schedule.id === selectedSchedule.id) ?? selectedSchedule;

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

  const visibleGcalEvents = googleAccessToken ? gcalEvents : [];
  const allSchedules = [...schedules, ...visibleGcalEvents, ...memberScheduleEntries];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;


  /* 前後ナビゲーション */
  function goBack() {
    setCurrentDate(view === 'month' ? subMonths(currentDate, 1) : subWeeks(currentDate, 1));
  }
  function goForward() {
    setCurrentDate(view === 'month' ? addMonths(currentDate, 1) : addWeeks(currentDate, 1));
  }

  const handleCreateSchedule = async (
    data: Omit<ScheduleEntry, 'id' | 'updatedAt' | 'createdAt' | 'createdBy'>
  ) => {
    if (!currentTeamId || !currentUser) return;
    await createSchedule(currentTeamId, { ...data, createdBy: currentUser.uid });
    setShowCreate(false);
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden relative">
      {/* トップバー */}
      <TopBar title="スケジュール" />

      {/* カレンダーナビゲーションバー */}
      <div className="flex items-center justify-between px-3 md:px-6 py-0.5 md:py-1 bg-card shrink-0">
        {/* 週/月トグル + ラベル */}
        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex bg-surface border border-border rounded-[6px] overflow-hidden">
            <button
              onClick={() => setView('week')}
              className={`px-2.5 md:px-3.5 py-1 text-[12px] font-semibold transition-colors ${
                view === 'week' ? 'bg-purple-d text-purple-l' : 'text-muted hover:text-text'
              }`}
            >
              週
            </button>
            <button
              onClick={() => setView('month')}
              className={`px-2.5 md:px-3.5 py-1 text-[12px] font-semibold transition-colors ${
                view === 'month' ? 'bg-purple-d text-purple-l' : 'text-muted hover:text-text'
              }`}
            >
              月
            </button>
          </div>
          <div className="text-[14px] md:text-[16px] font-bold font-num text-text">
            {year}年 {month}月
          </div>
        </div>

        {/* 前/今日/次ナビ */}
        <div className="flex gap-1.5 md:gap-2">
          <button
            onClick={goBack}
            className="p-1 rounded-[6px] border border-border text-text hover:bg-surface transition-colors"
            aria-label={view === 'month' ? '前月' : '前の週'}
          >
            <span className="material-icons text-[16px]">chevron_left</span>
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-2.5 md:px-3 py-1 rounded-[6px] border border-border text-[11px] font-semibold text-text hover:bg-surface transition-colors"
          >
            今日
          </button>
          <button
            onClick={goForward}
            className="p-1 rounded-[6px] border border-border text-text hover:bg-surface transition-colors"
            aria-label={view === 'month' ? '翌月' : '次の週'}
          >
            <span className="material-icons text-[16px]">chevron_right</span>
          </button>
        </div>
      </div>

      {/* 表示オプション */}
      <div className="flex items-center gap-2 px-3 md:px-6 py-1 bg-card border-b border-border shrink-0">
        <button
          onClick={() => setShowMemberCalendars((v) => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-semibold transition-colors border ${
            showMemberCalendars
              ? 'bg-[#60a5fa]/20 border-[#60a5fa]/50 text-[#60a5fa]'
              : 'border-border text-muted hover:text-text hover:bg-surface'
          }`}
        >
          <span className="material-icons text-[14px]">group</span>
          メンバーの予定
        </button>
      </div>

      {/* Googleカレンダー接続バナー（未接続・認証期限切れ共通） */}
      {!authLoading && !googleAccessToken && (
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
        </div>
      )}

      {/* カレンダー */}
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
          onEventClick={openScheduleDetails}
          onDateClick={canEdit ? () => setShowCreate(true) : undefined}
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
          onEventClick={openScheduleDetails}
          onDateClick={canEdit ? () => setShowCreate(true) : undefined}
        />
      )}

      {/* カレンダーフッター */}
      {!loading && (
        <div className="shrink-0 border-t border-border bg-card px-4 md:px-6 py-2 flex items-center justify-between">
          <span className="text-[11px] text-muted">
            {allSchedules.filter((s) => {
              if (view === 'month') {
                return (
                  s.startAt.getFullYear() === year && s.startAt.getMonth() + 1 === month
                );
              }
              return true;
            }).length}
            件の予定
          </span>
          <span className="text-[11px] text-muted/50 font-num">
            {view === 'month' ? `${year}年${month}月` : `${year}年${month}月 週表示`}
          </span>
        </div>
      )}

      {/* メンバーの予定の詳細（読み取り専用） */}
      {activeSelectedSchedule?.source === 'member' && (
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
                <span className="material-icons text-[18px]" style={{ color: '#60a5fa' }}>group</span>
                <span className="text-[11px] font-semibold" style={{ color: '#60a5fa' }}>メンバーの予定</span>
              </div>
              <button onClick={() => setSelectedSchedule(null)} className="text-muted hover:text-text">
                <span className="material-icons text-[20px]">close</span>
              </button>
            </div>
            <div className="px-6 pb-6">
                <h3 className="text-[17px] font-bold text-text mb-3">{activeSelectedSchedule.title}</h3>
              <p className="text-[13px] text-muted">
                  {activeSelectedSchedule.allDay
                    ? format(activeSelectedSchedule.startAt, 'M月d日(E)', { locale: ja }) + ' 終日'
                    : format(activeSelectedSchedule.startAt, 'M月d日(E) HH:mm', { locale: ja }) +
                    ' – ' +
                      format(activeSelectedSchedule.endAt, 'HH:mm')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* スケジュール詳細オーバーレイ（チーム予定） */}
        {activeSelectedSchedule && !activeSelectedSchedule.source && currentTeamId && (
        <ScheduleDetailModal
            schedule={activeSelectedSchedule}
          teamId={currentTeamId}
          canEdit={canEdit}
          categories={categories}
          onClose={() => setSelectedSchedule(null)}
          onDeleted={() => setSelectedSchedule(null)}
        />
      )}

      {/* Googleカレンダー予定の詳細（読み取り専用） */}
      {activeSelectedSchedule?.source === 'google' && (
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
                <span className="material-icons text-[18px]" style={{ color: 'var(--green)' }}>event</span>
                <span className="text-[11px] font-semibold" style={{ color: 'var(--green)' }}>Googleカレンダー</span>
              </div>
              <button onClick={() => setSelectedSchedule(null)} className="text-muted hover:text-text">
                <span className="material-icons text-[20px]">close</span>
              </button>
            </div>
            <div className="px-6 pb-6">
                <h3 className="text-[17px] font-bold text-text mb-3">{activeSelectedSchedule.title}</h3>
              <p className="text-[13px] text-muted mb-1">
                  {format(activeSelectedSchedule.startAt, 'M月d日(E) HH:mm', { locale: ja })}
                {' – '}
                  {format(activeSelectedSchedule.endAt, 'HH:mm')}
              </p>
                {activeSelectedSchedule.description && (
                  <p className="text-[12px] text-muted mt-3 whitespace-pre-wrap">{activeSelectedSchedule.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* スケジュール作成モーダル */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="スケジュールを追加">
        <ScheduleForm
          categories={categories}
          onSubmit={handleCreateSchedule}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>
    </div>
  );
}
