'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAuthStore } from '@/stores/auth';
import { subscribeCollabSessions, cancelCollabSession } from '@/lib/repositories/collabs';
import { TopBar } from '@/components/layout/TopBar';
import { CollabDetailModal } from '@/components/collab/CollabDetailModal';
import { Spinner } from '@/components/ui/Spinner';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils/cn';
import { COLLAB_STATUS_LABELS } from '@/types/entities';
import type { CollabSession, CollabStatus } from '@/types/entities';
import { canEditRole } from '@/lib/utils/teamRoles';

// ステータス → Badge の variant
const STATUS_BADGE: Record<CollabStatus, 'primary' | 'success' | 'neutral'> = {
  open: 'primary',
  confirmed: 'success',
  expired: 'neutral',
  cancelled: 'neutral',
};

// アバター配色（名前のcharCodeベース）
const AVATAR_CLASS = [
  'bg-blue-tint text-blue-text',
  'bg-teal-tint text-teal-text',
  'bg-surface-2 text-text-2',
  'bg-orange-tint text-orange-text',
];
function avatarClass(name: string) {
  return AVATAR_CLASS[(name.charCodeAt(0) || 0) % AVATAR_CLASS.length];
}

// カードの出現アニメーション
const POP_IN = 'animate-[pop-scale_var(--duration-base)_var(--ease-spring)_both]';

// ============================================================
// CollabBadge
// ============================================================
function CollabBadge({ status }: { status: CollabStatus }) {
  return (
    <Badge variant={STATUS_BADGE[status]} dot className="shrink-0">
      {COLLAB_STATUS_LABELS[status]}
    </Badge>
  );
}

// ============================================================
// PartyAvatars
// ============================================================
interface PartyAvatarsProps {
  participants: { id: string; name: string }[];
  max?: number;
}
function PartyAvatars({ participants, max = 4 }: PartyAvatarsProps) {
  const visible = participants.slice(0, max);
  const overflow = participants.length - visible.length;
  return (
    <div className="flex shrink-0 items-center">
      <div className="flex items-center">
        {visible.map((p) => (
          <div
            key={p.id}
            title={p.name}
            className={cn(
              '-ml-2 flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-border text-caption font-bold tracking-normal first:ml-0',
              avatarClass(p.name)
            )}
          >
            {p.name.slice(0, 2).toUpperCase()}
          </div>
        ))}
        {overflow > 0 && (
          <div className="-ml-2 flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-border bg-surface text-caption font-bold tracking-normal text-text-2">
            +{overflow}
          </div>
        )}
      </div>
      {participants.length > 0 && (
        <span className="ml-2 text-caption whitespace-nowrap text-text-muted">{participants.length}名</span>
      )}
    </div>
  );
}

// 回答済み参加者数を計算
function countResponded(collab: CollabSession): number {
  return Object.keys(collab.participantResponses ?? {}).filter(
    (pid) => Object.values(collab.participantResponses?.[pid] ?? {}).some((v) => v !== 'pending')
  ).length;
}

// ============================================================
// ZoneEmpty（ゾーンが空のときの表示）
// ============================================================
function ZoneEmpty({ isFixed }: { isFixed: boolean }) {
  return (
    <Card
      variant="flat"
      noPadding
      data-testid="collab-empty"
      className="flex items-center gap-2.25 p-4.5 text-sm text-text-muted"
    >
      {isFixed
        ? <Icon name="event_available" size={18} />
        : <span className="material-icons" style={{ fontSize: 18 }}>pending_actions</span>
      }
      <span>{isFixed ? '確定したコラボはありません' : 'コラボ調整はありません'}</span>
    </Card>
  );
}

