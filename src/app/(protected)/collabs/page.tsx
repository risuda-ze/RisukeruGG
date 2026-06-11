'use client';

import './collab.css';
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
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { COLLAB_STATUS_LABELS } from '@/types/entities';
import type { CollabSession, CollabStatus } from '@/types/entities';

// ステータス → CSSクラスサフィックス
const STATUS_CLASS: Record<CollabStatus, string> = {
  draft: 'prep',
  open: 'recruit',
  confirmed: 'fixed',
  expired: 'prep',
  cancelled: 'prep',
};

// アバター背景色（名前のcharCodeベース）
const AVATAR_BG = [
  { bg: '#0b2133', color: '#5ec5ea' },
  { bg: '#0b2929', color: '#5ecfcf' },
  { bg: '#1a1033', color: '#a08fe0' },
  { bg: '#281a0b', color: '#e0b05e' },
];
function avatarStyle(name: string) {
  return AVATAR_BG[(name.charCodeAt(0) ?? 0) % AVATAR_BG.length];
}

// ============================================================
// CollabBadge
// ============================================================
function CollabBadge({ status }: { status: CollabStatus }) {
  return (
    <span className={`cbbadge cbbadge--${STATUS_CLASS[status]}`}>
      <span className="cbbadge__dot" />
      <span className="cbbadge__main">{COLLAB_STATUS_LABELS[status]}</span>
    </span>
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
    <div className="cbava">
      <div className="cbava__stack">
        {visible.map((p) => {
          const s = avatarStyle(p.name);
          return (
            <div
              key={p.id}
              className="avatar"
              title={p.name}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                background: s.bg, color: s.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.72rem', fontWeight: 700, flexShrink: 0,
              }}
            >
              {p.name.slice(0, 2).toUpperCase()}
            </div>
          );
        })}
        {overflow > 0 && <div className="cbava__more">+{overflow}</div>}
      </div>
      {participants.length > 0 && (
        <span className="cbava__count">{participants.length}名</span>
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
    <div
      className={`cbrow${isFixed ? ' cbrow--fixed' : ''}`}
      onClick={() => onOpen(collab)}
    >
      <div className="cbrow__emblem">
        {isFixed ? (
          <Icon name="event_available" size={22} />
        ) : (
          <span className="material-icons" style={{ fontSize: 22 }}>
            {collab.icon ?? 'sports_esports'}
          </span>
        )}
      </div>

      <div className="cbrow__main">
        <div className="cbrow__titlerow">
          <span className="cbrow__title">{collab.title}</span>
          <CollabBadge status={collab.status} />
        </div>
        <div className="cbrow__sub">
          {collab.partnerName && <span>{collab.partnerName}</span>}
          <span>{format(collab.createdAt, 'M/d作成', { locale: ja })}</span>
        </div>
      </div>

      {participants.length > 0 && <PartyAvatars participants={participants} />}

      <div className="cbresp">
        {isFixed && collab.confirmedDate ? (
          <div className="cbresp__fixed">
            <Icon name="event_available" size={16} className="ic" />
            <span className="cbresp__fixed-d">
              {format(collab.confirmedDate, 'M/d(E) HH:mm', { locale: ja })}
            </span>
          </div>
        ) : (
          <>
            <span className="cbresp__label">回答状況</span>
            <div className="cbresp__big">
              <span className="cbresp__n">{remaining}</span>
              <span className="cbresp__unit">人未回答&nbsp;/&nbsp;{total}人</span>
            </div>
            {total > 0 && (
              <div className="cbresp__bar">
                <div className="cbresp__fill" style={{ width: `${pct}%` }} />
              </div>
            )}
          </>
        )}
      </div>

      <div className="cbrow__actions" onClick={(e) => e.stopPropagation()}>
        <button
          className="cbrow__act cbrow__act--detail"
          onClick={() => onOpen(collab)}
          title="詳細"
        >
          <Icon name="open_in_new" size={16} />
          詳細
        </button>
        <button
          className="cbrow__act cbrow__act--del"
          onClick={() => onDelete(collab)}
          title="削除"
        >
          <Icon name="delete" size={16} />
        </button>
      </div>
    </div>
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
    <div
      className={`mcbcard${isFixed ? ' mcbcard--fixed' : ''}`}
      onClick={() => onOpen(collab)}
    >
      <div className="mcbcard__top">
        <span className="mcbcard__title">{collab.title}</span>
        <CollabBadge status={collab.status} />
      </div>
      <div className="mcbcard__sub">
        {collab.partnerName && (
          <span className="mcbcard__date">
            <Icon name="groups" size={13} />
            {collab.partnerName}
          </span>
        )}
        <span className="mcbcard__date">
          <Icon name="calendar_month" size={13} />
          {format(collab.createdAt, 'M/d', { locale: ja })}
        </span>
      </div>
      {isFixed && collab.confirmedDate ? (
        <div
          className="mcbcard__foot"
          style={{ color: 'var(--success)', fontSize: '0.8rem', fontWeight: 700, gap: 6 }}
        >
          <Icon name="event_available" size={15} />
          {format(collab.confirmedDate, 'M/d(E) HH:mm', { locale: ja })}
        </div>
      ) : total > 0 ? (
        <div className="mcbcard__foot">
          <div className="mcbcard__bar">
            <div className="mcbcard__fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="mcbcard__resp">{responded}/{total}人回答</span>
          <span
            onClick={(e) => { e.stopPropagation(); onDelete(collab); }}
            style={{ marginLeft: 'auto', color: 'var(--text-muted)', cursor: 'pointer' }}
            title="削除"
          >
            <Icon name="delete" size={15} />
          </span>
        </div>
      ) : null}
    </div>
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
    <div className={`cbzone${isFixed ? ' cbzone--fixed' : ''}`}>
      <div className="cbzone__hd">
        <div className="cbzone__mark">
          {isFixed
            ? <Icon name="event_available" size={15} />
            : <span className="material-icons" style={{ fontSize: 15 }}>pending_actions</span>
          }
        </div>
        <span className="cbzone__title">{isFixed ? '予定確定' : '調整中'}</span>
        <span className="cbzone__count">{sessions.length}</span>
        {!isFixed && <span className="cbzone__desc">回答待ち・日程調整中</span>}
      </div>
      <div className="cbzone__list">
        {sessions.length === 0 ? (
          <div className="cbzone__empty">
            {isFixed
              ? <Icon name="event_available" size={18} />
              : <span className="material-icons" style={{ fontSize: 18 }}>pending_actions</span>
            }
            <span>{isFixed ? '確定したコラボはありません' : 'コラボ調整はありません'}</span>
          </div>
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

  return (
    <div className="cbboard">
      {/* コントロールバー */}
      <div className="flex items-center justify-end gap-2 px-4 md:px-7 py-2 shrink-0">
        {canEdit && (
          <Button variant="primary" size="sm" onClick={onStartNew}>
            <Icon name="add" size={16} />
            コラボ調整開始
          </Button>
        )}
        <button
          onClick={() => setHintVisible((v) => !v)}
          className="w-8 h-8 rounded-full flex items-center justify-center border border-border text-muted hover:text-text transition-colors"
          style={{ background: 'var(--surface)' }}
          aria-label="使い方を表示"
          title="使い方を表示"
        >
          <span className="text-[13px] font-bold">?</span>
        </button>
      </div>

      {/* ヒントパネル */}
      {hintVisible && (
        <div
          className="mx-4 md:mx-7 mb-2 px-4 py-3 rounded-[10px] text-[12px] shrink-0 flex items-start justify-between gap-3"
          style={{ background: 'var(--primary-950)', border: '1px solid var(--primary-800)', color: 'var(--text-secondary)' }}
        >
          <div className="flex flex-col gap-1.5">
            <span className="font-semibold" style={{ color: 'var(--text-accent)' }}>コラボ調整の使い方</span>
            <ul className="flex flex-col gap-1" style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
              <li>・「コラボ調整開始」から新しい日程調整を作成</li>
              <li>・URLをコピーして参加者に共有</li>
              <li>・参加者が日程に回答後、日程を確定できます</li>
            </ul>
          </div>
          <button
            onClick={() => setHintVisible(false)}
            className="shrink-0 text-muted hover:text-text transition-colors mt-0.5"
            aria-label="閉じる"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      {/* モバイル: ゾーン切替ピル */}
      {isMobile && (
        <div className="mtpills">
          <button
            className={`mtpill${activeZone === 'adjust' ? ' is-on' : ''}`}
            onClick={() => setActiveZone('adjust')}
          >
            <span className="mtpill__dot" style={{ background: 'var(--cb-accent)' }} />
            調整中
            <span className="mtpill__n">{adjustSessions.length}</span>
          </button>
          <button
            className={`mtpill${activeZone === 'fixed' ? ' is-on' : ''}`}
            onClick={() => setActiveZone('fixed')}
          >
            <span className="mtpill__dot" style={{ background: 'var(--success)' }} />
            予定確定
            <span className="mtpill__n">{fixedSessions.length}</span>
          </button>
        </div>
      )}

      <div className="cbscroll">
        {isMobile ? (
          // モバイル: 選択ゾーンのみカードリスト
          <div className="mtlist">
            {activeSessions.length === 0 ? (
              <div className="cbzone__empty">
                {activeZone === 'fixed'
                  ? <Icon name="event_available" size={18} />
                  : <span className="material-icons" style={{ fontSize: 18 }}>pending_actions</span>
                }
                <span>
                  {activeZone === 'fixed' ? '確定したコラボはありません' : 'コラボ調整はありません'}
                </span>
              </div>
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

    </div>
  );
}

// ============================================================
// CollabsPage
// ============================================================
export default function CollabsPage() {
  const { currentUser, currentTeam, members } = useAuthStore();
  const [sessions, setSessions] = useState<CollabSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<CollabSession | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const isMobile = useMediaQuery(768);

  const teamId = currentTeam?.id;
  const myMember = members.find((m) => m.userId === currentUser?.uid);
  const canEdit = myMember?.role === 'operator' || myMember?.role === 'member';

  // 調整中ゾーン: draft + open、予定確定ゾーン: confirmed
  const adjustSessions = sessions.filter((s) => s.status === 'draft' || s.status === 'open');
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
      <div className={`flex flex-col flex-1 overflow-hidden cb--fps${isMobile ? ' sch--mobile' : ''}`}>
        <TopBar title="コラボ調整" subtitle="コラボ相手との日程調整ができます" />
        <div className="flex-1 flex items-center justify-center text-sm p-8" style={{ color: 'var(--text-muted)' }}>
          チームに参加してからコラボ機能を利用できます
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col flex-1 overflow-hidden cb--fps${isMobile ? ' sch--mobile' : ''}`}>
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
