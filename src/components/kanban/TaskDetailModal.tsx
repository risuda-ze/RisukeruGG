'use client';

import { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';
import { updateTask, deleteTask, addTaskComment } from '@/lib/repositories/tasks';
import { useAuthStore } from '@/stores/auth';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import { saveDraft, loadDraft, clearDraft, DRAFT_KEYS } from '@/lib/formDraft';
import type { Task, TeamMember, TaskCategory, KanbanColumn, CollabComment } from '@/types/entities';

interface TaskDetailDraft {
  description: string;
  editingDesc: boolean;
}

interface LocalReply {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  time: string;
}

interface TaskDetailModalProps {
  task: Task;
  teamId: string;
  canEdit: boolean;
  columns: KanbanColumn[];
  members: TeamMember[];
  categories: TaskCategory[];
  onClose: () => void;
  onDeleted: () => void;
}

const selectClass =
  'w-full bg-bg border border-border text-text px-3 py-2 rounded-[8px] text-[13px] outline-none transition-colors focus:border-purple';

export function TaskDetailModal({
  task,
  teamId,
  canEdit,
  columns,
  members,
  categories,
  onClose,
  onDeleted,
}: TaskDetailModalProps) {
  const { currentUser } = useAuthStore();

  /* ── ドラフト復元 ─────────────────────────── */
  const draftKey = DRAFT_KEYS.taskEdit(task.id);
  const savedDraft = loadDraft<TaskDetailDraft>(draftKey);

  /* 担当者ピッカー */
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);

  /* タイトル編集 */
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(task.title);
  const [savingTitle, setSavingTitle] = useState(false);

  /* フィールド状態（楽観的ロックなし — フィールドごとに独立保存） */
  const [columnId, setColumnId] = useState(task.columnId);
  const [categoryId, setCategoryId] = useState(task.categoryId ?? '');
  const [assigneeId, setAssigneeId] = useState(task.assigneeId ?? '');
  const [dueDate, setDueDate] = useState(task.dueDate ? format(task.dueDate, 'yyyy-MM-dd') : '');

  /* 詳細（description）編集 */
  const [editingDesc, setEditingDesc] = useState(savedDraft?.editingDesc ?? false);
  const [description, setDescription] = useState(savedDraft?.description ?? task.description ?? '');
  const [savingDesc, setSavingDesc] = useState(false);

  /* コメント（Firestore 永続化） */
  const [comments, setComments] = useState<CollabComment[]>(task.comments ?? []);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  /* 返信（ローカル状態のみ） */
  const [localReplies, setLocalReplies] = useState<Record<string, LocalReply[]>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const myName = currentUser?.displayName ?? 'あなた';
  const currentCategory = categories.find((c) => c.id === categoryId);
  const currentColumn = columns.find((c) => c.id === columnId);
  const currentAssignee = members.find((m) => m.userId === assigneeId);

  /* タイトル保存 */
  async function handleSaveTitle() {
    if (!titleValue.trim() || titleValue.trim() === task.title) {
      setEditingTitle(false);
      return;
    }
    setSavingTitle(true);
    try {
      await updateTask(teamId, task.id, { title: titleValue.trim() });
      setEditingTitle(false);
    } catch {
      setTitleValue(task.title);
      setEditingTitle(false);
    } finally {
      setSavingTitle(false);
    }
  }

  /* カラム変更（即時保存） */
  async function handleColumnChange(newColumnId: string) {
    const prev = columnId;
    setColumnId(newColumnId);
    try {
      await updateTask(teamId, task.id, { columnId: newColumnId });
    } catch {
      setColumnId(prev);
    }
  }

  /* カテゴリ変更（即時保存） */
  async function handleCategoryChange(newCategoryId: string) {
    const prev = categoryId;
    setCategoryId(newCategoryId);
    try {
      await updateTask(teamId, task.id, { categoryId: newCategoryId || null });
    } catch {
      setCategoryId(prev);
    }
  }

  /* 担当者変更（即時保存） */
  async function handleAssigneeChange(newAssigneeId: string) {
    const prev = assigneeId;
    setAssigneeId(newAssigneeId);
    try {
      await updateTask(teamId, task.id, { assigneeId: newAssigneeId || null });
    } catch {
      setAssigneeId(prev);
    }
  }

  /* 期限変更（即時保存） */
  async function handleDueDateChange(value: string) {
    const prev = dueDate;
    setDueDate(value);
    try {
      await updateTask(teamId, task.id, { dueDate: value ? new Date(value) : null });
    } catch {
      setDueDate(prev);
    }
  }

  /* 詳細保存 */
  async function handleSaveDesc() {
    setSavingDesc(true);
    try {
      await updateTask(teamId, task.id, { description: description || null });
      clearDraft(draftKey);
      setEditingDesc(false);
    } catch {
      /* ローカル状態はそのまま */
    } finally {
      setSavingDesc(false);
    }
  }

  /* コメント追加（Firestore 永続化 + 楽観的ローカル更新） */
  async function addComment() {
    if (!commentText.trim() || !currentUser || sendingComment) return;
    const newComment = {
      id: `${Date.now()}`,
      authorId: currentUser.uid,
      authorName: myName,
      text: commentText.trim(),
      createdAt: Timestamp.now(),
    };
    setSendingComment(true);
    try {
      await addTaskComment(teamId, task.id, newComment);
      setComments((prev) => [
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
    const reply: LocalReply = {
      id: `r-${Date.now()}`,
      authorId: currentUser?.uid ?? '',
      authorName: myName,
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

  /* タスク削除 */
  async function handleDelete() {
    if (!confirm('このタスクを削除しますか？')) return;
    await deleteTask(teamId, task.id);
    clearDraft(draftKey);
    onDeleted();
  }

  /* ── ドラフト付きクローズ ───────────────── */
  function handleCloseWithDraft() {
    if (editingDesc) {
      saveDraft<TaskDetailDraft>(draftKey, { description, editingDesc: true });
    }
    onClose();
  }

  function handleConfirmClose() {
    clearDraft(draftKey);
    onClose();
  }

  /* アバタースタイル */
  function avatarBg(name: string) {
    const colors = ['var(--purple-d)', 'rgba(74,222,128,0.2)', 'rgba(239,159,39,0.2)', 'rgba(255,77,109,0.2)'];
    return colors[name.charCodeAt(0) % colors.length];
  }
  function avatarColor(name: string) {
    const colors = ['var(--purple-l)', '#4ade80', 'var(--amber-l)', '#ff6b70'];
    return colors[name.charCodeAt(0) % colors.length];
  }
  function memberAvatarUrl(authorId: string) {
    return members.find((m) => m.userId === authorId)?.avatarUrl ?? null;
  }

  return (
    <div
      className="fixed inset-0 z-[290] flex items-center justify-center p-4"
      style={{ background: 'rgba(6,6,16,0.85)', backdropFilter: 'blur(6px)' }}
      onClick={handleCloseWithDraft}
    >
      <div
        className="flex flex-col overflow-hidden rounded-[20px]"
        style={{
          width: 'min(850px, calc(100vw - 32px))',
          minWidth: '320px',
          height: 'min(700px, 92vh)',
          minHeight: '400px',
          maxHeight: 'calc(100vh - 32px)',
          resize: 'both',
          background: 'var(--card-2)',
          border: '1px solid var(--border-l)',
          boxShadow: 'var(--shadow-xl)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* パープルグラデーションバー */}
        <div
          className="h-1.5 shrink-0"
          style={{ background: 'linear-gradient(90deg, var(--purple-d), var(--purple))' }}
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
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') {
                      setTitleValue(task.title);
                      setEditingTitle(false);
                    }
                  }}
                  disabled={savingTitle}
                  className="w-full text-[18px] font-bold bg-bg border border-purple rounded-[8px] px-2 py-1 text-text outline-none"
                  autoFocus
                />
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-[18px] font-bold text-text leading-snug">{titleValue}</h2>
                  {canEdit && (
                    <button
                      onClick={() => setEditingTitle(true)}
                      className="shrink-0 text-muted hover:text-purple-l transition-colors"
                      aria-label="タイトルを編集"
                    >
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.013 2.513a1.75 1.75 0 0 1 2.475 2.474L6.226 12.25a2.751 2.751 0 0 1-.892.566l-2.35.864a.75.75 0 0 1-.96-.96l.864-2.35a2.75 2.75 0 0 1 .566-.892l7.56-7.559Z" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={handleCloseWithDraft}
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
          {/* 左カラム: フィールド + 詳細 */}
          <div
            className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-5 border-b min-[600px]:border-b-0 min-[600px]:border-r"
            style={{ borderColor: 'var(--border)' }}
          >
            {/* フィールドグリッド */}
            <div className="grid grid-cols-2 gap-4">
              {/* ステータス */}
              <div>
                <label className="block text-[11px] font-semibold text-muted tracking-[0.06em] uppercase mb-1.5">
                  ステータス
                </label>
                {canEdit ? (
                  <select value={columnId} onChange={(e) => handleColumnChange(e.target.value)} className={selectClass}>
                    {columns.map((col) => (
                      <option key={col.id} value={col.id}>{col.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center gap-2 py-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: currentColumn?.color ?? 'var(--muted)' }} />
                    <span className="text-[13px] text-text">{currentColumn?.name ?? '—'}</span>
                  </div>
                )}
              </div>

              {/* カテゴリ */}
              <div>
                <label className="block text-[11px] font-semibold text-muted tracking-[0.06em] uppercase mb-1.5">
                  カテゴリ
                </label>
                {canEdit ? (
                  <select value={categoryId} onChange={(e) => handleCategoryChange(e.target.value)} className={selectClass}>
                    <option value="">なし</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-[13px] py-2 block">
                    {currentCategory ? <span style={{ color: currentCategory.color }}>{currentCategory.name}</span> : '—'}
                  </span>
                )}
              </div>

              {/* 担当者 */}
              <div>
                <label className="block text-[11px] font-semibold text-muted tracking-[0.06em] uppercase mb-1.5">
                  担当者
                </label>
                {canEdit ? (
                  <>
                    {/* 選択中担当者表示ボタン */}
                    <button
                      type="button"
                      onClick={() => setShowAssigneePicker((v) => !v)}
                      className="w-full flex items-center gap-2 px-3 py-2 border border-border rounded-[8px] bg-bg text-left text-[13px] outline-none hover:border-border-l transition-colors"
                    >
                      {currentAssignee ? (
                        <>
                          <Avatar
                            initials={currentAssignee.displayName.slice(0, 2)}
                            src={currentAssignee.avatarUrl}
                            bgClass="bg-purple-d/30"
                            textClass="text-purple-l"
                            size="sm"
                          />
                          <span className="flex-1 text-text truncate">{currentAssignee.displayName}</span>
                        </>
                      ) : (
                        <span className="flex-1 text-muted">なし</span>
                      )}
                      <span className="material-icons text-[14px] text-muted">
                        {showAssigneePicker ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>
                    {/* メンバーピッカー（インライン展開） */}
                    {showAssigneePicker && (
                      <div className="mt-1 border border-border rounded-[10px] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => { handleAssigneeChange(''); setShowAssigneePicker(false); }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-[13px] transition-colors text-left ${
                            !assigneeId ? 'bg-purple/10 text-purple-l' : 'hover:bg-surface text-muted'
                          }`}
                        >
                          <div className="w-6 h-6 rounded-full border border-dashed border-border flex items-center justify-center shrink-0">
                            <span className="material-icons text-[12px]">person_off</span>
                          </div>
                          <span className="flex-1">なし</span>
                          {!assigneeId && <span className="material-icons text-[14px]">check</span>}
                        </button>
                        {members.map((m) => (
                          <button
                            type="button"
                            key={m.userId}
                            onClick={() => { handleAssigneeChange(m.userId); setShowAssigneePicker(false); }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-[13px] transition-colors text-left border-t border-border ${
                              assigneeId === m.userId ? 'bg-purple/10' : 'hover:bg-surface'
                            }`}
                          >
                            <Avatar
                              initials={m.displayName.slice(0, 2)}
                              src={m.avatarUrl}
                              bgClass="bg-purple-d/30"
                              textClass="text-purple-l"
                              size="sm"
                            />
                            <span className={`flex-1 truncate ${assigneeId === m.userId ? 'text-purple-l font-semibold' : 'text-text'}`}>
                              {m.displayName}
                            </span>
                            {assigneeId === m.userId && (
                              <span className="material-icons text-[14px] text-purple-l">check</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-[13px] text-text py-2 block">{currentAssignee?.displayName ?? '—'}</span>
                )}
              </div>

              {/* 締切日 */}
              <div>
                <label className="block text-[11px] font-semibold text-muted tracking-[0.06em] uppercase mb-1.5">
                  締切日
                </label>
                {canEdit ? (
                  <input type="date" value={dueDate} onChange={(e) => handleDueDateChange(e.target.value)} className={selectClass} />
                ) : (
                  <span className="text-[13px] text-text font-num py-2 block">
                    {task.dueDate ? format(task.dueDate, 'yyyy/MM/dd', { locale: ja }) : '—'}
                  </span>
                )}
              </div>
            </div>

            {/* 詳細説明 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-semibold text-muted tracking-[0.06em] uppercase">
                  詳細
                </label>
                {canEdit && !editingDesc && (
                  <button
                    onClick={() => setEditingDesc(true)}
                    className="text-muted hover:text-purple-l transition-colors"
                    aria-label="詳細を編集"
                  >
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.013 2.513a1.75 1.75 0 0 1 2.475 2.474L6.226 12.25a2.751 2.751 0 0 1-.892.566l-2.35.864a.75.75 0 0 1-.96-.96l.864-2.35a2.75 2.75 0 0 1 .566-.892l7.56-7.559Z" />
                    </svg>
                  </button>
                )}
              </div>
              {editingDesc ? (
                <div className="flex flex-col gap-2">
                  <MarkdownEditor
                    value={description}
                    onChange={setDescription}
                    placeholder="詳細を入力..."
                    rows={5}
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => { setDescription(task.description ?? ''); setEditingDesc(false); }}
                      className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border border-border text-muted hover:text-text"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleSaveDesc}
                      disabled={savingDesc}
                      className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold disabled:opacity-40"
                      style={{ background: 'var(--purple-d)', color: 'var(--purple-l)' }}
                    >
                      {savingDesc ? '保存中...' : '保存'}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="cursor-pointer"
                  onClick={canEdit ? () => setEditingDesc(true) : undefined}
                >
                  <MarkdownEditor
                    value={description}
                    placeholder={`詳細が入力されていません${canEdit ? '（クリックして編集）' : ''}`}
                    readOnly
                  />
                </div>
              )}
            </div>
          </div>

          {/* 右カラム: コメント（600px 未満では最大高さ 260px の縦積み） */}
          <div className="min-[600px]:w-[300px] min-[600px]:shrink-0 max-[599px]:max-h-[260px] flex flex-col overflow-hidden border-t min-[600px]:border-t-0" style={{ borderColor: 'var(--border)' }}>
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
                const replies = localReplies[c.id] ?? [];
                return (
                  <div key={c.id}>
                    {/* コメント本体 */}
                    <div className="flex gap-2.5">
                      {memberAvatarUrl(c.authorId) ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={memberAvatarUrl(c.authorId)!} alt={c.authorName} className="w-7 h-7 rounded-full object-cover shrink-0" />
                      ) : (
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                          style={{ background: avatarBg(c.authorName), color: avatarColor(c.authorName) }}
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
                        {replies.map((r) => (
                          <div key={r.id} className="flex gap-2">
                            {memberAvatarUrl(r.authorId) ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={memberAvatarUrl(r.authorId)!} alt={r.authorName} className="w-5 h-5 rounded-full object-cover shrink-0 mt-0.5" />
                            ) : (
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5"
                                style={{ background: avatarBg(r.authorName), color: avatarColor(r.authorName) }}
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
                        ))}
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
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addComment(); }}
                placeholder="チーム内メモを入力..."
                rows={2}
                className="w-full bg-bg border border-border text-text px-3 py-2 rounded-[10px] text-[12px] outline-none transition-colors focus:border-purple resize-none"
              />
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted">Ctrl+Enter で送信</span>
                <button
                  onClick={addComment}
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
          className="px-8 py-4 pr-10 shrink-0 flex items-center gap-3"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}
        >
          {canEdit && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[13px] font-semibold border transition-colors mr-auto"
              style={{ background: 'rgba(226,53,57,0.15)', color: '#ff6b70', borderColor: 'rgba(226,53,57,0.3)' }}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2 4h12M5 4V2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5V4m2 0-1 9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1L3 4" />
              </svg>
              削除
            </button>
          )}
          <div className="text-[11px] text-muted ml-auto">
            作成: {format(task.createdAt, 'yyyy/MM/dd', { locale: ja })}
          </div>
          <button
            onClick={handleConfirmClose}
            className="px-5 py-2 rounded-[10px] text-[13px] font-semibold border border-border text-muted hover:text-text transition-colors"
            style={{ background: 'transparent' }}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
