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
import { Avatar } from '@/components/ui/Avatar';
import CollabForm from '@/components/collab/CollabForm';
import { COLLAB_STATUS_LABELS, LIGHT_PLAN_LIMITS } from '@/types/entities';
import type { CollabSession } from '@/types/entities';

/* ステータス → バッジバリアント */
type BadgeVariant = 'purple' | 'amber' | 'live' | 'green' | 'muted' | 'default';
const STATUS_BADGE: Record<string, BadgeVariant> = {
  open:      'purple',
  confirmed: 'green',
  expired:   'muted',
  cancelled: 'live',
};

/* ステータスタブ定義 */
const STATUS_TABS = [
  { value: 'open',      label: '返答待ち' },
  { value: 'confirmed', label: '確定済み' },
  { value: 'expired',   label: '期限切れ' },
  { value: 'cancelled', label: 'キャンセル' },
] as const;

type StatusFilter = typeof STATUS_TABS[number]['value'] | 'all';

export default function CollabsPage() {
  const { currentUser, currentTeam, members } = useAuthStore();
  const [sessions, setSessions] = useState<CollabSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createdShareUrl, setCreatedShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<StatusFilter>('open');

  const teamId = currentTeam?.id;
  const myMember = members.find((m) => m.userId === currentUser?.uid);
  const canEdit = myMember?.role === 'owner' || myMember?.role === 'editor';

  const myCollabCount = sessions.filter((s) => s.createdBy === currentUser?.uid).length;
  const isLightPlanFull =
    myMember?.plan === 'light' && myCollabCount >= LIGHT_PLAN_LIMITS.monthlyCollabs;

  const filtered = sessions.filter((s) => s.status === activeTab);

  useEffect(() => {
    if (!teamId) return;
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
      <div className="flex flex-1 items-center justify-center text-muted text-sm px-4">
        チームに参加してからコラボ機能を利用できます
      </div>
    );
  }

  return (
    <div className="px-4 py-6 md:px-7 max-w-3xl">

      {/* ── ページヘッダー ─────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5 gap-3">
        <h2 className="text-base font-semibold text-text">コラボ調整</h2>
        {canEdit && (
          <Button variant="amber" size="sm" onClick={() => setShowCreate(true)} disabled={isLightPlanFull}>
            + 打診する
          </Button>
        )}
      </div>

      {/* ── ステータスタブ ─────────────────────────────────── */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-none">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab.value
                ? 'bg-purple-d text-purple-l'
                : 'bg-surface border border-border text-muted hover:text-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── リスト ─────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-muted text-sm py-16">
          {activeTab === 'open' ? 'コラボ打診はありません' : 'データがありません'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((session) => {
            const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/collab/${teamId}__${session.id}`;
            const initials = session.partnerName.slice(0, 2).toUpperCase();
            return (
              <div
                key={session.id}
                className="bg-card border border-border rounded-[12px] p-4 flex items-center gap-3"
              >
                <Avatar initials={initials} bgClass="bg-amber-d/30" textClass="text-amber-l" size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <Link
                      href={`/collabs/${session.id}`}
                      className="text-sm font-medium text-text hover:text-purple-l transition-colors truncate"
                    >
                      {session.title}
                    </Link>
                    <Badge variant={STATUS_BADGE[session.status] ?? 'default'}>
                      {COLLAB_STATUS_LABELS[session.status]}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted font-num">
                    {session.partnerName}さんと · {format(session.createdAt, 'M/d', { locale: ja })}作成
                  </p>
                </div>
                {session.status === 'open' && (
                  <button
                    onClick={() => copyUrl(shareUrl)}
                    className="shrink-0 text-[11px] px-3 py-1.5 rounded-[8px] border border-border text-muted hover:text-text hover:bg-surface transition-colors"
                    aria-label="URLをコピー"
                  >
                    {copied ? '✓ コピー済み' : 'URLコピー'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* コラボ作成モーダル */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="コラボ日程調整を作成">
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

      {/* 作成完了モーダル（URLコピー） */}
      <Modal
        open={Boolean(createdShareUrl)}
        onClose={() => setCreatedShareUrl(null)}
        title="コラボURLを共有しましょう"
        footer={
          <Button variant="secondary" onClick={() => setCreatedShareUrl(null)}>閉じる</Button>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-muted">以下のURLをコラボ相手に送ってください:</p>
          <div className="bg-surface border border-border rounded-[8px] p-3 break-all text-[12px] font-num text-text">
            {createdShareUrl}
          </div>
          <Button variant="amber" className="w-full" onClick={() => {
            if (createdShareUrl) copyUrl(createdShareUrl);
          }}>
            {copied ? '✓ コピーしました' : 'URLをコピーする'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
