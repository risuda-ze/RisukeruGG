'use client';

import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  confirmCollabDate,
  cancelCollabSession,
  updateCollabSession,
  updateCollabSessionIfUnchanged,
  reopenCollabSession,
  createCollabSessionDraft,
} from '@/lib/repositories/collabs';
import { trackEvent } from '@/lib/analytics';
import { useAuthStore } from '@/stores/auth';
import { Icon } from '@/components/ui/Icon';
import { DialogShell } from '@/components/ui/Dialog';
import { COLLAB_STATUS_LABELS } from '@/types/entities';
import type { CollabSession, CollabParticipant } from '@/types/entities';
import { buildCollabSavePayload } from '@/lib/collab/savePayload';
import { buildResponseRows, respondentNameResolver, type ResponseMark } from '@/lib/collab/responseRows';
import { firebaseFunctionsErrorMessage } from '@/lib/firebase/errors';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useModalDrag } from '@/hooks/useModalDrag';
import { DateField } from '@/components/ui/DateField';

interface CollabDetailModalProps {
  session: CollabSession | null;
  canEdit: boolean;
  onClose: () => void;
  onDeleted: () => void;
  onSaved?: () => void;
  onReopen?: () => void;
  onDuplicate?: (session: CollabSession) => void;
}

/* コラボアイコン候補 */
const COLLAB_ICONS = [
  'sports_esports', 'live_tv', 'mic', 'handshake', 'music_note',
  'movie', 'star', 'group', 'campaign', 'video_library', 'celebration',
];

/* アバター背景色 */
const AVATAR_COLORS = [
  { bg: 'color-mix(in oklab, var(--primary) 35%, transparent)', text: 'var(--brand-2)' },
  { bg: 'rgba(74,222,128,0.2)', text: '#4ade80' },
  { bg: 'rgba(239,159,39,0.2)', text: 'var(--orange-text)' },
  { bg: 'linear-gradient(135deg,#3a1a6a,#6a2a9a)', text: '#cc88ff' },
  { bg: 'rgba(127,119,221,0.2)', text: 'var(--brand-2)' },
];
function avatarStyle(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

/* ステータスバッジ */
function StatusBadge({ status }: { status: CollabSession['status'] }) {
  const label = COLLAB_STATUS_LABELS[status];
  if (status === 'open') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border"
        style={{ background: 'var(--danger-tint)', color: 'var(--live)', borderColor: 'rgba(255,77,109,0.3)' }}
      >
        ⏳ {label}
      </span>
    );
  }
  if (status === 'confirmed') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border"
        style={{ background: 'rgba(74,222,128,0.15)', color: 'var(--success)', borderColor: 'rgba(74,222,128,0.3)' }}
      >
        ✓ {label}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border"
      style={{ background: 'color-mix(in oklab, var(--primary) 8%, transparent)', color: 'var(--text-muted)', borderColor: 'var(--border)' }}
    >
      {label}
    </span>
  );
}

/* 回答状況集計アイコン（ホバーでツールチップ） */
function ResponseAggregate({
  icon,
  iconClass,
  count,
  names,
}: {
  icon: string;
  iconClass: string;
  count: number;
  names: string[];
}) {
  return (
    <div className="relative group flex items-center gap-1 cursor-default">
      <span className={`material-icons text-[18px] ${iconClass}`}>{icon}</span>
      <span
        className="text-[13px] font-bold font-num"
        style={{ color: count === 0 ? 'var(--text-muted)' : 'var(--text-2)' }}
      >
        {count}
      </span>
      {names.length > 0 && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-[6px] text-[11px] whitespace-nowrap pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
        >
          {names.join(', ')}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 -mt-px"
            style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '4px solid var(--border)' }}
          />
        </div>
      )}
    </div>
  );
}

/* 回答の印（集計と同じアイコン・色。色だけに頼らないよう文言も付ける） */
const RESPONSE_MARKS = {
  ok: { icon: 'check_circle', iconClass: 'text-success', label: 'OK' },
  ng: { icon: 'cancel', iconClass: 'text-live', label: 'NG' },
  pending: { icon: 'help', iconClass: 'text-warning', label: '未定' },
} as const;

