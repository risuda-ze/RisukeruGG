'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuthStore } from '@/stores/auth';
import { useScheduleStore } from '@/stores/schedule';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ScheduleForm } from '@/components/calendar/ScheduleForm';

const CalendarView = dynamic(
  () => import('@/components/calendar/CalendarView').then((m) => ({ default: m.CalendarView })),
  { loading: () => <div className="flex justify-center py-16"><Spinner size="lg" /></div>, ssr: false }
);
import { createSchedule } from '@/lib/repositories/schedules';
import type { ScheduleEntry } from '@/types/entities';

export default function SchedulePage() {
  const { currentUser, currentTeamId, members } = useAuthStore();
  const { schedules, currentView, selectedDate, loading, setView, setSelectedDate, subscribe } =
    useScheduleStore();
  const [showCreate, setShowCreate] = useState(false);
  const [slotStart, setSlotStart] = useState<Date | null>(null);
  const [slotEnd, setSlotEnd] = useState<Date | null>(null);

  const myMember = members.find((m) => m.userId === currentUser?.uid);
  const canEdit = myMember?.role === 'owner' || myMember?.role === 'editor';

  useEffect(() => {
    if (!currentTeamId) return;
    return subscribe(currentTeamId);
  }, [currentTeamId, subscribe]);

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    if (!canEdit) return;
    setSlotStart(start);
    setSlotEnd(end);
    setShowCreate(true);
  };

  const handleCreateSchedule = async (
    data: Omit<ScheduleEntry, 'id' | 'updatedAt' | 'createdAt' | 'createdBy'>
  ) => {
    if (!currentTeamId || !currentUser) return;
    await createSchedule(currentTeamId, { ...data, createdBy: currentUser.uid });
    setShowCreate(false);
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">スケジュール</h1>
        {canEdit && (
          <Button onClick={() => setShowCreate(true)} aria-label="スケジュールを追加">
            + 追加
          </Button>
        )}
      </div>

      <CalendarView
        schedules={schedules}
        view={currentView}
        date={selectedDate}
        onViewChange={setView}
        onDateChange={setSelectedDate}
        onSelectEvent={() => {}}
        onSelectSlot={canEdit ? handleSelectSlot : undefined}
      />

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="スケジュールを追加"
      >
        <ScheduleForm
          initialData={
            slotStart && slotEnd ? { startAt: slotStart, endAt: slotEnd } : undefined
          }
          onSubmit={handleCreateSchedule}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>
    </div>
  );
}
