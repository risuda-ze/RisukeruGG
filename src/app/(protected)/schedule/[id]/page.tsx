'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useScheduleStore } from '@/stores/schedule';
import { updateSchedule, deleteSchedule } from '@/lib/repositories/schedules';
import { ScheduleForm } from '@/components/calendar/ScheduleForm';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { LiveBadge } from '@/components/calendar/LiveBadge';
import type { ScheduleEntry } from '@/types/entities';

/* ステータスバッジバリアントのマッピング */
type BadgeVariant = 'live' | 'muted' | 'green' | 'purple' | 'amber' | 'default';
const STATUS_BADGE: Record<string, BadgeVariant> = {
  live:      'live',
  scheduled: 'purple',
  ended:     'muted',
  cancelled: 'muted',
};
const STATUS_LABEL: Record<string, string> = {
  live:      'LIVE中',
  scheduled: '予定',
  ended:     '終了',
  cancelled: 'キャンセル',
};

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

  return (
    <div className="px-4 py-6 md:px-7 max-w-2xl">

      {/* ── ページヘッダー ─────────────────────────────────── */}
      <div className="mb-6 flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-text truncate">{schedule.title}</h2>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <LiveBadge status={schedule.status} />
            <Badge variant={STATUS_BADGE[schedule.status] ?? 'default'}>
              {STATUS_LABEL[schedule.status] ?? schedule.status}
            </Badge>
          </div>
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
            <InfoRow label="ステータス">
              <Badge variant={STATUS_BADGE[schedule.status] ?? 'default'}>
                {STATUS_LABEL[schedule.status] ?? schedule.status}
              </Badge>
            </InfoRow>
            {schedule.description && (
              <InfoRow label="説明">{schedule.description}</InfoRow>
            )}
          </dl>
        </Card>
      )}

      {/* 楽観的ロック競合モーダル */}
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
        <p className="text-muted">他のユーザーが同時に編集しました。最新版を読み込んで再度編集してください。</p>
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
