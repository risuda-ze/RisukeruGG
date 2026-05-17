'use client';

import { useEffect, useState } from 'react';
import { addMonths, subMonths, addWeeks, subWeeks, format, startOfWeek } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAuthStore } from '@/stores/auth';
import { useScheduleStore } from '@/stores/schedule';
import { useScheduleCategoryStore } from '@/stores/scheduleCategories';
import { createSchedule } from '@/lib/repositories/schedules';
import { TopBar } from '@/components/layout/TopBar';
import { MonthCalendar } from '@/components/calendar/MonthCalendar';
import { WeekCalendar } from '@/components/calendar/WeekCalendar';
import { ScheduleDetailModal } from '@/components/calendar/ScheduleDetailModal';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { ScheduleForm } from '@/components/calendar/ScheduleForm';
import type { ScheduleEntry } from '@/types/entities';

export default function SchedulePage() {
  const { currentUser, currentTeamId, members } = useAuthStore();
  const { schedules, loading, subscribe } = useScheduleStore();
  const { categories, subscribe: subscribeCategories } = useScheduleCategoryStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleEntry | null>(null);

  const myMember = members.find((m) => m.userId === currentUser?.uid);
  const canEdit = myMember?.role === 'owner' || myMember?.role === 'editor';

  useEffect(() => {
    if (!currentTeamId) return;
    const u1 = subscribe(currentTeamId);
    const u2 = subscribeCategories(currentTeamId);
    return () => {
      u1();
      u2();
    };
  }, [currentTeamId, subscribe, subscribeCategories]);

  /* Firestore購読が更新したらselectedScheduleを同期 */
  useEffect(() => {
    if (!selectedSchedule) return;
    const updated = schedules.find((s) => s.id === selectedSchedule.id);
    if (updated && updated.updatedAt.getTime() !== selectedSchedule.updatedAt.getTime()) {
      setSelectedSchedule(updated);
    }
  }, [schedules, selectedSchedule?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  /* トップバーのサブタイトル */
  const subtitle =
    view === 'month'
      ? `${year}年${month}月`
      : (() => {
          const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
          return format(weekStart, 'yyyy年M月d日〜', { locale: ja });
        })();

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
      <TopBar title="スケジュール" subtitle={subtitle}>
        {canEdit && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[12px] text-[12px] font-semibold text-white transition-colors"
            style={{ background: 'var(--amber-d)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--amber)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--amber-d)')}
          >
            <span className="material-icons text-[16px]">add</span>予定を追加
          </button>
        )}
      </TopBar>

      {/* カレンダーナビゲーションバー */}
      <div className="flex items-center justify-between px-3 md:px-6 py-2 md:py-3 bg-card border-b border-border shrink-0">
        {/* 週/月トグル + ラベル */}
        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex bg-surface border border-border rounded-[6px] overflow-hidden">
            <button
              onClick={() => setView('week')}
              className={`px-2.5 md:px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
                view === 'week' ? 'bg-purple-d text-purple-l' : 'text-muted hover:text-text'
              }`}
            >
              週
            </button>
            <button
              onClick={() => setView('month')}
              className={`px-2.5 md:px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
                view === 'month' ? 'bg-purple-d text-purple-l' : 'text-muted hover:text-text'
              }`}
            >
              月
            </button>
          </div>
          <div className="text-[15px] md:text-[18px] font-bold font-num text-text">
            {year}年 {month}月
          </div>
        </div>

        {/* 前/今日/次ナビ */}
        <div className="flex gap-1.5 md:gap-2">
          <button
            onClick={goBack}
            className="p-1.5 rounded-[6px] border border-border text-text hover:bg-surface transition-colors"
            aria-label={view === 'month' ? '前月' : '前の週'}
          >
            <span className="material-icons text-[18px]">chevron_left</span>
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-2.5 md:px-3.5 py-1.5 rounded-[6px] border border-border text-[12px] font-semibold text-text hover:bg-surface transition-colors"
          >
            今日
          </button>
          <button
            onClick={goForward}
            className="p-1.5 rounded-[6px] border border-border text-text hover:bg-surface transition-colors"
            aria-label={view === 'month' ? '翌月' : '次の週'}
          >
            <span className="material-icons text-[18px]">chevron_right</span>
          </button>
        </div>
      </div>

      {/* カレンダー */}
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
          onDateClick={canEdit ? () => setShowCreate(true) : undefined}
        />
      ) : (
        <WeekCalendar
          currentDate={currentDate}
          schedules={schedules}
          categories={categories}
          onEventClick={setSelectedSchedule}
          onDateClick={canEdit ? () => setShowCreate(true) : undefined}
        />
      )}

      {/* カレンダーフッター */}
      {!loading && (
        <div className="shrink-0 border-t border-border bg-card px-4 md:px-6 py-2 flex items-center justify-between">
          <span className="text-[11px] text-muted">
            {schedules.filter((s) => {
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

      {/* スケジュール詳細オーバーレイ */}
      {selectedSchedule && currentTeamId && (
        <ScheduleDetailModal
          schedule={selectedSchedule}
          teamId={currentTeamId}
          canEdit={canEdit}
          categories={categories}
          onClose={() => setSelectedSchedule(null)}
          onDeleted={() => setSelectedSchedule(null)}
        />
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
