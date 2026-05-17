'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAuthStore } from '@/stores/auth';
import {
  subscribeCollabSessions,
  confirmCollabDate,
  cancelCollabSession,
} from '@/lib/repositories/collabs';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { COLLAB_STATUS_LABELS } from '@/types/entities';
import type { CollabSession } from '@/types/entities';

type BadgeVariant = 'purple' | 'amber' | 'live' | 'green' | 'muted' | 'default';
const STATUS_BADGE: Record<string, BadgeVariant> = {
  open: 'purple',
  confirmed: 'green',
  expired: 'muted',
  cancelled: 'live',
};

export default function CollabDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const { currentUser, currentTeam, members } = useAuthStore();
  const [session, setSession] = useState<CollabSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const teamId = currentTeam?.id;
  const myMember = members.find((m) => m.userId === currentUser?.uid);
  const canEdit = myMember?.role === 'owner' || myMember?.role === 'editor';

  useEffect(() => {
    if (!teamId) return;
    const unsub = subscribeCollabSessions(teamId, (sessions) => {
      const found = sessions.find((s) => s.id === sessionId);
      setSession(found ?? null);
      setLoading(false);
    });
    return unsub;
  }, [teamId, sessionId]);

  async function handleConfirm() {
    if (!selectedDate || !teamId) return;
    setConfirming(true);
    try {
      await confirmCollabDate({ teamId, sessionId, confirmedDate: selectedDate });
    } finally {
      setConfirming(false);
    }
  }

  async function handleCancel() {
    if (!teamId || !confirm('このコラボ調整をキャンセルしますか？')) return;
    setCancelling(true);
    try {
      await cancelCollabSession({ teamId, sessionId });
      router.push('/collabs');
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-bg">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted text-sm">
        セッションが見つかりません
      </div>
    );
  }

  const responses = session.responses;

  return (
    <div className="px-4 py-6 md:px-7 max-w-2xl">
      {/* ── ページヘッダー ─────────────────────────────────── */}
      <div className="flex items-start gap-3 mb-6 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h2 className="text-base font-semibold text-text">{session.title}</h2>
            <Badge variant={STATUS_BADGE[session.status] ?? 'default'}>
              {COLLAB_STATUS_LABELS[session.status]}
            </Badge>
          </div>
          <p className="text-[11px] text-muted font-num">
            {session.partnerName}さんと · 期限: {format(session.expiresAt, 'M/d', { locale: ja })}
            まで
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/collabs')}
          aria-label="一覧へ戻る"
        >
          ← 一覧
        </Button>
      </div>

      {/* 確定日表示 */}
      {session.status === 'confirmed' && session.confirmedDate && (
        <div className="mb-5 bg-green/10 border border-green/30 rounded-[12px] p-4">
          <p className="text-[11px] font-medium text-green mb-0.5">確定日時</p>
          <p className="text-base font-bold text-text">
            {format(session.confirmedDate, 'M月d日(E) HH:mm', { locale: ja })}
          </p>
        </div>
      )}

      {/* 候補日程 */}
      <Card noPadding className="mb-4">
        <CardHeader title="候補日程" />
        <div className="p-4 space-y-2">
          {session.proposedDates.map((date, index) => {
            const key = index.toString();
            const response = responses?.dates?.[key];
            const isSelected = selectedDate === date.toISOString();
            return (
              <div
                key={index}
                className={`flex items-center gap-3 p-3 rounded-[8px] border transition-colors ${
                  session.status === 'open' && canEdit
                    ? `cursor-pointer ${isSelected ? 'border-purple bg-purple/8' : 'border-border hover:border-purple/40'}`
                    : 'border-border'
                }`}
                onClick={() => {
                  if (session.status === 'open' && canEdit) setSelectedDate(date.toISOString());
                }}
              >
                <span className="flex-1 text-sm text-text">
                  {format(date, 'M月d日(E) HH:mm', { locale: ja })}
                </span>
                {response ? (
                  <span
                    className={`text-[11px] font-medium ${response === 'ok' ? 'text-green' : 'text-live'}`}
                  >
                    {response === 'ok' ? '○ OK' : '× NG'}
                  </span>
                ) : responses ? (
                  <span className="text-[11px] text-muted">未回答</span>
                ) : null}
              </div>
            );
          })}
          {!responses && session.status === 'open' && (
            <p className="text-[11px] text-muted">まだ回答がありません</p>
          )}
        </div>
      </Card>

      {/* 代替日・メモ */}
      {responses && (responses.alternativeDates.length > 0 || responses.note) && (
        <Card className="mb-4">
          {responses.alternativeDates.length > 0 && (
            <div className="mb-3">
              <p className="text-[11px] font-medium text-muted mb-1">代替日程の提案</p>
              {responses.alternativeDates.map((d, i) => (
                <p key={i} className="text-sm text-text font-num">
                  {format(d, 'M月d日(E) HH:mm', { locale: ja })}
                </p>
              ))}
            </div>
          )}
          {responses.note && (
            <div>
              <p className="text-[11px] font-medium text-muted mb-1">メモ</p>
              <p className="text-sm text-text">{responses.note}</p>
            </div>
          )}
        </Card>
      )}

      {/* アクション */}
      {canEdit && session.status === 'open' && (
        <div className="flex gap-3 flex-wrap">
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={!selectedDate}
            loading={confirming}
          >
            選択した日程で確定する
          </Button>
          <Button variant="danger" onClick={handleCancel} loading={cancelling}>
            キャンセル
          </Button>
        </div>
      )}
    </div>
  );
}
