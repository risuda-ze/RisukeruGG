'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useScheduleStore } from '@/stores/schedule';
import { useScheduleCategoryStore } from '@/stores/scheduleCategories';
import { updateSchedule, deleteSchedule } from '@/lib/repositories/schedules';
import { ScheduleForm } from '@/components/calendar/ScheduleForm';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import type { ScheduleEntry } from '@/types/entities';

export default function ScheduleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const scheduleId = params.id as string;

  const { currentUser, currentTeamId, members } = useAuthStore();
  const { schedules } = useScheduleStore();
  const { categories, subscribe: subscribeCategories } = useScheduleCategoryStore();
  const [showConflict, setShowConflict] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentTeamId) return;
    return subscribeCategories(currentTeamId);
  }, [currentTeamId, subscribeCategories]);

  const schedule = schedules.find((s) => s.id === scheduleId);
  const myMember = members.find((m) => m.userId === currentUser?.uid);
  const canEdit = myMember?.role === 'operator' || myMember?.role === 'member';

  if (!schedule) {
    return (
      <div className="flex flex-1 items-center justify-center bg-bg">
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

  const currentCategory = categories.find((c) => c.id === schedule.categoryId);

  return (
    <div className="px-4 py-6 md:px-7 max-w-2xl">
      {/* ── ページヘッダー ─────────────────────────────────── */}
      <div className="mb-6 flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-text truncate">{schedule.title}</h2>
          {currentCategory && (
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
                style={{
                  background: `${currentCategory.color}22`,
                  color: currentCategory.color,
                  border: `1px solid ${currentCategory.color}44`,
                }}
              >
                <span className="material-icons text-[12px]">{currentCategory.icon}</span>
                {currentCategory.name}
              </span>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/schedule')}
          aria-label="スケジュール一覧へ戻る"
        >
          ← 一覧
        </Button>
      </div>

      {canEdit ? (
        <>
          <ScheduleForm
            initialData={schedule}
            categories={categories}
            onSubmit={handleUpdate}
            onCancel={() => router.push('/schedule')}
          />
          <div className="mt-6 pt-6 border-t border-border">
            <Button variant="danger" size="sm" onClick={handleDelete} disabled={saving}>
              削除する
            </Button>
          </div>
        </>
      ) : (
        /* 閲覧専用ビュー */
        <Card>
          <dl className="space-y-4 text-sm">
            <InfoRow label="開始">{schedule.startAt.toLocaleString('ja-JP')}</InfoRow>
            <InfoRow label="終了">{schedule.endAt.toLocaleString('ja-JP')}</InfoRow>
            <InfoRow label="カテゴリ">{currentCategory?.name ?? '未選択'}</InfoRow>
            {schedule.description && <InfoRow label="説明">{schedule.description}</InfoRow>}
          </dl>
        </Card>
      )}

      {/* 楽観的ロック競合モーダル */}
      <Modal
        open={showConflict}
        onClose={() => setShowConflict(false)}
        title="編集が競合しました"
        footer={
          <Button
            onClick={() => {
              setShowConflict(false);
              router.refresh();
            }}
          >
            最新版を読み込む
          </Button>
        }
      >
        <p className="text-muted">
          他のユーザーが同時に編集しました。最新版を読み込んで再度編集してください。
        </p>
      </Modal>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <dt className="w-20 shrink-0 text-muted">{label}</dt>
      <dd className="text-text">{children}</dd>
    </div>
  );
}