/* 回答者 1 人の、候補日程 1 件に対する回答。ok / ng / pending 以外は「—」 */
function ResponseMarkLabel({ mark }: { mark: ResponseMark }) {
  if (!mark) return <span className="text-[13px] text-text-muted">—</span>;
  const { icon, iconClass, label } = RESPONSE_MARKS[mark];
  return (
    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-text-2">
      <span className={`material-icons text-[16px] ${iconClass}`} aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}

export function CollabDetailModal({
  session,
  canEdit,
  onClose,
  onDeleted,
  onSaved,
  onReopen,
  onDuplicate,
}: CollabDetailModalProps) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const currentTeam = useAuthStore((s) => s.currentTeam);
  const members = useAuthStore((s) => s.members);
  const teamId = currentTeam?.id ?? '';
  const isNew = session === null;
  const isOpen = session?.status === 'open' || false;
  const canEditInPlace = (isNew || isOpen) && canEdit;
  const isMobile = useMediaQuery(767);

  /* メンバーIDからアバターURLを取得するヘルパー */
  function memberAvatarUrl(userId: string) {
    return members.find((m) => m.userId === userId)?.avatarUrl ?? null;
  }

  /* アイコン */
  const [iconValue, setIconValue] = useState(session?.icon ?? 'sports_esports');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [statusValue, setStatusValue] = useState<CollabSession['status']>(session?.status ?? 'open');

  /* タイトル編集 */
  const [editingTitle, setEditingTitle] = useState(isNew);
  const [titleValue, setTitleValue] = useState(session?.title ?? '');

  /* 内容編集 */
  const [editingContent, setEditingContent] = useState(false);
  const [contentValue, setContentValue] = useState(session?.content ?? '');

  /* 参加者 */
  const [participants, setParticipants] = useState<CollabParticipant[]>(session?.participants ?? []);
  const [externalName, setExternalName] = useState('');
  const [showMemberPicker, setShowMemberPicker] = useState(false);

  /* 候補日程 */
  const [proposedDates, setProposedDates] = useState<Date[]>(session?.proposedDates ?? []);
  const [participantResponses, setParticipantResponses] = useState(session?.participantResponses ?? {});
  const [showAddDate, setShowAddDate] = useState(false);
  const [newDateValue, setNewDateValue] = useState<Date | null>(null);

  /* 候補日程の複数選択（承諾） */
  const [selectedDateIdxs, setSelectedDateIdxs] = useState<number[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [copied, setCopied] = useState(false);

  /* 候補日程の編集 */
  const [editingDateIndex, setEditingDateIndex] = useState<number | null>(null);
  const [editDateValue, setEditDateValue] = useState<Date | null>(null);

  /* 再調整の確認ダイアログ */
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);
  const [reopening, setReopening] = useState(false);

  /* 変更を確定ボタン */
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  /* 保存・調整を確定・削除・再調整の失敗（CO-031） */
  const [actionError, setActionError] = useState<string | null>(null);
  /* 調整を確定で保存だけ済んだ。自分の保存で updatedAt が変わり、この画面から保存し直すと必ず競合になるため、保存・確定を止めて開き直してもらう */
  const [savedBeforeConfirmFailed, setSavedBeforeConfirmFailed] = useState(false);
  const shareUrl = !isNew && typeof window !== 'undefined'
    ? `${window.location.origin}/collab/${teamId}__${session!.id}`
    : '';

  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingTitle) titleRef.current?.focus();
  }, [editingTitle]);
  useEffect(() => {
    if (editingContent) contentRef.current?.focus();
  }, [editingContent]);

  /* アイコンピッカー外クリックで閉じる */
  useEffect(() => {
    if (!showIconPicker) return;
    function handleClick() { setShowIconPicker(false); }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showIconPicker]);

  /* タイトル編集終了（永続化はフッターの保存ボタンで行う） */
  function saveTitle() {
    setEditingTitle(false);
  }

  /* 内容編集の開始・完了・キャンセル（キャンセル時は編集前の値に復元） */
  const contentBeforeEdit = useRef('');
  function startEditContent() {
    contentBeforeEdit.current = contentValue;
    setEditingContent(true);
  }
  function saveContent() {
    setEditingContent(false);
  }
  function cancelEditContent() {
    setContentValue(contentBeforeEdit.current);
    setEditingContent(false);
  }

  /*
   * ローカル編集内容を Firestore へ書き込む（CO-032）。未編集のフィールドは書かない。
   * 候補日程・回答を書くときは、開いた後に届いた回答を開いた時点の値で上書きしないよう、
   * updatedAt が開いた時点と同じときだけ書く（違えば Error('CONFLICT')）。
   */
  async function persistLocalChanges() {
    const { payload, needsLock } = buildCollabSavePayload(session!, {
      title: titleValue,
      content: contentValue,
      icon: iconValue,
      participants,
      proposedDates,
      participantResponses,
    });
    if (needsLock) {
      await updateCollabSessionIfUnchanged(teamId, session!.id, payload, session!.updatedAt, currentUser?.uid);
    } else {
      await updateCollabSession(teamId, session!.id, payload, currentUser?.uid);
    }
  }

  /* 保存（Firestore への直接の書き込み）の失敗の文言（CO-032） */
  function saveErrorMessage(err: unknown) {
    return err instanceof Error && err.message === 'CONFLICT'
      ? '開いている間にこのコラボが更新されました。開き直してから編集してください'
      : '保存に失敗しました。時間をおいて再度お試しください';
  }

  /* 変更をまとめてFirestoreに保存し、完了後モーダルを閉じる */
  async function handleSaveChanges() {
    if (isNew || saving) return;
    setSaving(true);
    setActionError(null);
    try {
      await persistLocalChanges();
      onSaved?.();
      onClose();
    } catch (err) {
      setActionError(saveErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  /* 新規セッション作成 */
  async function handleCreate() {
    if (!currentUser || !teamId) return;
    const title = titleValue.trim();
    if (!title) { setCreateError('タイトルを入力してください'); return; }
    if (participants.length === 0) { setCreateError('参加者を1人以上追加してください'); return; }
    if (proposedDates.length === 0) { setCreateError('候補日程を1件以上追加してください'); return; }
    setCreating(true);
    setCreateError(null);
    try {
      await createCollabSessionDraft(teamId, {
        title,
        content: contentValue.trim() || undefined,
        participants,
        proposedDates,
        icon: iconValue,
      });
      onSaved?.();
      onClose();
    } catch (err) {
      // Functions の "internal" を素通しせず、code に応じた日本語メッセージへ変換
      setCreateError(firebaseFunctionsErrorMessage(err, '作成に失敗しました'));
    } finally {
      setCreating(false);
    }
  }

  /* 候補日程の選択トグル */
  function toggleDateSelection(i: number) {
    setSelectedDateIdxs((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
    );
  }

  /* 参加者: チームメンバー追加（ローカル状態のみ。保存ボタンで永続化） */
  function addMember(memberId: string, name: string) {
    if (participants.some((p) => p.id === memberId)) return;
    setParticipants([...participants, { id: memberId, name, type: 'member' as const }]);
    setShowMemberPicker(false);
  }

  /* 参加者: 外部追加（ローカル状態のみ） */
  function addExternal() {
    if (!externalName.trim()) return;
    setParticipants([
      ...participants,
      { id: `ext_${Date.now()}`, name: externalName.trim(), type: 'external' as const },
    ]);
    setExternalName('');
  }

  /* 参加者: 削除（ローカル状態のみ） */
  function removeParticipant(id: string) {
    setParticipants(participants.filter((p) => p.id !== id));
  }

  /* 回答状況の集計 */
  function getDateAggregates(dateIndex: number) {
    const resolve = respondentNameResolver(participants);
    const ok: string[] = [];
    const ng: string[] = [];
    const pending: string[] = [];
    for (const [key, responses] of Object.entries(participantResponses)) {
      const resp = responses[dateIndex.toString()];
      if (resp === 'ok') ok.push(resolve(key));
      else if (resp === 'ng') ng.push(resolve(key));
      else if (resp === 'pending') pending.push(resolve(key));
    }
    return { okNames: ok, ngNames: ng, pendingNames: pending };
  }

  /*
   * 「回答」の欄の行。集計と同じく、モーダルを開いた時点の値（ローカル state と session.comments）を使う。
   * 開いている間に届いた回答は、開き直すと表示される。
   */
  const responseRows = isNew
    ? []
    : buildResponseRows({ participants, proposedDates, participantResponses, comments: session!.comments ?? [] });

  /* 候補日程を追加（ローカル状態のみ。保存ボタンで永続化） */
  function handleAddDate() {
    if (!newDateValue) return;
    setProposedDates((prev) => [...prev, newDateValue]);
    setNewDateValue(null);
    setShowAddDate(false);
  }

  /* 日程確定（確定後モーダルが閉じるため、未保存のローカル編集を先に永続化する） */
  async function handleConfirm() {
    if (selectedDateIdxs.length === 0 || !teamId || isNew) return;
    const idx = selectedDateIdxs[0];
    setConfirming(true);
    setActionError(null);
    try {
      await persistLocalChanges();
    } catch (err) {
      setActionError(saveErrorMessage(err));
      setConfirming(false);
      return;
    }
    try {
      await confirmCollabDate({
        teamId,
        sessionId: session!.id,
        confirmedDate: proposedDates[idx].toISOString(),
      });
      trackEvent('collab_confirm');
      onClose();
    } catch (err) {
      setSavedBeforeConfirmFailed(true);
      setActionError(
        `変更は保存しました。調整の確定に失敗しました（${firebaseFunctionsErrorMessage(err, '確定に失敗しました')}）。開き直してから確定してください`
      );
    } finally {
      setConfirming(false);
    }
  }

  /* 削除 */
  async function handleCancel() {
    if (!confirm('このコラボ調整を削除しますか？')) return;
    setCancelling(true);
    setActionError(null);
    try {
      await cancelCollabSession({ teamId, sessionId: session!.id });
      onDeleted();
    } catch (err) {
      setActionError(firebaseFunctionsErrorMessage(err, '削除に失敗しました'));
    } finally {
      setCancelling(false);
    }
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  /* 候補日程を編集（ローカル状態のみ。保存ボタンで永続化） */
  function handleEditDate(originalIndex: number, dateValue: Date | null) {
    if (!dateValue) return;
    setProposedDates((prev) => prev.map((d, i) => (i === originalIndex ? dateValue : d)));
    setEditingDateIndex(null);
    setEditDateValue(null);
  }

  /* 削除時に participantResponses のインデックスを再マッピング */
  function remapParticipantResponses(
    responses: Record<string, Record<string, 'ok' | 'ng' | 'maybe' | 'pending'>>,
    deletedIndex: number
  ): Record<string, Record<string, 'ok' | 'ng' | 'maybe' | 'pending'>> {
    const result: Record<string, Record<string, 'ok' | 'ng' | 'maybe' | 'pending'>> = {};
    for (const [respondent, dateResponses] of Object.entries(responses)) {
      const newDateResponses: Record<string, 'ok' | 'ng' | 'maybe' | 'pending'> = {};
      for (const [idx, val] of Object.entries(dateResponses)) {
        const n = parseInt(idx, 10);
        if (n === deletedIndex) continue;
        newDateResponses[(n > deletedIndex ? n - 1 : n).toString()] = val;
      }
      result[respondent] = newDateResponses;
    }
    return result;
  }

  /* 候補日程を削除（ローカル状態のみ。回答インデックスも再マッピングして整合を保つ） */
  function handleDeleteDate(originalIndex: number) {
    const newDates = proposedDates.filter((_, i) => i !== originalIndex);
    const newResponses = remapParticipantResponses(participantResponses, originalIndex);
    setProposedDates(newDates);
    setParticipantResponses(newResponses);
    /* 承諾選択リストからも除去してインデックスを調整 */
    setSelectedDateIdxs((prev) =>
      prev.filter((i) => i !== originalIndex).map((i) => (i > originalIndex ? i - 1 : i))
    );
  }

  /* 確定済みコラボを再調整状態に戻す */
  async function handleReopen() {
    if (isNew) return;
    setReopening(true);
    setActionError(null);
    try {
      await reopenCollabSession({ teamId, sessionId: session!.id });
      onReopen?.();
      onClose();
    } catch (err) {
      setActionError(firebaseFunctionsErrorMessage(err, '再調整に失敗しました'));
    } finally {
      setReopening(false);
      setShowReopenConfirm(false);
    }
  }

  const availableMembers = members.filter((m) => !participants.some((p) => p.id === m.userId));


  /* ── ドラッグ移動 ─────────────────────────────── */
  const { position, handleDragStart } = useModalDrag();

  return (
    <DialogShell
      onClose={onClose}
      label="コラボの詳細"
      data-testid="collab-detail-modal"
      // モバイルは下寄せの全幅シート、PC は 720px のリサイズ可能なカード
      className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-lg border border-border bg-card md:h-[min(720px,calc(100vh-32px))] md:max-h-[calc(100vh-32px)] md:min-h-[400px] md:w-[min(720px,calc(100vw-32px))] md:min-w-[540px] md:resize md:rounded-lg"
      style={{ transform: isMobile ? undefined : `translate(${position.x}px, ${position.y}px)` }}
    >
        {/* アンバーグラデーションバー */}
        <div
          className="h-1.5 shrink-0"
          style={{ background: 'linear-gradient(90deg, color-mix(in oklab, var(--warning) 35%, transparent), var(--warning))' }}
        />

        {/* ヘッダー（ドラッグハンドル） */}
        <div
          className="px-5 md:px-8 pt-4 md:pt-6 pb-3 md:pb-4 shrink-0 border-b md:cursor-move"
          style={{ borderColor: 'var(--border)' }}
          onMouseDown={isMobile ? undefined : handleDragStart}
        >
          <div className="flex items-start gap-3">
            {/* アイコン（クリックでピッカー表示） */}
            <div className="relative shrink-0">
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => canEditInPlace && setShowIconPicker((v) => !v)}
                className={`w-12 h-12 rounded-[12px] flex items-center justify-center transition-colors ${
                  canEditInPlace ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                }`}
                style={{ background: 'color-mix(in oklab, var(--warning) 35%, transparent)', color: 'var(--orange-text)' }}
                aria-label="アイコンを変更"
              >
                <span className="material-icons text-[24px]">{iconValue}</span>
              </button>
              {showIconPicker && (
                <div
                  className="absolute top-14 left-0 z-20 rounded-[12px] p-2 shadow-xl"
                  style={{ background: 'var(--card)', border: '1px solid var(--border)', minWidth: '220px' }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-wrap gap-1.5 p-1">
                    {COLLAB_ICONS.map((icon) => (
                      <button
                        key={icon}
                        onClick={() => {
                          setIconValue(icon);
                          setShowIconPicker(false);
                        }}
                        className={`w-9 h-9 rounded-[8px] flex items-center justify-center border-2 transition-all ${
                          iconValue === icon
                            ? 'border-warning bg-warning/10 text-orange-text'
                            : 'border-transparent text-text-muted hover:bg-surface hover:text-text'
                        }`}
                        title={icon}
                      >
                        <span className="material-icons text-[18px]">{icon}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {editingTitle ? (
                <input
                  ref={titleRef}
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
                  className="w-full text-[18px] font-bold bg-canvas border border-primary rounded-[8px] px-2 py-1 text-text outline-none mb-2"
                  placeholder={isNew ? 'コラボのタイトルを入力...' : undefined}
                />
              ) : (
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-[18px] font-bold text-text truncate">{titleValue}</h2>
                  {canEditInPlace && (
                    <button
                      onClick={() => setEditingTitle(true)}
                      className="shrink-0 text-text-muted hover:text-brand-2 transition-colors"
                    >
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.013 2.513a1.75 1.75 0 0 1 2.475 2.474L6.226 12.25a2.751 2.751 0 0 1-.892.566l-2.35.864a.75.75 0 0 1-.96-.96l.864-2.35a2.75 2.75 0 0 1 .566-.892l7.56-7.559Z" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
              {isNew ? (
                <select
                  value={statusValue}
                  onChange={(e) => setStatusValue(e.target.value as CollabSession['status'])}
                  className="text-[11px] font-semibold rounded-full px-3 py-1 outline-none border cursor-pointer"
                  style={{ background: 'color-mix(in oklab, var(--primary) 8%, transparent)', color: 'var(--text-muted)', borderColor: 'var(--border)' }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <option value="open">募集中</option>
                </select>
              ) : (
                <StatusBadge status={session!.status} />
              )}
            </div>
            <button
              onClick={onClose}
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center border border-border text-text-muted hover:text-text transition-colors"
              style={{ background: 'var(--surface)' }}
              aria-label="閉じる"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
        </div>

        {/* ボディ（1 カラム） */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">

          {/* コラボ情報 */}
          <div className="flex-1 overflow-y-auto px-5 md:px-8 py-4 md:py-6 flex flex-col gap-6">
            {/* 確定日 */}
            {!isNew && session!.status === 'confirmed' && session!.confirmedDate && (
              <div
                className="rounded-[12px] p-4 border"
                style={{ background: 'rgba(74,222,128,0.1)', borderColor: 'rgba(74,222,128,0.3)' }}
              >
                <div className="text-[11px] font-semibold text-success mb-1">確定日時</div>
                <div className="text-[16px] font-bold text-text font-num">
                  {format(session!.confirmedDate, 'M月d日（E） HH:mm', { locale: ja })}
                </div>
              </div>
            )}

            {/* 内容 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-semibold text-text-muted tracking-[0.06em] uppercase">内容</label>
                {canEditInPlace && !editingContent && (
                  <button
                    onClick={startEditContent}
                    className="text-text-muted hover:text-brand-2 transition-colors"
                  >
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.013 2.513a1.75 1.75 0 0 1 2.475 2.474L6.226 12.25a2.751 2.751 0 0 1-.892.566l-2.35.864a.75.75 0 0 1-.96-.96l.864-2.35a2.75 2.75 0 0 1 .566-.892l7.56-7.559Z" />
                    </svg>
                  </button>
                )}
              </div>
              {editingContent ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    ref={contentRef}
                    value={contentValue}
                    onChange={(e) => setContentValue(e.target.value)}
                    rows={3}
                    className="w-full bg-canvas border border-primary text-text px-3.5 py-2.5 rounded-[12px] text-[14px] outline-none resize-y"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={cancelEditContent}
                      className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border border-border text-text-muted hover:text-text"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={saveContent}
                      className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold"
                      style={{ background: 'color-mix(in oklab, var(--primary) 35%, transparent)', color: 'var(--brand-2)' }}
                    >
                      完了
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="text-[14px] text-text-2 leading-relaxed whitespace-pre-wrap cursor-pointer hover:text-text transition-colors"
                  onClick={canEditInPlace ? startEditContent : undefined}
                >
                  {contentValue || (
                    <span className="text-text-muted italic text-[13px]">内容が入力されていません{canEditInPlace ? '（クリックして編集）' : ''}</span>
                  )}
                </div>
              )}
            </div>

            {/* 参加者 */}
            <div>
              <div className="text-[11px] font-semibold text-text-muted tracking-[0.06em] uppercase mb-3">参加者</div>
              <div className="flex flex-wrap gap-2 mb-3">
                {participants.map((p) => {
                  const style = avatarStyle(p.name);
                  const pAvatarUrl = p.type === 'member' ? memberAvatarUrl(p.id) : null;
                  return (
                    <div
                      key={p.id}
                      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-semibold border"
                      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                    >
                      {pAvatarUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={pAvatarUrl} alt={p.name} className="w-6 h-6 rounded-full object-cover shrink-0" />
                      ) : (
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                          style={{ background: style.bg, color: style.text }}
                        >
                          {p.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span>{p.name}</span>
                      {canEditInPlace && (
                        <button
                          onClick={() => removeParticipant(p.id)}
                          className="text-text-muted hover:text-live transition-colors"
                        >
                          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3 h-3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4l8 8M12 4l-8 8" />
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })}
                {canEditInPlace && (
                  <div className="relative">
                    <button
                      onClick={() => setShowMemberPicker((v) => !v)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-dashed text-[12px] font-semibold transition-colors"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                    >
                      <Icon name="person_add" size={16} />
                      メンバー追加
                    </button>
                    {showMemberPicker && availableMembers.length > 0 && (
                      <div
                        className="absolute top-9 left-0 z-20 rounded-[12px] p-2 min-w-[200px] shadow-xl"
                        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
                      >
                        {availableMembers.map((m) => {
                          const s = avatarStyle(m.displayName);
                          return (
                            <button
                              key={m.userId}
                              onClick={() => addMember(m.userId, m.displayName)}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-[8px] text-[13px] text-text hover:bg-purple-xs transition-colors text-left"
                            >
                              {m.avatarUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={m.avatarUrl} alt={m.displayName} className="w-6 h-6 rounded-full object-cover shrink-0" />
                              ) : (
                                <div
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                                  style={{ background: s.bg, color: s.text }}
                                >
                                  {m.displayName.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              {m.displayName}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {canEditInPlace && (
                <div className="flex gap-2 max-w-xs">
                  <input
                    type="text"
                    value={externalName}
                    onChange={(e) => setExternalName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addExternal()}
                    placeholder="外部参加者の名前"
                    className="flex-1 bg-canvas border border-border text-text px-3 py-1.5 rounded-[10px] text-[13px] outline-none focus:border-primary"
                  />
                  <button
                    onClick={addExternal}
                    className="px-3 py-1.5 rounded-[10px] text-[13px] font-semibold border border-border text-text-muted hover:text-text hover:border-border transition-colors"
                    style={{ background: 'var(--surface)' }}
                  >
                    追加
                  </button>
                </div>
              )}
            </div>

            {/* 候補日程 */}
            <div>
              <div className="text-[11px] font-semibold text-text-muted tracking-[0.06em] uppercase mb-3">候補日程</div>
              <div className="flex flex-col gap-2 mb-3">
                {/* 日時の昇順でソート（originalIndex で participantResponses を参照） */}
                {proposedDates
                  .map((date, i) => ({ date, originalIndex: i }))
                  .sort((a, b) => a.date.getTime() - b.date.getTime())
                  .map(({ date, originalIndex }) => {
                  const { okNames, ngNames, pendingNames } = getDateAggregates(originalIndex);
                  const isSelected = selectedDateIdxs.includes(originalIndex);
                  const isEditing = editingDateIndex === originalIndex;
                  return (
                    <div
                      key={originalIndex}
                      className="flex flex-wrap items-center justify-between gap-y-2 rounded-[12px] px-4 py-3 border transition-colors"
                      style={{ background: 'var(--surface)', borderColor: isSelected ? 'var(--primary)' : 'var(--border)' }}
                    >
                      {isEditing ? (
                        /* インライン編集モード */
                        <div className="w-full flex flex-col gap-3">
                          <DateField
                            value={editDateValue}
                            onChange={setEditDateValue}
                            min={new Date()}
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => { setEditingDateIndex(null); setEditDateValue(null); }}
                              className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border border-border text-text-muted"
                            >
                              取消
                            </button>
                            <button
                              onClick={() => handleEditDate(originalIndex, editDateValue)}
                              disabled={!editDateValue}
                              className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold disabled:opacity-40"
                              style={{ background: 'color-mix(in oklab, var(--primary) 35%, transparent)', color: 'var(--brand-2)' }}
                            >
                              完了
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div
                            className="text-[14px] font-bold font-num text-text"
                          >
                            {format(date, 'M月 dd日（E） HH:mm 〜', { locale: ja })}
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <ResponseAggregate icon="check_circle" iconClass="text-success" count={okNames.length} names={okNames} />
                            <ResponseAggregate icon="cancel" iconClass="text-live" count={ngNames.length} names={ngNames} />
                            <ResponseAggregate icon="help" iconClass="text-warning" count={pendingNames.length} names={pendingNames} />
                            {canEditInPlace && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingDateIndex(originalIndex);
                                    setEditDateValue(date);
                                  }}
                                  className="text-text-muted hover:text-brand-2 transition-colors"
                                  title="編集"
                                >
                                  <Icon name="edit" size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteDate(originalIndex)}
                                  disabled={proposedDates.length <= 1}
                                  className="text-text-muted hover:text-live transition-colors disabled:opacity-30"
                                  title="削除"
                                >
                                  <Icon name="delete" size={16} />
                                </button>
                                {!isNew && (
                                  <button
                                    onClick={() => toggleDateSelection(originalIndex)}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border transition-colors"
                                    style={{
                                      background: isSelected ? 'color-mix(in oklab, var(--primary) 35%, transparent)' : 'color-mix(in oklab, var(--primary) 15%, transparent)',
                                      color: 'var(--brand-2)',
                                      borderColor: 'var(--primary)',
                                    }}
                                  >
                                    <span className="material-icons text-[16px]">
                                      {isSelected ? 'check_box' : 'check_box_outline_blank'}
                                    </span>
                                    {isSelected ? '選択中' : '承諾'}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              {canEditInPlace && (
                showAddDate ? (
                  <div
                    className="rounded-[12px] p-4 flex flex-col gap-3 border"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                  >
                    <DateField
                      value={newDateValue}
                      onChange={setNewDateValue}
                      min={new Date()}
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => { setShowAddDate(false); setNewDateValue(null); }}
                        className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border border-border text-text-muted"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleAddDate}
                        disabled={!newDateValue}
                        className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold transition-colors disabled:opacity-40"
                        style={{ background: 'color-mix(in oklab, var(--primary) 35%, transparent)', color: 'var(--brand-2)' }}
                      >
                        追加
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddDate(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[12px] text-[13px] font-semibold border border-dashed transition-colors"
                    style={{ borderColor: 'var(--border)', color: 'var(--orange-text)' }}
                  >
                    <Icon name="edit_calendar" size={16} />
                    別の日程を提案する
                  </button>
                )
              )}
            </div>

            {/* 回答（回答者ごとに 1 行。新規作成中は出さない） */}
            {!isNew && (
              <div data-testid="collab-responses">
                <div className="text-[11px] font-semibold text-text-muted tracking-[0.06em] uppercase mb-3">回答</div>
                {responseRows.length === 0 ? (
                  <p className="text-[13px] text-text-muted">まだ回答はありません</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {responseRows.map((row) => {
                      const style = avatarStyle(row.name);
                      return (
                        <div
                          key={row.key}
                          data-testid="collab-response-row"
                          className="rounded-[12px] px-4 py-3 border"
                          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                              style={{ background: style.bg, color: style.text }}
                              aria-hidden="true"
                            >
                              {row.name.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-[13px] font-semibold text-text">{row.name}</span>
                          </div>
                          <ul className="flex flex-col gap-1">
                            {row.answers.map((a) => (
                              <li key={a.dateIndex} className="flex items-center justify-between gap-3">
                                <span className="text-[13px] font-num text-text-2">
                                  {format(a.date, 'M月 dd日（E） HH:mm 〜', { locale: ja })}
                                </span>
                                <ResponseMarkLabel mark={a.mark} />
                              </li>
                            ))}
                          </ul>
                          {row.comments.length > 0 && (
                            <ul className="mt-2 flex flex-col gap-1.5">
                              {row.comments.map((c, i) => (
                                <li
                                  key={`${c.id}-${i}`}
                                  data-testid="collab-response-comment"
                                  className="rounded-[8px] px-3 py-2"
                                  style={{ background: 'var(--canvas)', border: '1px solid var(--border)' }}
                                >
                                  <div className="text-[11px] text-text-muted font-num mb-0.5">
                                    {format(c.createdAt, 'M/d HH:mm', { locale: ja })}
                                  </div>
                                  <div className="text-[13px] text-text leading-relaxed whitespace-pre-wrap break-words">{c.text}</div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* フッター */}
        <div
          className="px-5 md:px-8 py-3 md:py-4 shrink-0 flex flex-col gap-3"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}
        >
          {/* 再調整確認ダイアログ (既存モードのみ) */}
          {!isNew && showReopenConfirm && (
                <div
                  className="rounded-[10px] px-4 py-3 text-[12px]"
                  style={{ background: 'rgba(239,159,39,0.1)', color: 'var(--orange-text)', border: '1px solid rgba(239,159,39,0.3)' }}
                >
                  <p className="font-semibold mb-2">確定済みのコラボを「調整中」に戻しますか？</p>
                  <p className="text-[11px] text-text-muted mb-3">確定日・リンクスケジュールが削除されます。候補日程・参加者・回答コメントは保持されます。</p>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowReopenConfirm(false)}
                      className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border border-border text-text-muted"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleReopen}
                      disabled={reopening}
                      className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold disabled:opacity-40"
                      style={{ background: 'rgba(239,159,39,0.2)', color: 'var(--orange-text)', border: '1px solid rgba(239,159,39,0.4)' }}
                    >
                      {reopening ? '処理中...' : '再調整する'}
                    </button>
                  </div>
                </div>
          )}

          {/* 複数選択時の確定日程ヒント (既存モードのみ) */}
          {!isNew && isOpen && canEdit && selectedDateIdxs.length > 1 && (
            <div
              className="rounded-[10px] px-4 py-2.5 text-[12px]"
              style={{ background: 'color-mix(in oklab, var(--primary) 8%, transparent)', color: 'var(--brand-2)', border: '1px solid color-mix(in oklab, var(--primary) 35%, transparent)' }}
            >
              <span className="font-semibold">調整を確定する日程:</span>{' '}
              {format(proposedDates[selectedDateIdxs[0]], 'M月d日（E） HH:mm', { locale: ja })}
              {' '}（承諾リストの最初の日程で確定されます）
            </div>
          )}

          {/* バリデーションエラー (新規モードのみ) */}
          {isNew && createError && (
            <span className="text-[12px]" style={{ color: 'var(--live)' }}>{createError}</span>
          )}
          {/* 保存・調整を確定・削除・再調整の失敗 (既存モードのみ) */}
          {!isNew && actionError && (
            <span role="alert" className="text-[12px]" style={{ color: 'var(--live)' }}>{actionError}</span>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            {/* 削除 (既存モードのみ) */}
            {!isNew && canEdit && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-[12px] text-[13px] font-semibold mr-auto border transition-colors"
                style={{ background: 'rgba(226,53,57,0.15)', color: '#ff6b70', borderColor: 'rgba(226,53,57,0.3)' }}
              >
                <Icon name="delete" size={16} />
                削除
              </button>
            )}
            {/* URLコピー (既存モードのみ) */}
            {!isNew && (
              <button
                onClick={copyUrl}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-[12px] text-[13px] font-semibold border transition-colors"
                style={{ background: 'transparent', color: 'var(--text-muted)', borderColor: 'var(--border)' }}
              >
                <Icon name="link" size={16} />
                {copied ? '✓ コピー済み' : 'URLをコピー'}
              </button>
            )}
            {/* confirmed ステータス: 再調整・複製ボタン (既存モードのみ) */}
            {!isNew && canEdit && session!.status === 'confirmed' && (
                  <>
                    <button
                      onClick={() => {
                        onDuplicate?.(session!);
                        onClose();
                      }}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-[12px] text-[13px] font-semibold border transition-colors"
                      style={{ background: 'var(--surface)', color: 'var(--text-muted)', borderColor: 'var(--border)' }}
                    >
                      <Icon name="content_copy" size={16} />
                      コピーして新規作成
                    </button>
                    <button
                      onClick={() => setShowReopenConfirm(true)}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-[12px] text-[13px] font-semibold border transition-colors"
                      style={{ background: 'rgba(239,159,39,0.15)', color: 'var(--orange-text)', borderColor: 'rgba(239,159,39,0.3)' }}
                    >
                      <Icon name="replay" size={16} />
                      再調整する
                    </button>
                  </>
                )}
            {/* 調整を確定 (既存モードのみ) */}
            {!isNew && canEdit && isOpen && (
              <button
                onClick={handleConfirm}
                disabled={selectedDateIdxs.length === 0 || confirming || savedBeforeConfirmFailed}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-[12px] text-[13px] font-semibold transition-colors disabled:opacity-40"
                style={{ background: 'color-mix(in oklab, var(--primary) 35%, transparent)', color: 'var(--brand-2)' }}
              >
                <Icon name="event_available" size={16} />
                {confirming ? '確定中...' : '調整を確定'}
              </button>
            )}
            {/* 保存/新規追加ボタン (両モード共通) */}
            {canEdit && (isNew || isOpen) && (
              <button
                onClick={isNew ? handleCreate : handleSaveChanges}
                disabled={isNew ? creating : saving || savedBeforeConfirmFailed}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-[12px] text-[13px] font-semibold border transition-colors disabled:opacity-40"
                style={{ background: 'color-mix(in oklab, var(--warning) 35%, transparent)', color: 'var(--orange-text)', borderColor: 'var(--warning)' }}
              >
                <Icon name={isNew ? 'add' : 'save'} size={16} />
                {isNew
                  ? (creating ? '追加中...' : '新規追加')
                  : (saving ? '保存中...' : '保存')}
              </button>
            )}
          </div>
        </div>
    </DialogShell>
  );
}
