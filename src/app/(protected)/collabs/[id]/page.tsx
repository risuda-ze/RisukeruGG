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
import { Spinner } from '@/components/ui/Spinner';
import { COLLAB_STATUS_LABELS } from '@/types/entities';
import type { CollabSession } from '@/types/entities';

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
      <div className="flex flex-1 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-1 items-center justify-center text-zinc-500 text-sm">
        セッションが見つかりません
      </div>
    );
  }

  const responses = session.responses;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-zinc-900">{session.title}</h1>
          <Badge variant={session.status === 'confirmed' ? 'success' : session.status === 'cancelled' ? 'danger' : 'info'}>
            {COLLAB_STATUS_LABELS[session.status]}
          </Badge>
        </div>
        <p className="text-sm text-zinc-500">
          {session.partnerName}さんと ·{' '}
          期限: {format(session.expiresAt, 'M/d', { locale: ja })}まで
        </p>
      </div>

      {/* 確定日 */}
      {session.status === 'confirmed' && session.confirmedDate && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm font-medium text-green-800 mb-1">確定日時</p>
          <p className="text-lg font-bold text-green-900">
            {format(session.confirmedDate, 'M月d日(E) HH:mm', { locale: ja })}
          </p>
        </div>
      )}

      {/* 候補日程と回答状況 */}
      <div className="mb-6">
        <h2 className="text-sm font-medium text-zinc-700 mb-3">候補日程</h2>
        <div className="space-y-2">
          {session.proposedDates.map((date, index) => {
            const key = index.toString();
            const response = responses?.dates?.[key];
            return (
              <div
                key={index}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  session.status === 'open' && canEdit
                    ? 'cursor-pointer hover:bg-zinc-50 ' + (selectedDate === date.toISOString() ? 'border-blue-400 bg-blue-50' : 'border-zinc-200')
                    : 'border-zinc-200'
                }`}
                onClick={() => {
                  if (session.status === 'open' && canEdit) {
                    setSelectedDate(date.toISOString());
                  }
                }}
              >
                <span className="flex-1 text-sm">
                  {format(date, 'M月d日(E) HH:mm', { locale: ja })}
                </span>
                {response && (
                  <span className={`text-sm font-medium ${response === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
                    {response === 'ok' ? '○ OK' : '× NG'}
                  </span>
                )}
                {!response && responses && (
                  <span className="text-xs text-zinc-400">未回答</span>
                )}
              </div>
            );
          })}
        </div>
        {!responses && session.status === 'open' && (
          <p className="text-sm text-zinc-400 mt-2">まだ回答がありません</p>
        )}
      </div>

      {/* 代替日・メモ */}
      {responses && (
        <div className="mb-6 space-y-3">
          {responses.alternativeDates.length > 0 && (
            <div>
              <p className="text-sm font-medium text-zinc-700 mb-1">代替日程の提案</p>
              {responses.alternativeDates.map((d, i) => (
                <p key={i} className="text-sm text-zinc-600">
                  {format(d, 'M月d日(E) HH:mm', { locale: ja })}
                </p>
              ))}
            </div>
          )}
          {responses.note && (
            <div>
              <p className="text-sm font-medium text-zinc-700 mb-1">メモ</p>
              <p className="text-sm text-zinc-600 bg-zinc-50 rounded-lg p-3">{responses.note}</p>
            </div>
          )}
        </div>
      )}

      {/* アクション */}
      {canEdit && session.status === 'open' && (
        <div className="flex gap-3">
          <Button
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
