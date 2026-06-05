'use client';

import { useState, useEffect, useRef } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';
import { updateTask, deleteTask, addTaskComment, createTask } from '@/lib/repositories/tasks';
import { useAuthStore } from '@/stores/auth';
import { MarkdownView } from '@/components/ui/MarkdownEditor';
import { DateInput } from '@/components/ui/DateInput';
import { Icon } from '@/components/ui/Icon';
import { saveDraft, loadDraft, clearDraft, DRAFT_KEYS } from '@/lib/formDraft';
import { Dropdown } from '@/components/ui/Dropdown';
import type { Task, TeamMember, TaskCategory, TaskStatus, CollabComment } from '@/types/entities';

interface TaskDetailDraft {
  description: string;
  editingDesc: boolean;
}

interface TaskDetailModalProps {
  /** null = 新規追加モード */
  task: Task | null;
  /** 新規追加時の初期ステータス */
  defaultColumnId?: string;
  teamId: string;
  canEdit: boolean;
  columns: TaskStatus[];
  members: TeamMember[];
  categories: TaskCategory[];
  onClose: () => void;
  onDeleted: () => void;
}

export function TaskDetailModal({
  task,
  defaultColumnId,
  teamId,
  canEdit,
  columns,
  members,
  categories,
  onClose,
  onDeleted,
}: TaskDetailModalProps) {
  const { currentUser } = useAuthStore();
  const isNew = task === null;

  /* ドラフト（編集モードのみ） */
  const draftKey = isNew ? null : DRAFT_KEYS.taskEdit(task.id);
  const savedDraft = draftKey ? loadDraft<TaskDetailDraft>(draftKey) : null;

  const [showAssigneePicker, setShowAssigneePicker] = useState(false);

  /* タイトル */
  const [titleValue, setTitleValue] = useState(task?.title ?? '');
  const [editingTitle, setEditingTitle] = useState(isNew);
  const [savingTitle, setSavingTitle] = useState(false);
  const [titleError, setTitleError] = useState('');

  /* フィールド */
  const [columnId, setColumnId] = useState(task?.columnId ?? defaultColumnId ?? columns[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState(task?.categoryId ?? '');
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? '');
  const [dueDate, setDueDate] = useState(task?.dueDate ? format(task.dueDate, 'yyyy-MM-dd') : '');

  /* 説明 */
  const [editingDesc, setEditingDesc] = useState(savedDraft?.editingDesc ?? false);
  const [description, setDescription] = useState(savedDraft?.description ?? task?.description ?? '');
  const [savingDesc, setSavingDesc] = useState(false);

  /* コメント */
  const [comments, setComments] = useState<CollabComment[]>(task?.comments ?? []);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const commentFieldRef = useRef<HTMLDivElement>(null);

  /* 新規保存中 */
  const [savingNew, setSavingNew] = useState(false);

  const myName = currentUser?.displayName ?? 'あなた';
  const mouseDownOnOverlay = useRef<boolean>(false);

  /* ドラッグ移動（PC のみ） */
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDraggingModal = useRef(false);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!isDraggingModal.current) return;
      setPosition({
        x: dragStart.current.posX + e.clientX - dragStart.current.mouseX,
        y: dragStart.current.posY + e.clientY - dragStart.current.mouseY,
      });
    }
    function onUp() { isDraggingModal.current = false; }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  function handleDragStart(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('button, input, select, a, textarea')) return;
    isDraggingModal.current = true;
    dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, posX: position.x, posY: position.y };
    e.preventDefault();
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isNew) setComments(task!.comments ?? []);
  }, [isNew, task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentCategory = categories.find((c) => c.id === categoryId);
  const currentColumn = columns.find((c) => c.id === columnId);
  const currentAssignee = members.find((m) => m.userId === assigneeId);

  /* タイトル保存（編集モード） */
  async function handleSaveTitle() {
    if (!titleValue.trim()) { setTitleValue(task?.title ?? ''); setEditingTitle(false); return; }
    if (isNew) { setEditingTitle(false); return; }
    if (titleValue.trim() === task!.title) { setEditingTitle(false); return; }
    setSavingTitle(true);
    try {
      await updateTask(teamId, task!.id, { title: titleValue.trim() });
      setEditingTitle(false);
    } catch {
      setTitleValue(task!.title);
      setEditingTitle(false);
    } finally { setSavingTitle(false); }
  }

  /* 即時保存ハンドラ */
  async function handleColumnChange(val: string) {
    setColumnId(val);
    if (!isNew) { try { await updateTask(teamId, task!.id, { columnId: val }); } catch { setColumnId(task!.columnId); } }
  }
  async function handleCategoryChange(val: string) {
    setCategoryId(val);
    if (!isNew) { const p = categoryId; try { await updateTask(teamId, task!.id, { categoryId: val || null }); } catch { setCategoryId(p); } }
  }
  async function handleAssigneeChange(val: string) {
    setAssigneeId(val);
    setShowAssigneePicker(false);
    if (!isNew) { const p = assigneeId; try { await updateTask(teamId, task!.id, { assigneeId: val || null }); } catch { setAssigneeId(p); } }
  }
  async function handleDueDateChange(val: string) {
    setDueDate(val);
    if (!isNew) { const p = dueDate; try { await updateTask(teamId, task!.id, { dueDate: val ? new Date(val) : null }); } catch { setDueDate(p); } }
  }

  /* 説明保存（編集モード） */
  async function handleSaveDesc() {
    if (isNew) { setEditingDesc(false); return; }
    setSavingDesc(true);
    try {
      await updateTask(teamId, task!.id, { description: description || null });
      if (draftKey) clearDraft(draftKey);
      setEditingDesc(false);
    } catch { /* 状態維持 */ }
    finally { setSavingDesc(false); }
  }

  /* コメント追加 */
  async function addComment() {
    if (!commentText.trim() || !currentUser || sendingComment || isNew) return;
    const newComment = {
      id: `${Date.now()}`,
      authorId: currentUser.uid,
      authorName: myName,
      text: commentText.trim(),
      createdAt: Timestamp.now(),
    };
    setSendingComment(true);
    try {
      await addTaskComment(teamId, task!.id, newComment);
      setComments((prev) => [...prev, { ...newComment, createdAt: newComment.createdAt.toDate() }]);
      setCommentText('');
    } finally { setSendingComment(false); }
  }

  /* タスク削除 */
  async function handleDelete() {
    if (isNew || !confirm('このタスクを削除しますか？')) return;
    await deleteTask(teamId, task!.id);
    if (draftKey) clearDraft(draftKey);
    onDeleted();
  }

  /* 新規保存 */
  async function handleSaveNew() {
    if (!titleValue.trim()) { setTitleError('タイトルを入力してください'); return; }
    setSavingNew(true);
    try {
      await createTask({
        teamId,
        title: titleValue.trim(),
        columnId: columnId || columns[0]?.id || '',
        categoryId: categoryId || null,
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(dueDate + 'T00:00:00').toISOString() : null,
        description: description || null,
      });
      onClose();
    } catch (err) {
      setTitleError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally { setSavingNew(false); }
  }

  function handleCancel() {
    if (!isNew && editingDesc && draftKey) saveDraft<TaskDetailDraft>(draftKey, { description, editingDesc: true });
    onClose();
  }

  function handleSave() {
    if (isNew) { handleSaveNew(); return; }
    if (draftKey) clearDraft(draftKey);
    onClose();
  }

  /* アバタースタイル */
  function avatarBg(name: string) {
    return ['var(--purple-d)', 'rgba(74,222,128,0.2)', 'rgba(239,159,39,0.2)', 'rgba(255,77,109,0.2)'][name.charCodeAt(0) % 4];
  }
  function avatarColor(name: string) {
    return ['var(--purple-l)', '#4ade80', 'var(--amber-l)', '#ff6b70'][name.charCodeAt(0) % 4];
  }
  function memberAvatarUrl(authorId: string) {
    return members.find((m) => m.userId === authorId)?.avatarUrl ?? null;
  }

  return (
    <div
      className="fixed inset-0 z-[290] flex items-end md:items-center justify-center md:p-4"
      style={{ background: 'rgba(6,6,16,0.85)', backdropFilter: 'blur(6px)' }}
      onMouseDown={(e) => { mouseDownOnOverlay.current = e.target === e.currentTarget; }}
      onClick={() => { if (mouseDownOnOverlay.current) handleCancel(); }}
    >
      {/* モーダル本体 — .task-modal でモバイル全画面 / PC 960px に切り替わる */}
      <div
        className="task-modal flex flex-col overflow-hidden"
        style={{
          background: 'var(--card-2)',
          border: '1px solid var(--border-l)',
          boxShadow: 'var(--shadow-xl)',
          transform: `translate(${position.x}px, ${position.y}px)`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* パープルバー */}
        <div className="h-1.5 shrink-0" style={{ background: 'linear-gradient(90deg, var(--purple-d), var(--purple))' }} />

        {/* ヘッダー（ドラッグハンドル） */}
        <div
          className="px-5 md:px-8 pt-4 md:pt-6 pb-3 md:pb-4 shrink-0 border-b cursor-move select-none"
          style={{ borderColor: 'var(--border)' }}
          onMouseDown={handleDragStart}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              {editingTitle ? (
                <div className="flex flex-col gap-1">
                  <input
                    value={titleValue}
                    onChange={(e) => { setTitleValue(e.target.value); setTitleError(''); }}
                    onBlur={isNew ? undefined : handleSaveTitle}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isNew) handleSaveTitle();
                      if (e.key === 'Escape' && !isNew) { setTitleValue(task!.title); setEditingTitle(false); }
                    }}
                    disabled={savingTitle}
                    placeholder="タスクのタイトルを入力..."
                    className="w-full text-[18px] font-bold bg-bg border border-purple rounded-[8px] px-2 py-1 text-text outline-none"
                    autoFocus
                  />
                  {titleError && <p className="text-[11px] text-live">{titleError}</p>}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-[18px] font-bold text-text leading-snug">{titleValue || '（タイトルなし）'}</h2>
                  {canEdit && (
                    <button onClick={() => setEditingTitle(true)} className="shrink-0 text-muted hover:text-purple-l transition-colors" aria-label="タイトルを編集">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.013 2.513a1.75 1.75 0 0 1 2.475 2.474L6.226 12.25a2.751 2.751 0 0 1-.892.566l-2.35.864a.75.75 0 0 1-.96-.96l.864-2.35a2.75 2.75 0 0 1 .566-.892l7.56-7.559Z" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
            <button onClick={handleCancel}
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center border border-border text-muted hover:text-text transition-colors"
              style={{ background: 'var(--surface)' }} aria-label="閉じる">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
        </div>

        {/* ボディ — モバイル: 縦積み / PC: 2カラム */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">
          {/* 左カラム */}
          <div className="flex-1 overflow-y-auto px-5 md:px-8 py-4 md:py-6 flex flex-col gap-5 border-b md:border-b-0 md:border-r" style={{ borderColor: 'var(--border)' }}>
            <div className="grid grid-cols-2 gap-4">
              {/* ステータス */}
              <div>
                <label className="block text-[11px] font-semibold text-muted tracking-[0.06em] uppercase mb-1.5">ステータス</label>
                {canEdit ? (
                  <div className="flex items-center gap-2">
                    {currentColumn?.icon && (
                      <span
                        className="material-icons text-[16px] shrink-0"
                        style={{ color: currentColumn.color }}
                        aria-hidden="true"
                      >
                        {currentColumn.icon}
                      </span>
                    )}
                    <Dropdown value={columnId} options={columns.map((c) => ({ value: c.id, label: c.name }))} onChange={handleColumnChange} scroll className="flex-1" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-2">
                    {currentColumn?.icon ? (
                      <span
                        className="material-icons text-[16px] shrink-0"
                        style={{ color: currentColumn.color }}
                        aria-hidden="true"
                      >
                        {currentColumn.icon}
                      </span>
                    ) : (
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: currentColumn?.color ?? 'var(--muted)' }} />
                    )}
                    <span className="text-[13px] text-text">{currentColumn?.name ?? '—'}</span>
                  </div>
                )}
              </div>
              {/* カテゴリ */}
              <div>
                <label className="block text-[11px] font-semibold text-muted tracking-[0.06em] uppercase mb-1.5">カテゴリ</label>
                {canEdit ? (
                  <div className="flex items-center gap-2">
                    {currentCategory?.icon && (
                      <span
                        className="material-icons text-[16px] shrink-0"
                        style={{ color: currentCategory.color }}
                        aria-hidden="true"
                      >
                        {currentCategory.icon}
                      </span>
                    )}
                    <Dropdown value={categoryId} options={categories.map((c) => ({ value: c.id, label: c.name }))} placeholder="なし" onChange={handleCategoryChange} scroll className="flex-1" />
                  </div>
                ) : (
                  <span className="text-[13px] py-2 block">
                    {currentCategory ? (
                      <span className="inline-flex items-center gap-1.5" style={{ color: currentCategory.color }}>
                        {currentCategory.icon && (
                          <span className="material-icons text-[14px]" aria-hidden="true">
                            {currentCategory.icon}
                          </span>
                        )}
                        {currentCategory.name}
                      </span>
                    ) : '—'}
                  </span>
                )}
              </div>
              {/* 担当者 */}
              <div>
                <label className="block text-[11px] font-semibold text-muted tracking-[0.06em] uppercase mb-1.5">担当者</label>
                {canEdit ? (
                  <>
                    <button type="button" onClick={() => setShowAssigneePicker((v) => !v)}
                      className="w-full flex items-center gap-2 px-3 py-2 border border-border rounded-[8px] bg-bg text-left text-[13px] outline-none hover:border-border-l transition-colors">
                      {currentAssignee ? (
                        <><Avatar initials={currentAssignee.displayName.slice(0, 2)} src={currentAssignee.avatarUrl} bgClass="bg-purple-d/30" textClass="text-purple-l" size="sm" />
                          <span className="flex-1 text-text truncate">{currentAssignee.displayName}</span></>
                      ) : <span className="flex-1 text-muted">なし</span>}
                      <Icon name="chevron_down" size={14} className={`text-muted${showAssigneePicker ? ' rotate-180' : ''}`} />
                    </button>
                    {showAssigneePicker && (
                      <div className="mt-1 border border-border rounded-[10px] overflow-hidden z-10 relative">
                        <button type="button" onClick={() => handleAssigneeChange('')}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-[13px] transition-colors text-left ${!assigneeId ? 'bg-purple/10 text-purple-l' : 'hover:bg-surface text-muted'}`}>
                          <div className="w-6 h-6 rounded-full border border-dashed border-border flex items-center justify-center shrink-0"><Icon name="person_off" size={12} /></div>
                          <span className="flex-1">なし</span>
                          {!assigneeId && <Icon name="check" size={14} />}
                        </button>
                        {members.map((m) => (
                          <button type="button" key={m.userId} onClick={() => handleAssigneeChange(m.userId)}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-[13px] transition-colors text-left border-t border-border ${assigneeId === m.userId ? 'bg-purple/10' : 'hover:bg-surface'}`}>
                            <Avatar initials={m.displayName.slice(0, 2)} src={m.avatarUrl} bgClass="bg-purple-d/30" textClass="text-purple-l" size="sm" />
                            <span className={`flex-1 truncate ${assigneeId === m.userId ? 'text-purple-l font-semibold' : 'text-text'}`}>{m.displayName}</span>
                            {assigneeId === m.userId && <Icon name="check" size={14} className="text-purple-l" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : <span className="text-[13px] text-text py-2 block">{currentAssignee?.displayName ?? '—'}</span>}
              </div>
              {/* 締切日 */}
              <div>
                {canEdit ? <DateInput label="締切日" value={dueDate} onChange={handleDueDateChange} /> : (
                  <>
                    <label className="block text-[11px] font-semibold text-muted tracking-[0.06em] uppercase mb-1.5">締切日</label>
                    <span className="text-[13px] text-text font-num py-2 block">
                      {task?.dueDate ? format(task.dueDate, 'yyyy/MM/dd', { locale: ja }) : '—'}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* 説明 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-semibold text-muted tracking-[0.06em] uppercase">詳細</label>
                {canEdit && !editingDesc && (
                  <button onClick={() => setEditingDesc(true)} className="text-muted hover:text-purple-l transition-colors" aria-label="詳細を編集">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.013 2.513a1.75 1.75 0 0 1 2.475 2.474L6.226 12.25a2.751 2.751 0 0 1-.892.566l-2.35.864a.75.75 0 0 1-.96-.96l.864-2.35a2.75 2.75 0 0 1 .566-.892l7.56-7.559Z" />
                    </svg>
                  </button>
                )}
              </div>
              {editingDesc ? (
                <div className="flex flex-col gap-2">
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                    placeholder="詳細を入力..." rows={4}
                    className="w-full bg-bg border border-border text-text px-3.5 py-2.5 rounded-[12px] text-[14px] outline-none transition-colors focus:border-purple resize-y" />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setDescription(task?.description ?? ''); setEditingDesc(false); }}
                      className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border border-border text-muted hover:text-text">
                      キャンセル
                    </button>
                    {!isNew && (
                      <button onClick={handleSaveDesc} disabled={savingDesc}
                        className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold disabled:opacity-40"
                        style={{ background: 'var(--purple-d)', color: 'var(--purple-l)' }}>
                        {savingDesc ? '保存中...' : '保存'}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="cursor-pointer min-h-[40px]" onClick={canEdit ? () => setEditingDesc(true) : undefined}>
                  <MarkdownView value={description} placeholder={`詳細が入力されていません${canEdit ? '（クリックして編集）' : ''}`} />
                </div>
              )}
            </div>
          </div>

          {/* 右カラム: コメント（新規追加モードでは非表示） */}
          {!isNew && (
            <div className="md:w-[340px] md:shrink-0 flex flex-col overflow-hidden max-h-[280px] md:max-h-none" style={{ borderColor: 'var(--border)' }}>
              <div className="px-5 py-3 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
                <p className="text-[11px] font-semibold text-muted tracking-[0.06em] uppercase">コメント / メモ</p>
              </div>
              {/* コメントリスト */}
              <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3" style={{ minHeight: 0 }}>
                {comments.length === 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-[10px] text-[12px] text-muted" style={{ background: 'var(--surface)', border: '1px dashed var(--border)' }}>
                    <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 shrink-0 opacity-50"><path d="M2 2h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H9l-3 3v-3H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" /></svg>
                    まだコメントはありません
                  </div>
                )}
                {comments.map((c) => {
                  const isMe = c.authorId === currentUser?.uid;
                  return (
                    <div key={c.id} className={`flex gap-2 items-start ${isMe ? 'flex-row-reverse' : ''}`}>
                      {memberAvatarUrl(c.authorId) ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={memberAvatarUrl(c.authorId)!} alt={c.authorName} className="w-7 h-7 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                          style={{ background: avatarBg(c.authorName), color: avatarColor(c.authorName) }}>
                          {c.authorName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className={`max-w-[78%] flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted">
                          {!isMe && <span className="font-semibold text-text-secondary">{c.authorName}</span>}
                          <span>{format(c.createdAt, 'HH:mm', { locale: ja })}</span>
                        </div>
                        <div className="px-3 py-2 text-[13px] leading-relaxed text-text"
                          style={{
                            background: isMe ? 'var(--primary-950)' : 'var(--surface)',
                            border: `1px solid ${isMe ? 'var(--primary-800)' : 'var(--border)'}`,
                            borderRadius: isMe ? '13px 4px 13px 13px' : '4px 13px 13px 13px',
                          }}>
                          {c.text}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* 丸型コメント入力 */}
              <div className="px-4 py-3 shrink-0 flex items-center gap-2" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
                <div
                  ref={commentFieldRef}
                  className="flex-1 flex items-center px-4"
                  style={{ height: 46, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)', transition: 'border-color var(--duration-fast), box-shadow var(--duration-fast)' }}
                  onFocusCapture={() => {
                    if (commentFieldRef.current) {
                      commentFieldRef.current.style.borderColor = 'var(--primary)';
                      commentFieldRef.current.style.boxShadow = 'var(--glow-primary)';
                    }
                  }}
                  onBlurCapture={() => {
                    if (commentFieldRef.current) {
                      commentFieldRef.current.style.borderColor = 'var(--border)';
                      commentFieldRef.current.style.boxShadow = '';
                    }
                  }}
                >
                  <input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment(); } }}
                    placeholder="コメントを入力..."
                    className="flex-1 bg-transparent text-[13px] text-text outline-none placeholder:text-muted"
                  />
                </div>
                <button onClick={addComment} disabled={!commentText.trim() || sendingComment}
                  className="shrink-0 w-[46px] h-[46px] rounded-full flex items-center justify-center disabled:opacity-40 transition-opacity"
                  style={{ background: 'var(--primary)', boxShadow: 'var(--glow-primary)' }} aria-label="コメントを送信">
                  <svg viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth={2} className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 13V3M4 7l4-4 4 4" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="px-5 md:px-8 py-3 md:py-4 shrink-0 flex items-center gap-3" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
          {/* 削除ボタン（編集モード・canEdit のみ） */}
          {!isNew && canEdit && (
            <button onClick={handleDelete}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[13px] font-semibold border transition-colors mr-auto"
              style={{ background: 'rgba(226,53,57,0.15)', color: '#ff6b70', borderColor: 'rgba(226,53,57,0.3)' }}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2 4h12M5 4V2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5V4m2 0-1 9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1L3 4" />
              </svg>
              削除
            </button>
          )}
          {/* キャンセル + 保存 */}
          <div className="ml-auto flex items-center gap-2">
            <button onClick={handleCancel}
              className="px-4 py-2 rounded-[10px] text-[13px] font-semibold border border-border text-muted hover:text-text transition-colors">
              キャンセル
            </button>
            <button onClick={handleSave} disabled={savingNew}
              className="px-5 py-2 rounded-[10px] text-[13px] font-semibold disabled:opacity-40 transition-opacity"
              style={{ background: 'var(--purple-d)', color: 'var(--purple-l)' }}>
              {savingNew ? '作成中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
