'use client';

import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { createSchedule, updateSchedule, deleteSchedule } from '@/lib/repositories/schedules';
import { useAuthStore } from '@/stores/auth';
import { DateField } from '@/components/ui/DateField';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import { saveDraft, loadDraft, clearDraft, DRAFT_KEYS } from '@/lib/formDraft';
import { Icon } from '@/components/ui/Icon';
import { Dropdown } from '@/components/ui/Dropdown';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { ScheduleEntry, ScheduleCategory } from '@/types/entities';

/* ── 型定義 ─────────────────────────────────────────────────────── */

export interface ScheduleModalProps {
  /** null のとき新規追加モード、ScheduleEntry のとき編集モード */
  schedule: ScheduleEntry | null;
  /** 初期日付（セルクリック時にセットする日付） */
  initialDate?: Date;
  teamId: string;
  canEdit: boolean;
  categories: ScheduleCategory[];
  onClose: () => void;
  /** 削除完了時のコールバック */
  onDeleted: () => void;
}

interface ScheduleModalDraft {
  title: string;
  categoryId: string;
  startAt: Date | null;
  endAt: Date | null;
  description: string;
  allDay: boolean;
}

/* ローカルコメントの型（コメントスレッド用） */
interface LocalComment {
  id: string;
  authorName: string;
  authorInitials: string;
  text: string;
  time: string;
  replies: Array<{
    id: string;
    authorName: string;
    authorInitials: string;
    text: string;
    time: string;
  }>;
}

/* ── ScheduleModal コンポーネント ────────────────────────────────── */

