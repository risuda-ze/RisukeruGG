'use client';

import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  confirmCollabDate,
  cancelCollabSession,
  updateCollabSession,
  addCollabComment,
  reopenCollabSession,
  createCollabSessionDraft,
} from '@/lib/repositories/collabs';
import { useAuthStore } from '@/stores/auth';
import { Icon } from '@/components/ui/Icon';
import { COLLAB_STATUS_LABELS } from '@/types/entities';
import type { CollabSession, CollabParticipant, CollabComment } from '@/types/entities';
import { Timestamp, doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useMediaQuery } from '@/hooks/useMediaQuery';
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
  { bg: 'var(--purple-d)', text: 'var(--purple-l)' },
  { bg: 'rgba(74,222,128,0.2)', text: '#4ade80' },
  { bg: 'rgba(239,159,39,0.2)', text: 'var(--amber-l)' },
  { bg: 'linear-gradient(135deg,#3a1a6a,#6a2a9a)', text: '#cc88ff' },
  { bg: 'rgba(127,119,221,0.2)', text: 'var(--purple-l)' },
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
        style={{ background: 'var(--live-xs)', color: 'var(--live)', borderColor: 'rgba(255,77,109,0.3)' }}
      >
        ⏳ {label}
      </span>
    );
  }
  if (status === 'confirmed') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border"
        style={{ background: 'rgba(74,222,128,0.15)', color: 'var(--green)', borderColor: 'rgba(74,222,128,0.3)' }}
      >
        ✓ {label}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border"
      style={{ background: 'var(--purple-xs)', color: 'var(--muted)', borderColor: 'var(--border)' }}
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
        style={{ color: count === 0 ? 'var(--muted)' : 'var(--text-2)' }}
      >
        {count}
      </span>
      {names.length > 0 && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-[6px] text-[11px] whitespace-nowrap pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'var(--card-2)', border: '1px solid var(--border-l)', color: 'var(--text)', boxShadow: 'var(--shadow-md)' }}
        >
          {names.join(', ')}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 -mt-px"
            style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '4px solid var(--border-l)' }}
          />
        </div>
      )}
    </div>
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
  const { currentUser, currentTeam, members } = useAuthStore();
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
  const [statusValue, setStatusValue] = useState<CollabSession['status']>(session?.status ?? 'draft');

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

  /* コメント（Firestore 永続化） */
  const [comments, setComments] = useState<CollabComment[]>(session?.comments ?? []);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  /* 返信（ローカル状態のみ） */
  type LocalReply = { id: string; authorId: string; authorName: string; text: string; time: string };
  const [localReplies, setLocalReplies] = useState<Record<string, LocalReply[]>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

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

  /*
   * Firestoreのリアルタイム更新（コメントのみ即時反映）。
   * 候補日程・参加者・回答・タイトル・内容・アイコンはローカル編集とし、
   * 保存ボタン押下時にまとめて永続化する。これらをここで上書きすると
   * 編集中のローカル変更がクロバーされるため同期対象から除外している。
   */
  useEffect(() => {
    if (!teamId || isNew) return;
    const ref = doc(db, 'teams', teamId, 'collabSessions', session!.id);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      const rawComments = (data.comments as Array<Record<string, unknown>> | null) ?? [];
      setComments(rawComments.map((c) => ({
        id: c.id as string,
        authorId: c.authorId as string,
        authorName: c.authorName as string,
        text: c.text as string,
        createdAt: (c.createdAt as Timestamp).toDate(),
      })));
    });
    return unsub;
  }, [teamId, isNew, session?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
   * ローカル編集内容を Firestore へ書き込む。
   * participants / proposedDates / participantResponses は編集時に新しい
   * オブジェクトへ置き換わる（初期値は session の参照そのまま）ため、
   * 参照比較で未編集のフィールドを除外する。これにより、モーダル表示中に
   * 外部回答者が送信した回答を古いスナップショットで上書きしない。
   */
  async function persistLocalChanges() {
    const payload: Partial<CollabSession> = {
      title: titleValue.trim() || session!.title,
      content: contentValue,
      icon: iconValue,
    };
    if (participants !== session!.participants) payload.participants = participants;
    if (proposedDates !== session!.proposedDates) payload.proposedDates = proposedDates;
    if (participantResponses !== session!.participantResponses) {
      payload.participantResponses = participantResponses;
    }
    await updateCollabSession(teamId, session!.id, payload, currentUser?.uid);
  }

  /* 変更をまとめてFirestoreに保存し、完了後モーダルを閉じる */
  async function handleSaveChanges() {
    if (isNew || saving) return;
    setSaving(true);
    try {
      await persistLocalChanges();
      onSaved?.();
      onClose();
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
      const safeStatus = statusValue === 'confirmed' ? 'draft' : statusValue as 'draft' | 'open';
      await createCollabSessionDraft(teamId, {
        title,
        status: safeStatus,
        content: contentValue.trim() || undefined,
        participants,
        proposedDates,
        icon: iconValue,
      });
      onSaved?.();
      onClose();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : '作成に失敗しました');
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
    const keyToName: Record<string, string> = {};
    for (const p of participants) {
      keyToName[p.id] = p.name;
      keyToName[p.name.replace(/[.#$[\]/]/g, '_')] = p.name;
    }
    const resolve = (key: string) => keyToName[key] ?? key;
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

  /* 候補日程を追加（ローカル状態のみ。保存ボタンで永続化） */
  function handleAddDate() {
    if (!newDateValue) return;
    setProposedDates((prev) => [...prev, newDateValue]);
    setNewDateValue(null);
    setShowAddDate(false);
  }

  /* コメント送信（Firestore + 楽観的ローカル更新） */
  async function sendComment() {
    if (!commentText.trim() || !currentUser || sendingComment || isNew) return;
    const myMember = members.find((m) => m.userId === currentUser.uid);
    setSendingComment(true);
    try {
      const newComment = {
        id: `${Date.now()}`,
        authorId: currentUser.uid,
        authorName: myMember?.displayName ?? currentUser.displayName ?? 'あなた',
        text: commentText.trim(),
        createdAt: Timestamp.now(),
      };
      await addCollabComment(teamId, session!.id, newComment);
      /* onSnapshot が同期するが、楽観的に先行表示 */
      setComments((prev: CollabComment[]) => [
        ...prev,
        { ...newComment, createdAt: newComment.createdAt.toDate() },
      ]);
      setCommentText('');
    } finally {
      setSendingComment(false);
    }
  }

  /* 返信追加（ローカルのみ） */
  function addReply(commentId: string) {
    if (!replyText.trim()) return;
    const myMember = members.find((m) => m.userId === currentUser?.uid);
    const reply: LocalReply = {
      id: `r-${Date.now()}`, // eslint-disable-line react-hooks/purity
      authorId: currentUser?.uid ?? '',
      authorName: myMember?.displayName ?? 'あなた',
      text: replyText.trim(),
      time: format(new Date(), 'HH:mm', { locale: ja }),
    };
    setLocalReplies((prev) => ({
      ...prev,
      [commentId]: [...(prev[commentId] ?? []), reply],
    }));
    setReplyText('');
    setReplyingTo(null);
  }

  /* 日程確定（確定後モーダルが閉じるため、未保存のローカル編集を先に永続化する） */
  async function handleConfirm() {
    if (selectedDateIdxs.length === 0 || !teamId || isNew) return;
    const idx = selectedDateIdxs[0];
    setConfirming(true);
    try {
      await persistLocalChanges();
      await confirmCollabDate({
        teamId,
        sessionId: session!.id,
        confirmedDate: proposedDates[idx].toISOString(),
      });
      onClose();
    } finally {
      setConfirming(false);
    }
  }

  /* 削除 */
  async function handleCancel() {
    if (!confirm('このコラボ調整を削除しますか？')) return;
    setCancelling(true);
    try {
      await cancelCollabSession({ teamId, sessionId: session!.id });
      onDeleted();
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
    try {
      await reopenCollabSession({ teamId, sessionId: session!.id });
      onReopen?.();
      onClose();
    } finally {
      setReopening(false);
      setShowReopenConfirm(false);
    }
  }

  const availableMembers = members.filter((m) => !participants.some((p) => p.id === m.userId));

  /* リサイズドラッグ時の誤クローズを防ぐため mousedown 発生元を追跡する */
  const mouseDownOnOverlay = useRef<boolean>(false);

  /* ── ドラッグ移動 ─────────────────────────────── */
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!isDragging.current) return;
      setPosition({
        x: dragStart.current.posX + e.clientX - dragStart.current.mouseX,
        y: dragStart.current.posY + e.clientY - dragStart.current.mouseY,
      });
    }
    function onUp() { isDragging.current = false; }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, []);

  function handleDragStart(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('button, input, select, a')) return;
    isDragging.current = true;
    dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, posX: position.x, posY: position.y };
    e.preventDefault();
  }

  return (
    /* オーバーレイ */
    <div
      className="fixed inset-0 z-[290] flex items-end md:items-center justify-center md:p-4"
      style={{ background: 'rgba(6,6,16,0.85)', backdropFilter: 'blur(6px)' }}
      onMouseDown={(e) => { mouseDownOnOverlay.current = e.target === e.currentTarget; }}
      onClick={() => { if (mouseDownOnOverlay.current) onClose(); }}
    >
      <div
        className="collab-modal flex flex-col overflow-hidden rounded-t-[20px] md:rounded-[24px]"
        style={{
          background: 'var(--card-2)',
          border: '1px solid var(--border-l)',
          boxShadow: 'var(--shadow-xl)',
          transform: isMobile ? undefined : `translate(${position.x}px, ${position.y}px)`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* アンバーグラデーションバー */}
        <div
          className="h-1.5 shrink-0"
          style={{ background: 'linear-gradient(90deg, var(--amber-d), var(--amber))' }}
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
                style={{ background: 'var(--amber-d)', color: 'var(--amber-l)' }}
                aria-label="アイコンを変更"
              >
                <span className="material-icons text-[24px]">{iconValue}</span>
              </button>
              {showIconPicker && (
                <div
                  className="absolute top-14 left-0 z-20 rounded-[12px] p-2 shadow-xl"
                  style={{ background: 'var(--card)', border: '1px solid var(--border-l)', minWidth: '220px' }}
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
                            ? 'border-amber bg-amber/10 text-amber-l'
                            : 'border-transparent text-muted hover:bg-surface hover:text-text'
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
                  className="w-full text-[18px] font-bold bg-bg border border-purple rounded-[8px] px-2 py-1 text-text outline-none mb-2"
                  placeholder={isNew ? 'コラボのタイトルを入力...' : undefined}
                />
              ) : (
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-[18px] font-bold text-text truncate">{titleValue}</h2>
                  {canEditInPlace && (
                    <button
                      onClick={() => setEditingTitle(true)}
                      className="shrink-0 text-muted hover:text-purple-l transition-colors"
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
                  style={{ background: 'var(--purple-xs)', color: 'var(--muted)', borderColor: 'var(--border)' }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <option value="draft">準備中</option>
                  <option value="open">募集中</option>
                </select>
              ) : (
                <StatusBadge status={session!.status} />
              )}
            </div>
            <button
              onClick={onClose}
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center border border-border text-muted hover:text-text transition-colors"
              style={{ background: 'var(--surface)' }}
              aria-label="閉じる"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
        </div>

        {/* ボディ — レスポンシブ2カラムレイアウト (md 未満は縦積み) */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">

          {/* 左カラム: コラボ情報 */}
          <div
            className="flex-1 overflow-y-auto px-5 md:px-8 py-4 md:py-6 flex flex-col gap-6 border-b md:border-b-0 md:border-r"
            style={{ borderColor: 'var(--border)' }}
          >
            {/* 確定日 */}
            {!isNew && session!.status === 'confirmed' && session!.confirmedDate && (
              <div
                className="rounded-[12px] p-4 border"
                style={{ background: 'rgba(74,222,128,0.1)', borderColor: 'rgba(74,222,128,0.3)' }}
              >
                <div className="text-[11px] font-semibold text-green mb-1">確定日時</div>
                <div className="text-[16px] font-bold text-text font-num">
                  {format(session!.confirmedDate, 'M月d日（E） HH:mm', { locale: ja })}
                </div>
              </div>
            )}

            {/* 内容 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-semibold text-muted tracking-[0.06em] uppercase">内容</label>
                {canEditInPlace && !editingContent && (
                  <button
                    onClick={startEditContent}
                    className="text-muted hover:text-purple-l transition-colors"
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
                    className="w-full bg-bg border border-purple text-text px-3.5 py-2.5 rounded-[12px] text-[14px] outline-none resize-y"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={cancelEditContent}
                      className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border border-border text-muted hover:text-text"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={saveContent}
                      className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold"
                      style={{ background: 'var(--purple-d)', color: 'var(--purple-l)' }}
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
                    <span className="text-muted italic text-[13px]">内容が入力されていません{canEditInPlace ? '（クリックして編集）' : ''}</span>
                  )}
                </div>
              )}
            </div>

            {/* 参加者 */}
            <div>
              <div className="text-[11px] font-semibold text-muted tracking-[0.06em] uppercase mb-3">参加者</div>
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
                          className="text-muted hover:text-live transition-colors"
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
                      style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                    >
                      <Icon name="person_add" size={16} />
                      メンバー追加
                    </button>
                    {showMemberPicker && availableMembers.length > 0 && (
                      <div
                        className="absolute top-9 left-0 z-20 rounded-[12px] p-2 min-w-[200px] shadow-xl"
                        style={{ background: 'var(--card)', border: '1px solid var(--border-l)' }}
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
                    className="flex-1 bg-bg border border-border text-text px-3 py-1.5 rounded-[10px] text-[13px] outline-none focus:border-purple"
                  />
                  <button
                    onClick={addExternal}
                    className="px-3 py-1.5 rounded-[10px] text-[13px] font-semibold border border-border text-muted hover:text-text hover:border-border-l transition-colors"
                    style={{ background: 'var(--surface)' }}
                  >
                    追加
                  </button>
                </div>
              )}
            </div>

            {/* 候補日程 */}
            <div>
              <div className="text-[11px] font-semibold text-muted tracking-[0.06em] uppercase mb-3">候補日程</div>
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
                      className="flex items-center justify-between rounded-[12px] px-4 py-3 border transition-colors"
                      style={{ background: 'var(--surface)', borderColor: isSelected ? 'var(--purple)' : 'var(--border)' }}
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
                              className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border border-border text-muted"
                            >
                              取消
                            </button>
                            <button
                              onClick={() => handleEditDate(originalIndex, editDateValue)}
                              disabled={!editDateValue}
                              className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold disabled:opacity-40"
                              style={{ background: 'var(--purple-d)', color: 'var(--purple-l)' }}
                            >
                              完了
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div
                            className="text-[14px] font-bold font-num text-text"
                            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                          >
                            {format(date, 'M月 dd日（E） HH:mm 〜', { locale: ja })}
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <ResponseAggregate icon="check_circle" iconClass="text-green" count={okNames.length} names={okNames} />
                            <ResponseAggregate icon="cancel" iconClass="text-live" count={ngNames.length} names={ngNames} />
                            <ResponseAggregate icon="help" iconClass="text-amber" count={pendingNames.length} names={pendingNames} />
                            {canEditInPlace && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingDateIndex(originalIndex);
                                    setEditDateValue(date);
                                  }}
                                  className="text-muted hover:text-purple-l transition-colors"
                                  title="編集"
                                >
                                  <Icon name="edit" size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteDate(originalIndex)}
                                  disabled={proposedDates.length <= 1}
                                  className="text-muted hover:text-live transition-colors disabled:opacity-30"
                                  title="削除"
                                >
                                  <Icon name="delete" size={16} />
                                </button>
                                {!isNew && (
                                  <button
                                    onClick={() => toggleDateSelection(originalIndex)}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border transition-colors"
                                    style={{
                                      background: isSelected ? 'var(--purple-d)' : 'var(--purple-sm)',
                                      color: 'var(--purple-l)',
                                      borderColor: 'var(--purple)',
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
                        className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border border-border text-muted"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleAddDate}
                        disabled={!newDateValue}
                        className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold transition-colors disabled:opacity-40"
                        style={{ background: 'var(--purple-d)', color: 'var(--purple-l)' }}
                      >
                        追加
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddDate(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[12px] text-[13px] font-semibold border border-dashed transition-colors"
                    style={{ borderColor: 'var(--border)', color: 'var(--amber-l)' }}
                  >
                    <Icon name="edit_calendar" size={16} />
                    別の日程を提案する
                  </button>
                )
              )}
            </div>
          </div>

          {/* 右カラム: コメント（新規作成モードでは非表示） */}
          {!isNew && (
            <div
              className="md:w-[320px] md:shrink-0 max-h-[280px] md:max-h-none flex flex-col overflow-hidden border-t md:border-t-0"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="flex flex-col flex-1 overflow-hidden min-h-0">
                <div className="px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-[11px] font-semibold text-muted tracking-[0.06em] uppercase">コメント / メモ</p>
                </div>

                {/* コメントリスト */}
                <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4" style={{ minHeight: 0 }}>
                  {comments.length === 0 && (
                    <p className="text-[12px] text-muted italic text-center mt-4">まだコメントはありません</p>
                  )}
                  {comments.map((c) => {
                    const style = avatarStyle(c.authorName);
                    const cAvatarUrl = memberAvatarUrl(c.authorId);
                    const replies = localReplies[c.id] ?? [];
                    return (
                      <div key={c.id}>
                        <div className="flex gap-2.5">
                          {cAvatarUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={cAvatarUrl} alt={c.authorName} className="w-7 h-7 rounded-full object-cover shrink-0" />
                          ) : (
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                              style={{ background: style.bg, color: style.text }}
                            >
                              {c.authorName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div
                              className="rounded-[0_10px_10px_10px] px-3 py-2"
                              style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                            >
                              <div className="flex justify-between mb-1 text-[11px] text-muted">
                                <strong className="text-text font-semibold">{c.authorName}</strong>
                                <span>{format(c.createdAt, 'HH:mm', { locale: ja })}</span>
                              </div>
                              <div className="text-[13px] text-text leading-relaxed">{c.text}</div>
                            </div>
                            <button
                              onClick={() => { setReplyingTo(c.id); setReplyText(''); }}
                              className="mt-1 text-[11px] text-muted hover:text-purple-l transition-colors ml-1"
                            >
                              返信
                            </button>
                          </div>
                        </div>

                        {/* 返信リスト */}
                        {replies.length > 0 && (
                          <div className="ml-9 mt-2 flex flex-col gap-2 border-l-2 pl-3" style={{ borderColor: 'var(--border)' }}>
                            {replies.map((r) => {
                              const rs = avatarStyle(r.authorName);
                              const rAvatarUrl = memberAvatarUrl(r.authorId);
                              return (
                                <div key={r.id} className="flex gap-2">
                                  {rAvatarUrl ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={rAvatarUrl} alt={r.authorName} className="w-5 h-5 rounded-full object-cover shrink-0 mt-0.5" />
                                  ) : (
                                    <div
                                      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5"
                                      style={{ background: rs.bg, color: rs.text }}
                                    >
                                      {r.authorName.slice(0, 2).toUpperCase()}
                                    </div>
                                  )}
                                  <div
                                    className="flex-1 rounded-[0_8px_8px_8px] px-2.5 py-1.5"
                                    style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                                  >
                                    <div className="flex justify-between mb-0.5 text-[10px] text-muted">
                                      <strong className="text-text font-semibold">{r.authorName}</strong>
                                      <span>{r.time}</span>
                                    </div>
                                    <div className="text-[12px] text-text leading-relaxed">{r.text}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* 返信入力 */}
                        {replyingTo === c.id && (
                          <div className="ml-9 mt-2 flex flex-col gap-1.5 border-l-2 pl-3" style={{ borderColor: 'var(--purple)' }}>
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addReply(c.id); }}
                              placeholder="返信を入力..."
                              rows={2}
                              className="w-full bg-bg border border-border text-text px-2.5 py-2 rounded-[8px] text-[12px] outline-none focus:border-purple resize-none"
                              autoFocus
                            />
                            <div className="flex gap-1.5 justify-end">
                              <button
                                onClick={() => setReplyingTo(null)}
                                className="px-2.5 py-1 rounded-[6px] text-[11px] font-semibold border border-border text-muted"
                              >
                                キャンセル
                              </button>
                              <button
                                onClick={() => addReply(c.id)}
                                disabled={!replyText.trim()}
                                className="px-2.5 py-1 rounded-[6px] text-[11px] font-semibold disabled:opacity-40"
                                style={{ background: 'var(--purple-d)', color: 'var(--purple-l)' }}
                              >
                                返信
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* コメント入力 */}
                <div className="px-4 py-3 border-t shrink-0 flex flex-col gap-2" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendComment(); }}
                    placeholder="チーム内メモを入力..."
                    rows={2}
                    className="w-full bg-bg border border-border text-text px-3 py-2 rounded-[10px] text-[12px] outline-none transition-colors focus:border-purple resize-none"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted">Ctrl+Enter で送信</span>
                    <button
                      onClick={sendComment}
                      disabled={!commentText.trim() || sendingComment}
                      className="px-3 py-1.5 rounded-[8px] text-[11px] font-semibold transition-colors disabled:opacity-40"
                      style={{ background: 'var(--purple-d)', color: 'var(--purple-l)' }}
                    >
                      {sendingComment ? '送信中...' : '送信'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
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
                  style={{ background: 'rgba(239,159,39,0.1)', color: 'var(--amber-l)', border: '1px solid rgba(239,159,39,0.3)' }}
                >
                  <p className="font-semibold mb-2">確定済みのコラボを「調整中」に戻しますか？</p>
                  <p className="text-[11px] text-muted mb-3">確定日・リンクスケジュールが削除されます。候補日程・参加者・コメントは保持されます。</p>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowReopenConfirm(false)}
                      className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border border-border text-muted"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleReopen}
                      disabled={reopening}
                      className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold disabled:opacity-40"
                      style={{ background: 'rgba(239,159,39,0.2)', color: 'var(--amber-l)', border: '1px solid rgba(239,159,39,0.4)' }}
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
              style={{ background: 'var(--purple-xs)', color: 'var(--purple-l)', border: '1px solid var(--purple-d)' }}
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
                style={{ background: 'transparent', color: 'var(--muted)', borderColor: 'var(--border)' }}
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
                      style={{ background: 'var(--surface)', color: 'var(--muted)', borderColor: 'var(--border)' }}
                    >
                      <Icon name="content_copy" size={16} />
                      コピーして新規作成
                    </button>
                    <button
                      onClick={() => setShowReopenConfirm(true)}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-[12px] text-[13px] font-semibold border transition-colors"
                      style={{ background: 'rgba(239,159,39,0.15)', color: 'var(--amber-l)', borderColor: 'rgba(239,159,39,0.3)' }}
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
                disabled={selectedDateIdxs.length === 0 || confirming}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-[12px] text-[13px] font-semibold transition-colors disabled:opacity-40"
                style={{ background: 'var(--purple-d)', color: 'var(--purple-l)' }}
              >
                <Icon name="event_available" size={16} />
                {confirming ? '確定中...' : '調整を確定'}
              </button>
            )}
            {/* 保存/新規追加ボタン (両モード共通) */}
            {canEdit && (isNew || isOpen) && (
              <button
                onClick={isNew ? handleCreate : handleSaveChanges}
                disabled={isNew ? creating : saving}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-[12px] text-[13px] font-semibold border transition-colors disabled:opacity-40"
                style={{ background: 'var(--amber-d)', color: 'var(--amber-l)', borderColor: 'var(--amber)' }}
              >
                <Icon name={isNew ? 'add' : 'save'} size={16} />
                {isNew
                  ? (creating ? '追加中...' : '新規追加')
                  : (saving ? '保存中...' : '保存')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
