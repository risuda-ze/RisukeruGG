'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { useAIChatStore } from '@/stores/aiChat';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';
import { updateTask, deleteTask, addTaskComment, createTask } from '@/lib/repositories/tasks';
import { useAuthStore } from '@/stores/auth';
import { MarkdownView } from '@/components/ui/MarkdownEditor';
import { DateField } from '@/components/ui/DateField';
import { Icon } from '@/components/ui/Icon';
import { DialogShell } from '@/components/ui/Dialog';
import { saveDraft, loadDraft, clearDraft, DRAFT_KEYS } from '@/lib/formDraft';
import { useModalDrag } from '@/hooks/useModalDrag';
import { Dropdown } from '@/components/ui/Dropdown';
import type { Task, TeamMember, Category, TaskStatus, CollabComment } from '@/types/entities';

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
  categories: Category[];
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
  const currentUser = useAuthStore((s) => s.currentUser);
  const isNew = task === null;
  const router = useRouter();

  /* 「AIに相談」: このタスクをピン留めして AI チャットへ遷移する */
  function handleConsultAI() {
    if (!task) return;
    useAIChatStore.getState().setPinnedTaskId(task.id);
    router.push('/chat');
  }

  /* ドラフト（編集モードのみ） */
  const draftKey = isNew ? null : DRAFT_KEYS.taskEdit(task.id);
  const savedDraft = draftKey ? loadDraft<TaskDetailDraft>(draftKey) : null;

  const [showAssigneePicker, setShowAssigneePicker] = useState(false);

  /* タイトル */
  const [titleValue, setTitleValue] = useState(task?.title ?? '');
  const [editingTitle, setEditingTitle] = useState(isNew);
  const [titleError, setTitleError] = useState('');

  /* フィールド */
  const [columnId, setColumnId] = useState(task?.columnId ?? defaultColumnId ?? columns[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState(task?.categoryId ?? '');
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? '');
  /* 締切日: Date 型で管理（終日フラグ false 時は時刻も使用する） */
  const [dueDate, setDueDate] = useState<Date | null>(task?.dueDate ?? null);
  const [dueDateAllDay, setDueDateAllDay] = useState<boolean>(task?.dueDateAllDay ?? true);

  /* 説明 */
  const [editingDesc, setEditingDesc] = useState(savedDraft?.editingDesc ?? false);
  const [description, setDescription] = useState(savedDraft?.description ?? task?.description ?? '');

  /* コメント */
  const [comments, setComments] = useState<CollabComment[]>(task?.comments ?? []);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const commentFieldRef = useRef<HTMLDivElement>(null);

  /* 保存中（新規・編集共通）とフッターのエラー表示 */
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const myName = currentUser?.displayName ?? 'あなた';

  /* ドラッグ移動（PC のみ） */
  const { position, handleDragStart } = useModalDrag();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isNew) setComments(task!.comments ?? []);
  }, [isNew, task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentCategory = categories.find((c) => c.id === categoryId);
  const currentColumn = columns.find((c) => c.id === columnId);
  const currentAssignee = members.find((m) => m.userId === assigneeId);

  /* タイトル編集確定（編集モードのみ。ローカル反映のみで Firestore 保存はフッターの保存ボタンで一括実行） */
  function handleTitleConfirm() {
    if (!titleValue.trim()) setTitleValue(task!.title);
    setEditingTitle(false);
  }

  /* 担当者変更（ローカル反映のみ・ピッカーを閉じる） */
  function handleAssigneeChange(val: string) {
    setAssigneeId(val);
    setShowAssigneePicker(false);
  }

  /** 終日トグル: ON→OFF 時は 21:00 をデフォルト時刻に設定 */
  function handleDueDateAllDayToggle() {
    const newAllDay = !dueDateAllDay;
    const newDate = dueDate ? new Date(dueDate) : null;
    if (newDate) {
      newDate.setHours(newAllDay ? 0 : 21, newAllDay ? 0 : 0, 0, 0);
    }
    setDueDateAllDay(newAllDay);
    if (newDate) setDueDate(newDate);
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
    if (!titleValue.trim()) { setTitleError('タイトルを入力してください'); setEditingTitle(true); return; }
    setSaving(true);
    try {
      await createTask({
        teamId,
        title: titleValue.trim(),
        columnId: columnId || columns[0]?.id || '',
        categoryId: categoryId || null,
        assigneeId: assigneeId || null,
        dueDate: dueDate ? dueDate.toISOString() : null,
        dueDateAllDay,
        description: description || null,
      });
      onClose();
    } catch (err) {
      setTitleError(err instanceof Error ? err.message : 'エラーが発生しました');
      setEditingTitle(true);
    } finally { setSaving(false); }
  }

  /* 編集保存: 変更されたフィールドのみを一括で Firestore へ保存する */
  async function handleSaveEdit() {
    // 閲覧のみ権限では編集 UI が出ないため差分は生じないが、念のため書き込みさせない
    if (!canEdit) { onClose(); return; }
    const changes: Partial<Task> = {};
    const trimmedTitle = titleValue.trim();
    if (trimmedTitle && trimmedTitle !== task!.title) changes.title = trimmedTitle;
    if (columnId !== task!.columnId) changes.columnId = columnId;
    if ((categoryId || null) !== task!.categoryId) changes.categoryId = categoryId || null;
    if ((assigneeId || null) !== task!.assigneeId) changes.assigneeId = assigneeId || null;
    const dueChanged =
      (dueDate?.getTime() ?? null) !== (task!.dueDate?.getTime() ?? null) ||
      dueDateAllDay !== (task!.dueDateAllDay ?? true);
    if (dueChanged) {
      changes.dueDate = dueDate;
      changes.dueDateAllDay = dueDateAllDay;
    }
    if ((description || null) !== task!.description) changes.description = description || null;

    if (Object.keys(changes).length === 0) {
      if (draftKey) clearDraft(draftKey);
      onClose();
      return;
    }

    setSaving(true);
    setSaveError('');
    try {
      await updateTask(teamId, task!.id, changes, task!.updatedAt);
      if (draftKey) clearDraft(draftKey);
      onClose();
    } catch (err) {
      setSaveError(
        err instanceof Error && err.message === 'CONFLICT'
          ? '他のメンバーがこのタスクを更新しました。モーダルを開き直して再度編集してください。'
          : '保存に失敗しました。時間をおいて再度お試しください。'
      );
    } finally { setSaving(false); }
  }

  function handleCancel() {
    if (!isNew && editingDesc && draftKey) saveDraft<TaskDetailDraft>(draftKey, { description, editingDesc: true });
    onClose();
  }

  function handleSave() {
    if (isNew) { handleSaveNew(); return; }
    handleSaveEdit();
  }

  /* アバタースタイル */
  function avatarBg(name: string) {
    return ['var(--purple-d)', 'var(--success-dim)', 'var(--warning-dim)', 'var(--danger-dim)'][name.charCodeAt(0) % 4];
  }
  function avatarColor(name: string) {
    return ['var(--purple-l)', 'var(--green)', 'var(--amber-l)', 'var(--danger)'][name.charCodeAt(0) % 4];
  }
  function memberAvatarUrl(authorId: string) {
    return members.find((m) => m.userId === authorId)?.avatarUrl ?? null;
  }

  return (
    <DialogShell
      onClose={handleCancel}
      label={isNew ? 'タスクを作成' : 'タスクの詳細'}
      data-testid="task-detail-modal"
      // .task-modal でモバイル全画面 / PC 1180px（ScheduleModal と同サイズ）に切り替わる
      className="task-modal flex flex-col overflow-hidden border border-border bg-card"
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
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
                    onBlur={isNew ? undefined : handleTitleConfirm}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isNew) handleTitleConfirm();
                      if (e.key === 'Escape' && !isNew) { e.stopPropagation(); setTitleValue(task!.title); setEditingTitle(false); }
                    }}
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
                    <button onClick={() => setEditingTitle(true)} className="shrink-0 text-text-muted hover:text-purple-l transition-colors" aria-label="タイトルを編集">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.013 2.513a1.75 1.75 0 0 1 2.475 2.474L6.226 12.25a2.751 2.751 0 0 1-.892.566l-2.35.864a.75.75 0 0 1-.96-.96l.864-2.35a2.75 2.75 0 0 1 .566-.892l7.56-7.559Z" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
            <button onClick={handleCancel}
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center border border-border text-text-muted hover:text-text transition-colors"
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
                <label className="block text-[11px] font-semibold text-text-muted tracking-[0.06em] uppercase mb-1.5">ステータス</label>
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
                    <Dropdown value={columnId} options={columns.map((c) => ({ value: c.id, label: c.name }))} onChange={setColumnId} scroll className="flex-1" />
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
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: currentColumn?.color ?? 'var(--text-muted)' }} />
                    )}
                    <span className="text-[13px] text-text">{currentColumn?.name ?? '—'}</span>
                  </div>
                )}
              </div>
              {/* カテゴリ */}
              <div>
                <label className="block text-[11px] font-semibold text-text-muted tracking-[0.06em] uppercase mb-1.5">カテゴリ</label>
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
                    <Dropdown value={categoryId} options={categories.map((c) => ({ value: c.id, label: c.name }))} placeholder="なし" onChange={setCategoryId} scroll className="flex-1" />
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
                <label className="block text-[11px] font-semibold text-text-muted tracking-[0.06em] uppercase mb-1.5">担当者</label>
                {canEdit ? (
                  <>
                    <button type="button" onClick={() => setShowAssigneePicker((v) => !v)}
                      className="w-full flex items-center gap-2 px-3 py-2 border border-border rounded-[8px] bg-bg text-left text-[13px] outline-none hover:border-border-l transition-colors">
                      {currentAssignee ? (
                        <><Avatar initials={currentAssignee.displayName.slice(0, 2)} src={currentAssignee.avatarUrl} bgClass="bg-purple-d/30" textClass="text-purple-l" size="sm" />
                          <span className="flex-1 text-text truncate">{currentAssignee.displayName}</span></>
                      ) : <span className="flex-1 text-text-muted">なし</span>}
                      <Icon name="chevron_down" size={14} className={`text-text-muted${showAssigneePicker ? ' rotate-180' : ''}`} />
                    </button>
                    {showAssigneePicker && (
                      <div className="mt-1 border border-border rounded-[10px] overflow-hidden z-10 relative">
                        <button type="button" onClick={() => handleAssigneeChange('')}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-[13px] transition-colors text-left ${!assigneeId ? 'bg-purple/10 text-purple-l' : 'hover:bg-surface text-text-muted'}`}>
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
                {canEdit ? (
                  <>
                    <label className="block text-[11px] font-semibold text-text-muted tracking-[0.06em] uppercase mb-1.5">締切日</label>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <DateField
                          value={dueDate}
                          onChange={setDueDate}
                          hideTime={dueDateAllDay}
                          placeholder="日付を選択"
                        />
                      </div>
                      <label
                        className={`allday${dueDateAllDay ? ' is-on' : ''}`}
                        onClick={handleDueDateAllDayToggle}
                        style={{ paddingBottom: 11, flexShrink: 0 }}
                      >
                        <span className="allday__txt">終日</span>
                        <span className="allday__sw" />
                      </label>
                    </div>
                  </>
                ) : (
                  <>
                    <label className="block text-[11px] font-semibold text-text-muted tracking-[0.06em] uppercase mb-1.5">締切日</label>
                    <span className="text-[13px] text-text font-num py-2 block">
                      {task?.dueDate
                        ? (task.dueDateAllDay ?? true)
                          ? format(task.dueDate, 'yyyy/MM/dd', { locale: ja })
                          : format(task.dueDate, 'yyyy/MM/dd HH:mm', { locale: ja })
                        : '—'}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* 説明 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-semibold text-text-muted tracking-[0.06em] uppercase">詳細</label>
                {canEdit && !editingDesc && (
                  <button onClick={() => setEditingDesc(true)} className="text-text-muted hover:text-purple-l transition-colors" aria-label="詳細を編集">
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
                      className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border border-border text-text-muted hover:text-text">
                      キャンセル
                    </button>
                    {!isNew && (
                      <button onClick={() => setEditingDesc(false)}
                        className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold"
                        style={{ background: 'var(--purple-d)', color: 'var(--purple-l)' }}>
                        完了
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
                <p className="text-[11px] font-semibold text-text-muted tracking-[0.06em] uppercase">コメント / メモ</p>
              </div>
              {/* コメントリスト */}
              <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3" style={{ minHeight: 0 }}>
                {comments.length === 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-[10px] text-[12px] text-text-muted" style={{ background: 'var(--surface)', border: '1px dashed var(--border)' }}>
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
                        <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
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
                    className="flex-1 bg-transparent text-[13px] text-text outline-none placeholder:text-text-muted"
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
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[13px] font-semibold border transition-colors"
              style={{ background: 'var(--danger-dim)', color: 'var(--danger)', borderColor: 'color-mix(in oklab, var(--danger) 30%, transparent)' }}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2 4h12M5 4V2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5V4m2 0-1 9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1L3 4" />
              </svg>
              削除
            </button>
          )}
          {/* AIに相談（編集モード・canEdit のみ）: タスクをピン留めして AI チャットへ */}
          {!isNew && canEdit && (
            <button onClick={handleConsultAI}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[13px] font-semibold border border-purple/20 text-purple bg-purple/5 hover:bg-purple/10 transition-colors mr-auto">
              <Icon name="auto_awesome" size={14} />
              AIに相談
            </button>
          )}
          {/* キャンセル + 保存 */}
          <div className="ml-auto flex items-center gap-2">
            {saveError && <p className="text-[11px] text-live">{saveError}</p>}
            <button onClick={handleCancel}
              className="px-4 py-2 rounded-[10px] text-[13px] font-semibold border border-border text-text-muted hover:text-text transition-colors">
              キャンセル
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 rounded-[10px] text-[13px] font-semibold disabled:opacity-40 transition-opacity"
              style={{ background: 'var(--purple-d)', color: 'var(--purple-l)' }}>
              {saving ? (isNew ? '作成中...' : '保存中...') : '保存'}
            </button>
          </div>
        </div>
    </DialogShell>
  );
}