// ============================================================
// CollabRow（横長カード・デスクトップ）
// ============================================================
interface CollabRowProps {
  collab: CollabSession;
  onOpen: (s: CollabSession) => void;
  onDelete: (s: CollabSession) => void;
}
function CollabRow({ collab, onOpen, onDelete }: CollabRowProps) {
  const isFixed = collab.status === 'confirmed';
  const participants = collab.participants ?? [];
  const total = participants.length;
  const responded = countResponded(collab);
  const remaining = Math.max(0, total - responded);
  const pct = total > 0 ? (responded / total) * 100 : 0;

  return (
    <Card
      accent={isFixed ? 'success' : 'primary'}
      interactive
      noPadding
      data-testid="collab-row"
      className={cn('flex items-center gap-4.5 px-4.5 py-3.75', POP_IN)}
      onClick={() => onOpen(collab)}
    >
      <div
        className={cn(
          'flex size-10.5 shrink-0 items-center justify-center rounded-md',
          isFixed ? 'bg-success-tint text-success' : 'bg-surface-2 text-brand-2'
        )}
      >
        {isFixed ? (
          <Icon name="event_available" size={22} />
        ) : (
          <span className="material-icons" style={{ fontSize: 22 }}>
            {collab.icon ?? 'sports_esports'}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span data-testid="collab-row-title" className="text-base leading-snug font-semibold text-text">
            {collab.title}
          </span>
          <CollabBadge status={collab.status} />
        </div>
        <div className="flex items-center gap-2 text-caption text-text-muted">
          {collab.partnerName && <span>{collab.partnerName}</span>}
          <span>{format(collab.createdAt, 'M/d作成', { locale: ja })}</span>
        </div>
      </div>

      {participants.length > 0 && <PartyAvatars participants={participants} />}

      <div className="flex min-w-30.5 shrink-0 flex-col items-end gap-1.25">
        {isFixed && collab.confirmedDate ? (
          <div className="inline-flex items-center gap-1.75 rounded-md border border-green-border bg-success-tint px-3 py-1.75 text-green-text">
            <Icon name="event_available" size={16} />
            <span className="font-num text-sm font-bold whitespace-nowrap">
              {format(collab.confirmedDate, 'M/d(E) HH:mm', { locale: ja })}
            </span>
          </div>
        ) : (
          <>
            <span className="eyebrow whitespace-nowrap text-text-muted">回答状況</span>
            <div className="font-num inline-flex items-baseline gap-0.75 whitespace-nowrap">
              <span className="text-xl leading-none font-bold text-brand-2">{remaining}</span>
              <span className="text-caption text-text-2">人未回答&nbsp;/&nbsp;{total}人</span>
            </div>
            {total > 0 && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.75" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="subtle"
          size="sm"
          className="gap-1.75 px-3.5"
          onClick={() => onOpen(collab)}
          title="詳細"
        >
          <Icon name="open_in_new" size={16} />
          詳細
        </Button>
        <Button
          variant="subtle"
          size="icon-sm"
          className="hover:bg-danger-tint hover:text-danger"
          onClick={() => onDelete(collab)}
          title="削除"
        >
          <Icon name="delete" size={16} />
        </Button>
      </div>
    </Card>
  );
}

// ============================================================
// MCollabCard（コンパクトカード・モバイル）
// ============================================================
function MCollabCard({ collab, onOpen, onDelete }: CollabRowProps) {
  const isFixed = collab.status === 'confirmed';
  const participants = collab.participants ?? [];
  const total = participants.length;
  const responded = countResponded(collab);
  const pct = total > 0 ? (responded / total) * 100 : 0;

  return (
    <Card
      accent={isFixed ? 'success' : 'primary'}
      interactive
      className={cn('flex flex-col gap-2.25', POP_IN)}
      onClick={() => onOpen(collab)}
    >
      <div className="flex items-start gap-2.5">
        <span className="min-w-0 flex-1 text-sm leading-snug font-semibold text-text">{collab.title}</span>
        <CollabBadge status={collab.status} />
      </div>
      <div className="flex items-center gap-2 text-caption text-text-muted">
        {collab.partnerName && (
          <span className="inline-flex items-center gap-1.25">
            <Icon name="groups" size={13} />
            {collab.partnerName}
          </span>
        )}
        <span className="inline-flex items-center gap-1.25">
          <Icon name="calendar_month" size={13} />
          {format(collab.createdAt, 'M/d', { locale: ja })}
        </span>
      </div>
      {isFixed && collab.confirmedDate ? (
        <div className="font-num flex items-center gap-1.5 text-sm font-bold text-success">
          <Icon name="event_available" size={15} />
          {format(collab.confirmedDate, 'M/d(E) HH:mm', { locale: ja })}
        </div>
      ) : total > 0 ? (
        <div className="flex items-center gap-2.5">
          <div className="h-1.25 flex-1 overflow-hidden rounded-full bg-surface">
            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
          <span className="shrink-0 text-caption whitespace-nowrap text-text-2">{responded}/{total}人回答</span>
          <span
            onClick={(e) => { e.stopPropagation(); onDelete(collab); }}
            className="ml-auto cursor-pointer text-text-muted"
            title="削除"
          >
            <Icon name="delete" size={15} />
          </span>
        </div>
      ) : null}
    </Card>
  );
}

// ============================================================
// CollabZone（デスクトップ専用。モバイルはCollabBoard内で直接レンダリング）
// ============================================================
interface CollabZoneProps {
  zone: 'adjust' | 'fixed';
  sessions: CollabSession[];
  onOpen: (s: CollabSession) => void;
  onDelete: (s: CollabSession) => void;
}
function CollabZone({ zone, sessions, onOpen, onDelete }: CollabZoneProps) {
  const isFixed = zone === 'fixed';
  return (
    <div data-testid="collab-zone" data-zone={zone} className="shrink-0">
      <div className="mb-3 flex items-center gap-2.5">
        <div
          className={cn(
            'flex size-6.5 shrink-0 items-center justify-center rounded-sm',
            isFixed ? 'bg-success-tint text-success' : 'bg-surface-2 text-brand-2'
          )}
        >
          {isFixed
            ? <Icon name="event_available" size={15} />
            : <span className="material-icons" style={{ fontSize: 15 }}>pending_actions</span>
          }
        </div>
        <span className="text-h3 whitespace-nowrap">{isFixed ? '予定確定' : '調整中'}</span>
        <Badge variant="neutral" className="font-num">{sessions.length}</Badge>
        {!isFixed && <span className="ml-auto text-sm text-text-muted">回答待ち・日程調整中</span>}
      </div>
      <div className="flex flex-col gap-3">
        {sessions.length === 0 ? (
          <ZoneEmpty isFixed={isFixed} />
        ) : (
          sessions.map((s) => (
            <CollabRow key={s.id} collab={s} onOpen={onOpen} onDelete={onDelete} />
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================
// CollabBoard
// ============================================================
interface CollabBoardProps {
  adjustSessions: CollabSession[];
  fixedSessions: CollabSession[];
  isMobile: boolean;
  canEdit: boolean;
  onOpen: (s: CollabSession) => void;
  onDelete: (s: CollabSession) => void;
  onStartNew: () => void;
}
function CollabBoard({
  adjustSessions, fixedSessions, isMobile, canEdit, onOpen, onDelete, onStartNew,
}: CollabBoardProps) {
  const [activeZone, setActiveZone] = useState<'adjust' | 'fixed'>('adjust');
  const [hintVisible, setHintVisible] = useState(false);
  const activeSessions = activeZone === 'adjust' ? adjustSessions : fixedSessions;

  // モバイルのゾーン切替ピル
  const zonePills = [
    { zone: 'adjust', label: '調整中', dot: 'bg-brand-2', count: adjustSessions.length },
    { zone: 'fixed', label: '予定確定', dot: 'bg-success', count: fixedSessions.length },
  ] as const;

  return (
    <div data-testid="collab-board" className="flex min-h-0 flex-1 flex-col overflow-hidden px-7 pt-4.5">
      {/* コントロールバー */}
      <div className="flex items-center justify-end gap-2 px-4 md:px-7 py-2 shrink-0">
        {/* PC のみ表示。モバイルの作成導線は下部 FAB（タスク画面と同型）に集約 */}
        {canEdit && !isMobile && (
          <Button variant="primary" size="sm" onClick={onStartNew}>
            <Icon name="add" size={16} />
            コラボ調整開始
          </Button>
        )}
        <button
          onClick={() => setHintVisible((v) => !v)}
          className="w-8 h-8 rounded-full flex items-center justify-center border border-border bg-surface text-text-muted hover:text-text transition-colors"
          aria-label="使い方を表示"
          title="使い方を表示"
        >
          <span className="text-[13px] font-bold">?</span>
        </button>
      </div>

      {/* ヒントパネル */}
      {hintVisible && (
        <div className="mx-4 md:mx-7 mb-2 px-4 py-3 rounded-md border border-border bg-surface-2 text-caption text-text-2 shrink-0 flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="font-semibold text-brand-2">コラボ調整の使い方</span>
            <ul className="flex flex-col gap-1 text-text-muted">
              <li>・「コラボ調整開始」から新しい日程調整を作成</li>
              <li>・URLをコピーして参加者に共有</li>
              <li>・参加者が日程に回答後、日程を確定できます</li>
            </ul>
          </div>
          <button
            onClick={() => setHintVisible(false)}
            className="shrink-0 text-text-muted hover:text-text transition-colors mt-0.5"
            aria-label="閉じる"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      {/* モバイル: ゾーン切替ピル */}
      {isMobile && (
        <div data-testid="collab-zone-tabs" className="flex shrink-0 gap-2 px-4 pt-3">
          {zonePills.map((p) => {
            const isOn = activeZone === p.zone;
            return (
              <button
                key={p.zone}
                className={cn(
                  'inline-flex min-h-11 cursor-pointer items-center gap-1.75 rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-(--duration-fast) ease-out',
                  isOn
                    ? 'border-primary bg-surface-2 text-text'
                    : 'border-border bg-surface text-text-2 hover:bg-surface-2 hover:text-text'
                )}
                onClick={() => setActiveZone(p.zone)}
              >
                <span className={cn('size-2 shrink-0 rounded-xs', p.dot)} />
                {p.label}
                <span
                  className={cn(
                    'font-num flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-caption font-bold',
                    isOn ? 'bg-card text-text' : 'bg-surface-2 text-text-2'
                  )}
                >
                  {p.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-5.5 overflow-y-auto pb-4.5">
        {isMobile ? (
          // モバイル: 選択ゾーンのみカードリスト。下端余白はモバイル FAB とボトムナビのクリアランス
          <div className="flex flex-col gap-2.5 px-4 pt-3 pb-24">
            {activeSessions.length === 0 ? (
              <ZoneEmpty isFixed={activeZone === 'fixed'} />
            ) : (
              activeSessions.map((s) => (
                <MCollabCard key={s.id} collab={s} onOpen={onOpen} onDelete={onDelete} />
              ))
            )}
          </div>
        ) : (
          // デスクトップ: 2ゾーン縦並び
          <>
            <CollabZone
              zone="adjust"
              sessions={adjustSessions}
              onOpen={onOpen}
              onDelete={onDelete}
            />
            <CollabZone
              zone="fixed"
              sessions={fixedSessions}
              onOpen={onOpen}
              onDelete={onDelete}
            />
          </>
        )}
      </div>

      {/* モバイル固定 FAB: コラボ作成（タスク画面の FAB と同型・同位置） */}
      {canEdit && isMobile && (
        <button
          onClick={onStartNew}
          className="fixed right-4 bottom-20 z-10 flex h-11 items-center gap-2 rounded-full bg-primary px-4 text-[13px] font-semibold text-text-on-primary transition-colors duration-(--duration-instant) hover:bg-primary-hover active:bg-primary-active"
          aria-label="コラボ作成"
        >
          <Icon name="add" size={16} />
          コラボ作成
        </button>
      )}
    </div>
  );
}

// ============================================================
// CollabsPage
// ============================================================
export default function CollabsPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const currentTeam = useAuthStore((s) => s.currentTeam);
  const members = useAuthStore((s) => s.members);
  const [sessions, setSessions] = useState<CollabSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<CollabSession | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const isMobile = useMediaQuery(768);

  const teamId = currentTeam?.id;
  const myMember = members.find((m) => m.userId === currentUser?.uid);
  const canEdit = canEditRole(myMember?.role);

  // 調整中ゾーン: open、予定確定ゾーン: confirmed
  const adjustSessions = sessions.filter((s) => s.status === 'open');
  const fixedSessions = sessions.filter((s) => s.status === 'confirmed');

  useEffect(() => {
    if (!teamId) return;
    return subscribeCollabSessions(teamId, (data) => {
      setSessions(data);
      setLoading(false);
    });
  }, [teamId]);

  async function handleDelete(session: CollabSession) {
    if (!teamId || processingId) return;
    const ok = window.confirm(`「${session.title}」を削除しますか？`);
    if (!ok) return;
    setProcessingId(session.id);
    try {
      await cancelCollabSession({ teamId, sessionId: session.id });
    } finally {
      setProcessingId(null);
    }
  }

  function handleStartNew() {
    setShowNewModal(true);
  }

  function handleCloseModal() {
    setSelectedSession(null);
    setShowNewModal(false);
  }

  if (!teamId) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar title="コラボ調整" subtitle="コラボ相手との日程調整ができます" />
        <div className="flex-1 flex items-center justify-center text-sm p-8 text-text-muted">
          チームに参加してからコラボ機能を利用できます
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="コラボ調整" subtitle="コラボ相手との日程調整ができます" />
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <CollabBoard
          adjustSessions={adjustSessions}
          fixedSessions={fixedSessions}
          isMobile={isMobile}
          canEdit={canEdit}
          onOpen={setSelectedSession}
          onDelete={handleDelete}
          onStartNew={handleStartNew}
        />
      )}

      {(selectedSession !== null || showNewModal) && (
        <CollabDetailModal
          session={selectedSession}
          canEdit={canEdit}
          onClose={handleCloseModal}
          onDeleted={handleCloseModal}
          onSaved={handleCloseModal}
          onReopen={handleCloseModal}
          onDuplicate={() => {}}
        />
      )}
    </div>
  );
}
