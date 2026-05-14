'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAuthStore } from '@/stores/auth';
import { subscribeCollabSessions } from '@/lib/repositories/collabs';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import CollabForm from '@/components/collab/CollabForm';
import { COLLAB_STATUS_LABELS, LIGHT_PLAN_LIMITS } from '@/types/entities';
import type { CollabSession } from '@/types/entities';

const STATUS_BADGE_VARIANT = {
  open: 'info',
  confirmed: 'success',
  expired: 'default',
  cancelled: 'danger',
} as const;

export default function CollabsPage() {
  const { currentUser, currentTeam, members } = useAuthStore();
  const [sessions, setSessions] = useState<CollabSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createdShareUrl, setCreatedShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const teamId = currentTeam?.id;
  const myMember = members.find((m) => m.userId === currentUser?.uid);
  const canEdit = myMember?.role === 'owner' || myMember?.role === 'editor';

  const myCollabCount = sessions.filter((s) => s.createdBy === currentUser?.uid).length;
  const isLightPlanFull =
    myMember?.plan === 'light' && myCollabCount >= LIGHT_PLAN_LIMITS.monthlyCollabs;

  useEffect(() => {
    if (!teamId) return;
    setLoading(true);
    const unsub = subscribeCollabSessions(teamId, (data) => {
      setSessions(data);
      setLoading(false);
    });
    return unsub;
  }, [teamId]);

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!teamId) {
    return (
      <div className="flex flex-1 items-center justify-center text-zinc-500 text-sm">
        チームに参加してからコラボ機能を利用できます
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">コラボ日程調整</h1>
        {canEdit && (
          <Button onClick={() => setShowCreate(true)} disabled={isLightPlanFull}>
            + コラボを作成
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center text-zinc-500 text-sm py-16">
          コラボ調整はまだありません
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/collab/${teamId}__${session.id}`;
            return (
              <div
                key={session.id}
                className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      href={`/collabs/${session.id}`}
                      className="text-sm font-medium text-zinc-900 hover:underline truncate"
                    >
                      {session.title}
                    </Link>
                    <Badge variant={STATUS_BADGE_VARIANT[session.status]}>
                      {COLLAB_STATUS_LABELS[session.status]}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {session.partnerName}さんと ·{' '}
                    {format(session.createdAt, 'M/d', { locale: ja })}作成
                  </p>
                </div>
                <button
                  onClick={() => copyUrl(shareUrl)}
                  className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
                  aria-label="URLをコピー"
                >
                  {copied ? '✓ コピー済み' : 'URLをコピー'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* コラボ作成モーダル */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="コラボ日程調整を作成"
      >
        <CollabForm
          teamId={teamId}
          isLightPlanFull={isLightPlanFull}
          onSuccess={(url) => {
            setShowCreate(false);
            setCreatedShareUrl(url);
          }}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>

      {/* 作成完了モーダル */}
      <Modal
        open={Boolean(createdShareUrl)}
        onClose={() => setCreatedShareUrl(null)}
        title="コラボURLを共有しましょう"
        footer={
          <Button onClick={() => setCreatedShareUrl(null)}>閉じる</Button>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-zinc-600">以下のURLをコラボ相手に送ってください:</p>
          <div className="bg-zinc-50 rounded-lg p-3 break-all text-sm font-mono text-zinc-800">
            {createdShareUrl}
          </div>
          <Button
            className="w-full"
            onClick={() => {
              if (createdShareUrl) copyUrl(createdShareUrl);
            }}
          >
            {copied ? '✓ コピーしました' : 'URLをコピーする'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
