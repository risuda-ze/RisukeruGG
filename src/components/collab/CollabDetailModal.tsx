'use client';

import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  confirmCollabDate,
  cancelCollabSession,
  updateCollabContent,
  updateCollabTitle,
  updateCollabParticipants,
  addCollabProposedDate,
  addCollabComment,
  updateParticipantResponse,
} from '@/lib/repositories/collabs';
import { useAuthStore } from '@/stores/auth';
import { COLLAB_STATUS_LABELS } from '@/types/entities';
import type { CollabSession, CollabParticipant, CollabComment } from '@/types/entities';
import { Timestamp, doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

interface CollabDetailModalProps {
  session: CollabSession;
  canEdit: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

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
}: CollabDetailModalProps) {
  const { currentUser, currentTeam, members } = useAuthStore();
  const teamId = currentTeam?.id ?? '';
  const isOpen = session.status === 'open';

  /* タイトル編集 */
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(session.title);

  /* 内容編集 */
  const [editingContent, setEditingContent] = useState(false);
  const [contentValue, setContentValue] = useState(session.content ?? '');

  /* 参加者 */
  const [participants, setParticipants] = useState<CollabParticipant[]>(session.participants ?? []);
  const [externalName, setExternalName] = useState('');
  const [showMemberPicker, setShowMemberPicker] = useState(false);

  /* 候補日程 */
  const [proposedDates, setProposedDates] = useState<Date[]>(session.proposedDates);
  const [participantResponses, setParticipantResponses] = useState(session.participantResponses ?? {});
  const [showAddDate, setShowAddDate] = useState(false);
  const [newDateValue, setNewDateValue] = useState('');
  const [addingDate, setAddingDate] = useState(false);

  /* コメント（Firestore 永続化） */
  const [comments, setComments] = useState<CollabComment[]>(session.comments ?? []);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  /* 返信（ローカル状態のみ） */
  type LocalReply = { id: string; authorName: string; text: string; time: string };
  const [localReplies, setLocalReplies] = useState<Record<string, LocalReply[]>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  /* 候補日程の複数選択（承諾） */
  const [selectedDateIdxs, setSelectedDateIdxs] = useState<number[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [copied, setCopied] = useState(false);

  /* 変更を確定ボタン */
  const [saving, setSaving] = useState(false);
  const isDirty =
    titleValue.trim() !== session.title ||
    contentValue !== (session.content ?? '');

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/collab/${teamId}__${session.id}`
      : '';

  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingTitle) titleRef.current?.focus();
  }, [editingTitle]);
  useEffect(() => {
    if (editingContent) contentRef.current?.focus();
  }, [editingContent]);

  /* Firestoreのリアルタイム更新（回答・候補日程・コメントを即時反映） */
  useEffect(() => {
    if (!teamId) return;
    const ref = doc(db, 'teams', teamId, 'collabSessions', session.id);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      const rawResponses = data.participantResponses as Record<string, Record<string, 'ok' | 'ng' | 'pending'>> | null;
      if (rawResponses) setParticipantResponses(rawResponses);
      const rawDates = data.proposedDates as Timestamp[] | null;
      if (rawDates) setProposedDates(rawDates.map((t) => t.toDate()));
      /* コメントも onSnapshot で同期（手動更新は楽観的更新のみ） */
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
  }, [teamId, session.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* タイトル編集終了（即時保存しない） */
  function saveTitle() {
    setEditingTitle(false);
  }

  /* 内容編集終了（即時保存しない） */
  function saveContent() {
    setEditingContent(false);
  }

  /* 変更をまとめてFirestoreに保存 */
  async function handleSaveChanges() {
    setSaving(true);
    try {
      if (titleValue.trim() && titleValue.trim() !== session.title) {
        await updateCollabTitle(teamId, session.id, titleValue.trim());
      }
      if (contentValue !== (session.content ?? '')) {
        await updateCollabContent(teamId, session.id, contentValue);
      }
    } finally {
      setSaving(false);
    }
  }

  /* 候補日程の選択トグル */
  function toggleDateSelection(i: number) {
    setSelectedDateIdxs((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
    );
  }

  /* 参加者: チームメンバー追加 */
  function addMember(memberId: string, name: string) {
    if (participants.some((p) => p.id === memberId)) return;
    const updated = [...participants, { id: memberId, name, type: 'member' as const }];
    setParticipants(updated);
    updateCollabParticipants(teamId, session.id, updated);
    setShowMemberPicker(false);
  }

  /* 参加者: 外部追加 */
  function addExternal() {
    if (!externalName.trim()) return;
    const updated = [
      ...participants,
      { id: `ext_${Date.now()}`, name: externalName.trim(), type: 'external' as const },
    ];
    setParticipants(updated);
    updateCollabParticipants(teamId, session.id, updated);
    setExternalName('');
  }

  /* 参加者: 削除 */
  function removeParticipant(id: string) {
    const updated = participants.filter((p) => p.id !== id);
    setParticipants(updated);
    updateCollabParticipants(teamId, session.id, updated);
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

  /* 候補日程を追加（onSnapshot で反映） */
  async function handleAddDate() {
    if (!newDateValue || addingDate) return;
    setAddingDate(true);
    const newDate = new Date(newDateValue);
    try {
      await addCollabProposedDate(teamId, session.id, newDate);
      /* onSnapshot が更新を受信するため手動更新しない */
      setNewDateValue('');
      setShowAddDate(false);
    } finally {
      setAddingDate(false);
    }
  }

  /* コメント送信（Firestore + 楽観的ローカル更新） */
  async function sendComment() {
    if (!commentText.trim() || !currentUser || sendingComment) return;
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
      await addCollabComment(teamId, session.id, newComment);
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
      id: `r-${Date.now()}`,
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

  /* 日程確定 */
  async function handleConfirm() {
    if (selectedDateIdxs.length === 0 || !teamId) return;
    const idx = selectedDateIdxs[0];
    setConfirming(true);
    try {
      await confirmCollabDate({
        teamId,
        sessionId: session.id,
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
      await cancelCollabSession({ teamId, sessionId: session.id });
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

  const availableMembers = members.filter((m) => !participants.some((p) => p.id === m.userId));
  const myMember = members.find((m) => m.userId === currentUser?.uid);

  return (
    /* オーバーレイ（fixed に変更） */
    <div
      className="fixed inset-0 z-[290] flex items-center justify-center p-4"
      style={{ background: 'rgba(6,6,16,0.85)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="flex flex-col overflow-hidden rounded-[24px]"
        style={{
          width: 'min(900px, calc(100vw - 32px))',
          minWidth: '320px',
          height: 'min(720px, 92vh)',
          minHeight: '400px',
          maxHeight: 'calc(100vh - 32px)',
          resize: 'both',
          background: 'var(--card-2)',
          border: '1px solid var(--border-l)',
          boxShadow: 'var(--shadow-xl)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* アンバーグラデーションバー */}
        <div
          className="h-1.5 shrink-0"
          style={{ background: 'linear-gradient(90deg, var(--amber-d), var(--amber))' }}
        />

        {/* ヘッダー */}
        <div
          className="px-8 pt-6 pb-4 shrink-0 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              {editingTitle ? (
                <input
                  ref={titleRef}
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
                  className="w-full text-[18px] font-bold bg-bg border border-purple rounded-[8px] px-2 py-1 text-text outline-none mb-2"
                />
              ) : (
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-[18px] font-bold text-text truncate">{titleValue}</h2>
                  {isOpen && canEdit && (
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
              <StatusBadge status={session.status} />
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

        {/* ボディ — レスポンシブ2カラムレイアウト (600px 未満は縦積み) */}
        <div className="flex-1 overflow-hidden flex flex-col min-[600px]:flex-row">

          {/* 左カラム: コラボ情報 */}
          <div
            className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-6 border-b min-[600px]:border-b-0 min-[600px]:border-r"
            style={{ borderColor: 'var(--border)' }}
          >
            {/* 確定日 */}
            {session.status === 'confirmed' && session.confirmedDate && (
              <div
                className="rounded-[12px] p-4 border"
                style={{ background: 'rgba(74,222,128,0.1)', borderColor: 'rgba(74,222,128,0.3)' }}
              >
                <div className="text-[11px] font-semibold text-green mb-1">確定日時</div>
                <div className="text-[16px] font-bold text-text font-num">
                  {format(session.confirmedDate, 'M月d日（E） HH:mm', { locale: ja })}
                </div>
              </div>
            )}

            {/* 内容 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-semibold text-muted tracking-[0.06em] uppercase">内容</label>
                {isOpen && canEdit && !editingContent && (
                  <button
                    onClick={() => setEditingContent(true)}
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
                      onClick={() => setEditingContent(false)}
                      className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border border-border text-muted hover:text-text"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={saveContent}
                      className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold"
                      style={{ background: 'var(--purple-d)', color: 'var(--purple-l)' }}
                    >
                      保存
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="text-[14px] text-text-2 leading-relaxed whitespace-pre-wrap cursor-pointer hover:text-text transition-colors"
                  onClick={isOpen && canEdit ? () => setEditingContent(true) : undefined}
                >
                  {contentValue || (
                    <span className="text-muted italic text-[13px]">内容が入力されていません{isOpen && canEdit ? '（クリックして編集）' : ''}</span>
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
                  return (
                    <div
                      key={p.id}
                      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-semibold border"
                      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{ background: style.bg, color: style.text }}
                      >
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span>{p.name}</span>
                      {isOpen && canEdit && (
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
                {isOpen && canEdit && (
                  <div className="relative">
                    <button
                      onClick={() => setShowMemberPicker((v) => !v)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-dashed text-[12px] font-semibold transition-colors"
                      style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                    >
                      <span className="material-icons text-[16px]">person_add</span>
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
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                                style={{ background: s.bg, color: s.text }}
                              >
                                {m.displayName.slice(0, 2).toUpperCase()}
                              </div>
                              {m.displayName}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {isOpen && canEdit && (
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
                {proposedDates.map((date, i) => {
                  const { okNames, ngNames, pendingNames } = getDateAggregates(i);
                  const isSelected = selectedDateIdxs.includes(i);
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-[12px] px-4 py-3 border transition-colors"
                      style={{ background: 'var(--surface)', borderColor: isSelected ? 'var(--purple)' : 'var(--border)' }}
                    >
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
                        {isOpen && canEdit && (
                          <button
                            onClick={() => toggleDateSelection(i)}
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
                      </div>
                    </div>
                  );
                })}
              </div>
              {isOpen && canEdit && (
                showAddDate ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="datetime-local"
                      value={newDateValue}
                      onChange={(e) => setNewDateValue(e.target.value)}
                      className="flex-1 bg-bg border border-border text-text px-3 py-2 rounded-[10px] text-[13px] outline-none focus:border-purple"
                    />
                    <button
                      onClick={handleAddDate}
                      disabled={!newDateValue || addingDate}
                      className="px-3 py-2 rounded-[10px] text-[13px] font-semibold transition-colors disabled:opacity-40"
                      style={{ background: 'var(--purple-d)', color: 'var(--purple-l)' }}
                    >
                      追加
                    </button>
                    <button
                      onClick={() => setShowAddDate(false)}
                      className="px-3 py-2 rounded-[10px] text-[13px] font-semibold border border-border text-muted"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddDate(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[12px] text-[13px] font-semibold border border-dashed transition-colors"
                    style={{ borderColor: 'var(--border)', color: 'var(--amber-l)' }}
                  >
                    <span className="material-icons text-[16px]">edit_calendar</span>
                    別の日程を提案する
                  </button>
                )
              )}
            </div>
          </div>

          {/* 右カラム: コメント（600px 未満では最大高さ 260px の縦積み） */}
          <div
            className="min-[600px]:w-[300px] min-[600px]:shrink-0 max-[599px]:max-h-[260px] flex flex-col overflow-hidden border-t min-[600px]:border-t-0"
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
                  const replies = localReplies[c.id] ?? [];
                  return (
                    <div key={c.id}>
                      <div className="flex gap-2.5">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                          style={{ background: style.bg, color: style.text }}
                        >
                          {c.authorName.slice(0, 2).toUpperCase()}
                        </div>
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
                            return (
                              <div key={r.id} className="flex gap-2">
                                <div
                                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5"
                                  style={{ background: rs.bg, color: rs.text }}
                                >
                                  {r.authorName.slice(0, 2).toUpperCase()}
                                </div>
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
        </div>

        {/* フッター */}
        <div
          className="px-8 py-4 pr-10 shrink-0 flex flex-col gap-3"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}
        >
          {/* 複数選択時の確定日程ヒント */}
          {isOpen && canEdit && selectedDateIdxs.length > 1 && (
            <div
              className="rounded-[10px] px-4 py-2.5 text-[12px]"
              style={{ background: 'var(--purple-xs)', color: 'var(--purple-l)', border: '1px solid var(--purple-d)' }}
            >
              <span className="font-semibold">調整を確定する日程:</span>{' '}
              {format(proposedDates[selectedDateIdxs[0]], 'M月d日（E） HH:mm', { locale: ja })}
              {' '}（承諾リストの最初の日程で確定されます）
            </div>
          )}
          <div className="flex items-center gap-3">
            {canEdit && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-[12px] text-[13px] font-semibold mr-auto border transition-colors"
                style={{ background: 'rgba(226,53,57,0.15)', color: '#ff6b70', borderColor: 'rgba(226,53,57,0.3)' }}
              >
                <span className="material-icons text-[16px]">delete</span>
                削除
              </button>
            )}
            <button
              onClick={copyUrl}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-[12px] text-[13px] font-semibold border transition-colors"
              style={{ background: 'transparent', color: 'var(--muted)', borderColor: 'var(--border)' }}
            >
              <span className="material-icons text-[16px]">link</span>
              {copied ? '✓ コピー済み' : 'URLをコピー'}
            </button>
            {canEdit && isOpen && isDirty && (
              <button
                onClick={handleSaveChanges}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-[12px] text-[13px] font-semibold border transition-colors disabled:opacity-40"
                style={{ background: 'var(--amber-d)', color: 'var(--amber-l)', borderColor: 'var(--amber)' }}
              >
                <span className="material-icons text-[16px]">save</span>
                {saving ? '保存中...' : '変更を確定'}
              </button>
            )}
            {canEdit && isOpen && (
              <button
                onClick={handleConfirm}
                disabled={selectedDateIdxs.length === 0 || confirming}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-[12px] text-[13px] font-semibold transition-colors disabled:opacity-40"
                style={{ background: 'var(--purple-d)', color: 'var(--purple-l)' }}
              >
                <span className="material-icons text-[16px]">event_available</span>
                {confirming ? '確定中...' : '調整を確定'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
