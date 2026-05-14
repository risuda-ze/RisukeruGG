'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { useScheduleStore } from '@/stores/schedule';
import { updateSchedule, deleteSchedule } from '@/lib/repositories/schedules';
import { ScheduleForm } from '@/components/calendar/ScheduleForm';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import type { ScheduleEntry } from '@/types/entities';

export default function ScheduleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const scheduleId = params.id as string;

  const { currentUser, currentTeamId, members } = useAuthStore();
  const { schedules } = useScheduleStore();
  const [showConflict, setShowConflict] = useState(false);
  const [saving, setSaving] = useState(false);

  const schedule = schedules.find((s) => s.id === scheduleId);
  const myMember = members.find((m) => m.userId === currentUser?.uid);
  const canEdit = myMember?.role === 'owner' || myMember?.role === 'editor';

  if (!schedule) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const handleUpdate = async (
    data: Omit<ScheduleEntry, 'id' | 'updatedAt' | 'createdAt' | 'createdBy'>
  ) => {
    if (!currentTeamId) return;
    setSaving(true);
    try {
      await updateSchedule(currentTeamId, scheduleId, data, schedule.updatedAt);
      router.push('/schedule');
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'CONFLICT') {
        setShowConflict(true);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentTeamId) return;
    await deleteSchedule(currentTeamId, scheduleId);
    router.push('/schedule');
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-zinc-900">{schedule.title}</h1>

      {canEdit ? (
        <>
          <ScheduleForm
            initialData={schedule}
            onSubmit={handleUpdate}
            onCancel={() => router.push('/schedule')}
          />
          <div className="mt-6 border-t border-zinc-200 pt-6">
            <Button variant="danger" onClick={handleDelete}>
              削除する
            </Button>
          </div>
        </>
      ) : (
        <div className="space-y-3 text-sm text-zinc-700">
          <p>開始: {schedule.startAt.toLocaleString('ja-JP')}</p>
          <p>終了: {schedule.endAt.toLocaleString('ja-JP')}</p>
          <p>ステータス: {schedule.status}</p>
          <p>説明: {schedule.description}</p>
        </div>
      )}

      <Modal
        open={showConflict}
        onClose={() => setShowConflict(false)}
        title="編集が競合しました"
        footer={
          <Button onClick={() => { setShowConflict(false); router.refresh(); }}>
            最新版を読み込む
          </Button>
        }
      >
        <p>他のユーザーが同時に編集しました。最新版を読み込んで再度編集してください。</p>
      </Modal>
    </div>
  );
}