export function ScheduleModal({
  schedule,
  initialDate,
  teamId,
  canEdit,
  categories,
  onClose,
  onDeleted,
}: ScheduleModalProps) {
  const { currentUser } = useAuthStore();
  const isNew = schedule === null;

  /* ── ドラフトキー ─────────────────────────────── */
  const draftKey = isNew ? DRAFT_KEYS.SCHEDULE_NEW : DRAFT_KEYS.scheduleEdit(schedule!.id);
  const savedDraft = loadDraft<ScheduleModalDraft>(draftKey);

  /* ── フォーム初期値 ───────────────────────────── */
  const defaultStart = isNew
    ? (savedDraft?.startAt ?? initialDate ?? null)
    : schedule!.startAt;
  /* 開始日時が設定されている場合は2時間後を終了日時として初期設定 */
  const defaultEnd = isNew
    ? (savedDraft?.endAt ?? (initialDate ? new Date(initialDate.getTime() + 2 * 60 * 60 * 1000) : null))
    : schedule!.endAt;

  /* ── フォーム状態 ─────────────────────────────── */
  const [title, setTitle] = useState(savedDraft?.title ?? (isNew ? '' : schedule!.title));
  const [categoryId, setCategoryId] = useState(
    savedDraft?.categoryId ?? (isNew ? '' : (schedule!.categoryId ?? ''))
  );
  const [startAt, setStartAt] = useState<Date | null>(defaultStart);
  const [endAt, setEndAt] = useState<Date | null>(defaultEnd);
  const [description, setDescription] = useState(
    savedDraft?.description ?? (isNew ? '' : schedule!.description)
  );
  const [isAllDay, setIsAllDay] = useState(
    savedDraft?.allDay ?? (isNew ? false : (schedule!.allDay ?? false))
  );

  /* ── UI 状態 ──────────────────────────────────── */
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── ドラッグ移動 ─────────────────────────────── */
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });

  /* オーバーレイのマウスダウン追跡（ドラッグ誤閉じ防止） */
  const mouseDownOnOverlay = useRef(false);

  /* ── コメント状態 ─────────────────────────────── */
  const [comments, setComments] = useState<LocalComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const myInitials = (currentUser?.displayName ?? 'ME').slice(0, 2).toUpperCase();
  const myName = currentUser?.displayName ?? 'あなた';

  /* ── ドラッグイベント登録 ─────────────────────── */
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
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  /* ── フォーム変更のたびにドラフトを保存 ────────── */
  useEffect(() => {
    saveDraft<ScheduleModalDraft>(draftKey, {
      title,
      categoryId,
      startAt,
      endAt,
      description,
      allDay: isAllDay,
    });
  }, [title, categoryId, startAt, endAt, description, isAllDay]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── ドラッグ開始ハンドラ ─────────────────────── */
  function handleDragStart(e: React.MouseEvent) {
    /* インタラクティブ要素では発火しない */
    if ((e.target as HTMLElement).closest('button, input, select, a, textarea')) return;
    isDragging.current = true;
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    e.preventDefault();
  }

  /* ── 終日トグル（双方向） ─────────────────────── */
  function toggleAllDay() {
    if (!isAllDay) {
      /* OFF → ON: 時刻を 00:00 にリセット */
      const s = new Date(startAt ?? new Date());
      s.setHours(0, 0, 0, 0);
      const e = new Date(endAt ?? new Date());
      e.setHours(0, 0, 0, 0);
      setStartAt(s);
      setEndAt(e);
      setIsAllDay(true);
    } else {
      /* ON → OFF: デフォルト時刻を復元（21:00 / 23:30） */
      const s = new Date(startAt ?? new Date());
      s.setHours(21, 0, 0, 0);
      const e = new Date(endAt ?? new Date());
      e.setHours(23, 30, 0, 0);
      setStartAt(s);
      setEndAt(e);
      setIsAllDay(false);
    }
  }

  /* ── 開始日時変更（終了日時が未設定なら2時間後を自動補完） ─── */
  function handleStartAtChange(date: Date | null) {
    setStartAt(date);
    if (date && !endAt) {
      setEndAt(new Date(date.getTime() + 2 * 60 * 60 * 1000));
    }
  }

  /* ── 保存ハンドラ ─────────────────────────────── */
  async function handleSave() {
    if (!title.trim()) {
      setError('タイトルを入力してください');
      return;
    }
    if (!startAt || !endAt) {
      setError('開始日時と終了日時を入力してください');
      return;
    }
    if (!isAllDay && endAt <= startAt) {
      setError('終了日時は開始日時より後にしてください');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        if (!currentUser) return;
        await createSchedule(teamId, {
          title: title.trim(),
          categoryId: categoryId || null,
          startAt,
          endAt,
          description,
          participantIds: [],
          collabPartnerName: null,
          linkedTaskIds: [],
          allDay: isAllDay,
          createdBy: currentUser.uid,
        });
      } else {
        await updateSchedule(
          teamId,
          schedule!.id,
          {
            title: title.trim(),
            categoryId: categoryId || null,
            startAt,
            endAt,
            description,
            allDay: isAllDay,
          },
          schedule!.updatedAt
        );
      }
      clearDraft(draftKey);
      onClose();
    } catch {
      setError('保存に失敗しました。もう一度お試しください');
    } finally {
      setSaving(false);
    }
  }

  /* ── 削除ハンドラ（編集モード時のみ） ────────── */
  async function handleDelete() {
    if (!confirm('この予定を削除しますか？')) return;
    await deleteSchedule(teamId, schedule!.id);
    clearDraft(draftKey);
    onDeleted();
    onClose();
  }

  /* ── コメント追加 ─────────────────────────────── */
  function addComment() {
    if (!commentText.trim()) return;
    const newComment: LocalComment = {
      id: `c-${Date.now()}`, // eslint-disable-line react-hooks/purity
      authorName: myName,
      authorInitials: myInitials,
      text: commentText.trim(),
      time: format(new Date(), 'HH:mm', { locale: ja }),
      replies: [],
    };
    setComments((prev) => [...prev, newComment]);
    setCommentText('');
  }

  /* ── 返信追加 ─────────────────────────────────── */
  function addReply(commentId: string) {
    if (!replyText.trim()) return;
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              replies: [
                ...c.replies,
                {
                  id: `r-${Date.now()}`,
                  authorName: myName,
                  authorInitials: myInitials,
                  text: replyText.trim(),
                  time: format(new Date(), 'HH:mm', { locale: ja }),
                },
              ],
            }
          : c
      )
    );
    setReplyText('');
    setReplyingTo(null);
  }

  /* ── レンダリング ─────────────────────────────── */
  return (
    /* オーバーレイ */
    <div
      className="fixed inset-0 z-[280] flex items-center justify-center p-4"
      style={{ background: 'rgba(6,6,16,0.85)', backdropFilter: 'blur(6px)' }}
      onMouseDown={(e) => { mouseDownOnOverlay.current = e.target === e.currentTarget; }}
      onClick={() => { if (mouseDownOnOverlay.current) onClose(); }}
    >
      {/* モーダル本体（870px 幅、pop-modal アニメーション） */}
      <div
        className="flex flex-col overflow-hidden rounded-[24px] animate-pop-modal"
        style={{
          width: 'min(870px, calc(100vw - 32px))',
          minWidth: '320px',
          maxHeight: 'calc(100vh - 32px)',
          background: 'var(--card-2)',
          border: '1px solid var(--border-l)',
          boxShadow: 'var(--shadow-xl)',
          transform: `translate(${position.x}px, ${position.y}px)`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー（ドラッグハンドル） */}
        <div
          className="px-8 pt-6 pb-5 flex items-start justify-between gap-4 shrink-0 cursor-move"
          style={{ borderBottom: '1px solid var(--border)' }}
          onMouseDown={handleDragStart}
        >
          <div>
            <h2
              className="text-[18px] font-bold flex items-center gap-2"
              style={{ color: 'var(--text-primary)' }}
            >
              <Icon name={isNew ? 'add' : 'edit'} size={20} />
              {isNew ? '予定を追加' : '予定を編集'}
            </h2>
            <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>
              {isNew
                ? '新しい予定の内容を入力して保存してください。'
                : '予定の内容を編集して保存してください。'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* フォームボディ */}
        <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-5">

          {/* タイトル */}
          <Input
            label="タイトル *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder="予定のタイトルを入力"
          />

          {/* カテゴリ */}
          <div className="flex flex-col gap-1.5">
            <label
              className="text-[12px] font-semibold"
              style={{ color: 'var(--text-secondary)' }}
            >
              カテゴリ
            </label>
            <Dropdown
              value={categoryId}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="未選択"
              onChange={setCategoryId}
              scroll
            />
          </div>

          {/* 日時グリッド（2カラム） */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 開始日時 + 終日トグル（右揃え） */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  className="text-[12px] font-semibold"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  開始日時 *
                </label>
                {/* 終日トグル（双方向: ON→OFFも可能） */}
                <button
                  type="button"
                  onClick={toggleAllDay}
                  className="px-2.5 py-1 rounded-[8px] text-[11px] font-semibold border transition-colors"
                  style={
                    isAllDay
                      ? { borderColor: 'var(--primary)', color: 'var(--primary)' }
                      : { borderColor: 'var(--border)', color: 'var(--text-muted)' }
                  }
                  onMouseEnter={(e) => {
                    if (!isAllDay) {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary-300)';
                      (e.currentTarget as HTMLElement).style.color = 'var(--primary-300)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isAllDay) {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                      (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                    }
                  }}
                >
                  終日
                </button>
              </div>
              <DateField
                value={startAt}
                onChange={handleStartAtChange}
                hideTime={isAllDay}
                placeholder="開始日時を選択"
              />
            </div>

            {/* 終了日時 */}
            <div className="flex flex-col gap-1.5">
              <label
                className="text-[12px] font-semibold"
                style={{ color: 'var(--text-secondary)' }}
              >
                終了日時
              </label>
              <DateField
                value={endAt}
                onChange={(d) => setEndAt(d)}
                min={startAt ?? undefined}
                hideTime={isAllDay}
                placeholder="終了日時を選択"
              />
            </div>
          </div>

          {/* 説明（Markdown エディタ・プレビュー切替付き） */}
          <MarkdownEditor
            label="説明"
            value={description}
            onChange={setDescription}
            placeholder="予定の詳細を入力..."
            maxLength={1000}
            rows={4}
          />

          {/* エラーメッセージ */}
          {error && (
            <p className="text-[12px]" style={{ color: 'var(--danger)' }}>
              {error}
            </p>
          )}

          {/* コメント / メモ（編集モードのみ表示） */}
          {!isNew && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
              <div
                className="text-[13px] font-semibold tracking-[0.05em] mb-4"
                style={{ color: 'var(--text-muted)' }}
              >
                コメント / メモ
              </div>

              {/* コメントツリー */}
              {comments.length > 0 && (
                <div className="flex flex-col gap-4 mb-6">
                  {comments.map((comment) => (
                    <div key={comment.id}>
                      {/* 親コメント */}
                      <div className="flex gap-3">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5"
                          style={{ background: 'var(--purple-d)', color: 'var(--purple-l)' }}
                        >
                          {comment.authorInitials}
                        </div>
                        <div
                          className="flex-1 px-4 py-3 rounded-[0_12px_12px_12px]"
                          style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                        >
                          <div
                            className="flex justify-between text-[12px] mb-1.5"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            <strong style={{ color: 'var(--text-primary)' }}>
                              {comment.authorName}
                            </strong>
                            <span>{comment.time}</span>
                          </div>
                          <p
                            className="text-[14px] leading-relaxed mb-2"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {comment.text}
                          </p>
                          <button
                            onClick={() =>
                              setReplyingTo(replyingTo === comment.id ? null : comment.id)
                            }
                            className="text-[12px] font-semibold transition-colors"
                            style={{ color: 'var(--text-muted)' }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.color = 'var(--primary-300)';
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                            }}
                          >
                            返信する
                          </button>
                        </div>
                      </div>

                      {/* 返信一覧 */}
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="flex gap-3 ml-10 mt-3 relative">
                          <div className="absolute -left-[22px] top-0 bottom-5 w-0.5 bg-border rounded" />
                          <div className="absolute -left-[22px] top-5 w-3 h-0.5 bg-border rounded" />
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5"
                            style={{
                              background: 'rgba(239,159,39,0.2)',
                              color: 'var(--amber-l)',
                            }}
                          >
                            {reply.authorInitials}
                          </div>
                          <div
                            className="flex-1 px-4 py-3 rounded-[0_12px_12px_12px]"
                            style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                          >
                            <div
                              className="flex justify-between text-[12px] mb-1.5"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              <strong style={{ color: 'var(--text-primary)' }}>
                                {reply.authorName}
                              </strong>
                              <span>{reply.time}</span>
                            </div>
                            <p
                              className="text-[14px] leading-relaxed"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {reply.text}
                            </p>
                          </div>
                        </div>
                      ))}

                      {/* 返信入力欄 */}
                      {replyingTo === comment.id && (
                        <div className="flex gap-3 ml-10 mt-3">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5"
                            style={{ background: 'var(--purple-d)', color: 'var(--purple-l)' }}
                          >
                            {myInitials}
                          </div>
                          <div className="flex-1 flex flex-col gap-2">
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="返信を入力..."
                              rows={2}
                              className="w-full px-4 py-3 rounded-[12px] text-[13px] outline-none resize-y min-h-[60px] transition-colors"
                              style={{
                                background: 'var(--bg)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-primary)',
                              }}
                            />
                            <div className="flex gap-2 self-end">
                              <button
                                onClick={() => setReplyingTo(null)}
                                className="px-3 py-1 text-[12px] rounded-[6px] border transition-colors"
                                style={{
                                  color: 'var(--text-muted)',
                                  borderColor: 'var(--border)',
                                }}
                              >
                                キャンセル
                              </button>
                              <button
                                onClick={() => addReply(comment.id)}
                                disabled={!replyText.trim()}
                                className="px-3 py-1 text-[12px] rounded-[6px] transition-colors disabled:opacity-40"
                                style={{
                                  background: 'var(--purple-d)',
                                  color: 'var(--purple-l)',
                                }}
                                onMouseEnter={(e) => {
                                  if (replyText.trim())
                                    (e.currentTarget as HTMLElement).style.background =
                                      'var(--primary)';
                                }}
                                onMouseLeave={(e) => {
                                  (e.currentTarget as HTMLElement).style.background =
                                    'var(--purple-d)';
                                }}
                              >
                                送信
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 新規コメント入力 */}
              <div className="flex gap-3">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5"
                  style={{ background: 'var(--purple-d)', color: 'var(--purple-l)' }}
                >
                  {myInitials}
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="チームへコメントを残す..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-[12px] text-[14px] outline-none resize-y min-h-[70px] transition-colors"
                    style={{
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <div className="self-end">
                    <button
                      onClick={addComment}
                      disabled={!commentText.trim()}
                      className="px-4 py-1.5 text-[13px] font-semibold rounded-[12px] transition-colors disabled:opacity-40"
                      style={{ background: 'var(--purple-d)', color: 'var(--purple-l)' }}
                      onMouseEnter={(e) => {
                        if (commentText.trim())
                          (e.currentTarget as HTMLElement).style.background = 'var(--primary)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'var(--purple-d)';
                      }}
                    >
                      送信
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* フッター: キャンセル | 削除（編集のみ）| 保存 */}
        <div
          className="px-8 py-4 flex items-center gap-3 shrink-0"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}
        >
          {/* 削除ボタン（編集モード・canEdit のみ表示） */}
          {!isNew && canEdit && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-[12px] text-[13px] font-semibold border transition-colors"
              style={{
                background: 'rgba(226,53,57,0.15)',
                color: '#ff6b70',
                borderColor: 'rgba(226,53,57,0.3)',
              }}
            >
              <Icon name="delete" size={16} />
              削除
            </button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" onClick={onClose}>
            キャンセル
          </Button>
          {canEdit && (
            <Button variant="primary" onClick={handleSave} loading={saving}>
              保存する
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
