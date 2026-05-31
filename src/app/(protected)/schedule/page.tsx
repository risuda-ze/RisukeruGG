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
import { Icon } from '@/components/ui/Icon';
import type { ScheduleEntry, MemberCalendarEvent } from '@/types/entities';

export default function SchedulePage() {
  const { currentUser, currentTeamId, members, googleAccessToken, signIn, loading: authLoading } = useAuthStore();
  const { schedules, loading, subscribe } = useScheduleStore();
  const { categories, subscribe: subscribeCategories } = useScheduleCategoryStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');
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
        className="flex flex-wrap items-center gap-2 px-4 md:px-6 py-2 shrink-0"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--card-border)' }}
      >
        {/* 左: 週/月トグル + YYYY年MM月 */}
        <div className="flex items-center gap-3">
          {/* 週/月切替セグメント */}
          <div
            className="flex border rounded-[8px] p-[3px] gap-[2px]"
            style={{ background: 'var(--surface)', borderColor: 'var(--card-border)' }}
          >
            {(['週', '月'] as const).map((label) => {
              const v = label === '週' ? 'week' : 'month';
              return (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className="px-4 py-1.5 rounded-[6px] text-[13px] font-semibold transition-colors"
                  style={{
                    background: view === v ? 'var(--primary)' : 'none',
                    color: view === v ? '#fff' : 'var(--text-secondary)',
                    boxShadow: view === v ? 'var(--glow-primary)' : 'none',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* YYYY年MM月 */}
          <span
            className="text-[15px] md:text-[17px] font-bold whitespace-nowrap"
            style={{ fontFamily: 'var(--font-head)', color: 'var(--text-primary)' }}
          >
            {year}年{month}月
          </span>
        </div>

        {/* 右: 予定追加 / メンバー切替 / ナビ / ヘルプトグル */}
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {/* 予定追加ボタン */}
          {canEdit && (
            <button
              onClick={() => { setClickedDate(null); setShowCreate(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold transition-colors text-white"
              style={{ background: 'var(--primary)', boxShadow: 'var(--glow-primary)' }}
            >
              <Icon name="add" size={15} />
              <span className="hidden sm:inline">予定を追加</span>
            </button>
          )}

          {/* メンバーの予定表示切替 */}
          <button
            onClick={() => setShowMemberCalendars((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-[12px] font-semibold transition-colors border"
            style={{
              background: showMemberCalendars ? 'rgba(91,200,250,0.15)' : 'none',
              borderColor: showMemberCalendars ? 'rgba(91,200,250,0.5)' : 'var(--border)',
              color: showMemberCalendars ? 'var(--info)' : 'var(--text-muted)',
            }}
          >
            <Icon name="groups" size={14} />
            <span className="hidden sm:inline">メンバーの予定</span>
          </button>

          {/* 日付ナビ: 前/今日/次 */}
          <div
            className="flex items-center rounded-[8px] border p-[3px] gap-[2px]"
            style={{ background: 'var(--surface)', borderColor: 'var(--card-border)' }}
          >
            <button
              onClick={goBack}
              className="w-8 h-8 flex items-center justify-center rounded-[6px] transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--card-raised)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
              aria-label={view === 'month' ? '前月' : '前の週'}
            >
              <Icon name="chevron_left" size={16} />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 h-8 rounded-[6px] text-[12px] font-semibold transition-colors"
              style={{ color: 'var(--text-primary)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--card-raised)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-accent)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
            >
              今日
            </button>
            <button
              onClick={goForward}
              className="w-8 h-8 flex items-center justify-center rounded-[6px] transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--card-raised)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
              aria-label={view === 'month' ? '翌月' : '次の週'}
            >
              <Icon name="chevron_right" size={16} />
            </button>
          </div>

          {/* ヘルプトグル: ヒントバーを再表示する「?」ボタン */}
          <button
            onClick={() => hintVisible ? dismissHint() : showHint()}
            className="w-9 h-9 flex items-center justify-center rounded-[8px] border transition-colors"
            style={{
              borderColor: hintVisible ? 'var(--primary-700)' : 'var(--card-border)',
              background: hintVisible ? 'var(--primary-950)' : 'var(--surface)',
              color: hintVisible ? 'var(--text-accent)' : 'var(--text-secondary)',
            }}
            aria-label={hintVisible ? 'ヒントを閉じる' : 'ヒントを表示'}
          >
            <Icon name="help_outline" size={16} />
          </button>
        </div>
      </div>

      {/* ヒントバー（初回表示・?ボタンで再表示） */}
      <HintBar storageKey="riskeru_hint_schedule">
        カレンダーの日付をクリックすると週表示に切り替わります。「予定を追加」ボタンまたはセルをクリックして予定を追加できます。
      </HintBar>


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
                  ? format(selectedSchedule.startAt, 'M月d日(E)', { locale: ja }) + ' 終日'
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
