'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { updateSchedule, deleteSchedule } from '@/lib/repositories/schedules';
import { useAuthStore } from '@/stores/auth';
import type { ScheduleEntry, ScheduleCategory } from '@/types/entities';

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

interface ScheduleDetailModalProps {
  schedule: ScheduleEntry;
  teamId: string;
  canEdit: boolean;
  categories: ScheduleCategory[];
  onClose: () => void;
  onDeleted: () => void;
}

const inputClass =
  'w-full bg-bg border border-border text-text px-3 py-2 rounded-[8px] text-[13px] outline-none transition-colors focus:border-purple';

export function ScheduleDetailModal({
  schedule,
  teamId,
  canEdit,
  categories,
  onClose,
  onDeleted,
}: ScheduleDetailModalProps) {
  const { currentUser } = useAuthStore();

  /* ── 日時編集 ─────────────────────────────── */
  const [editingDate, setEditingDate] = useState(false);
  const [startAt, setStartAt] = useState(schedule.startAt.toISOString().slice(0, 16));
  const [endAt, setEndAt] = useState(schedule.endAt.toISOString().slice(0, 16));
  const [savingDate, setSavingDate] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);

  /* ── カテゴリ編集 ─────────────────────────── */
  const [categoryId, setCategoryId] = useState<string>(schedule.categoryId ?? '');
  const [savingCategory, setSavingCategory] = useState(false);

  /* ── 内容（description）編集 ─────────────── */
  const [editingDesc, setEditingDesc] = useState(false);
  const [description, setDescription] = useState(schedule.description);
  const [savingDesc, setSavingDesc] = useState(false);

  /* ── コメントローカル状態 ───────────────── */
  const [comments, setComments] = useState<LocalComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const myInitials = (currentUser?.displayName ?? 'ME').slice(0, 2).toUpperCase();
  const myName = currentUser?.displayName ?? 'あなた';

  const currentCategory = categories.find((c) => c.id === categoryId);

  /* ── 日時保存 ─────────────────────────────── */
  async function handleSaveDate() {
    const start = new Date(startAt);
    const end = new Date(endAt);
    if (end <= start) {
      setDateError('終了日時は開始日時より後にしてください');
      return;
    }
    setDateError(null);
    setSavingDate(true);
    try {
      await updateSchedule(teamId, schedule.id, { startAt: start, endAt: end }, schedule.updatedAt);
      setEditingDate(false);
    } catch {
      setDateError('保存に失敗しました。もう一度お試しください');
    } finally {
      setSavingDate(false);
    }
  }

  /* ── カテゴリ保存 ─────────────────────────── */
  async function handleCategoryChange(newCategoryId: string) {
    const prev = categoryId;
    setCategoryId(newCategoryId);
    setSavingCategory(true);
    try {
      await updateSchedule(
        teamId,
        schedule.id,
        { categoryId: newCategoryId || null },
        schedule.updatedAt
      );
    } catch {
      setCategoryId(prev);
    } finally {
      setSavingCategory(false);
    }
  }

  /* ── 内容保存 ─────────────────────────────── */
  async function handleSaveDesc() {
    setSavingDesc(true);
    try {
      await updateSchedule(teamId, schedule.id, { description }, schedule.updatedAt);
      setEditingDesc(false);
    } catch {
      /* ローカル状態はそのまま維持 */
    } finally {
      setSavingDesc(false);
    }
  }

  /* ── 削除 ─────────────────────────────────── */
  async function handleDelete() {
    if (!confirm('この予定を削除しますか？')) return;
    await deleteSchedule(teamId, schedule.id);
    onDeleted();
  }

  /* ── コメント追加 ─────────────────────────── */
  function addComment() {
    if (!commentText.trim()) return;
    const newComment: LocalComment = {
      id: `c-${Date.now()}`,
      authorName: myName,
      authorInitials: myInitials,
      text: commentText.trim(),
      time: format(new Date(), 'HH:mm', { locale: ja }),
      replies: [],
    };
    setComments((prev) => [...prev, newComment]);
    setCommentText('');
  }

  /* ── 返信追加 ─────────────────────────────── */
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

  return (
    <div
      className="absolute inset-0 z-[290] flex items-center justify-center p-10"
      style={{ background: 'rgba(6,6,16,0.85)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-[720px] max-h-[90vh] bg-card-2 border border-border-l rounded-[24px] flex flex-col overflow-hidden"
        style={{ boxShadow: 'var(--shadow-xl)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* カテゴリカラーのグラデーションバー */}
        <div
          className="h-[6px] shrink-0"
          style={{
            background: currentCategory
              ? `linear-gradient(90deg, ${currentCategory.color}cc, ${currentCategory.color})`
              : 'linear-gradient(90deg, var(--purple-d), var(--purple-l))',
          }}
        />

        {/* ヘッダー */}
        <div className="px-8 pt-6 pb-5 border-b border-border flex items-start gap-4 shrink-0">
          <div
            className="w-14 h-14 rounded-[18px] flex items-center justify-center shrink-0"
            style={{
              background: currentCategory ? `${currentCategory.color}33` : 'var(--purple-md)',
            }}
          >
            <span
              className="material-icons text-[28px]"
              style={{ color: currentCategory?.color ?? 'var(--purple-l)' }}
            >
              {currentCategory?.icon ?? 'event'}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-[20px] font-bold text-text mb-2.5 leading-snug">
              {schedule.title}
            </div>
            {currentCategory && (
              <div className="flex items-center gap-2.5 flex-wrap">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
                  style={{
                    background: `${currentCategory.color}22`,
                    color: currentCategory.color,
                    border: `1px solid ${currentCategory.color}44`,
                  }}
                >
                  <span className="material-icons text-[12px]">{currentCategory.icon}</span>
                  {currentCategory.name}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="shrink-0 w-9 h-9 rounded-full bg-surface border border-border text-muted hover:text-text flex items-center justify-center transition-colors"
          >
            <span className="material-icons text-[20px]">close</span>
          </button>
        </div>

        {/* ボディ */}
        <div className="px-8 py-6 flex-1 flex flex-col gap-6 overflow-y-auto">

          {/* 日時 */}
          <div className="flex gap-4">
            <span className="material-icons text-muted text-[22px] w-7 text-center pt-0.5 shrink-0">
              schedule
            </span>
            <div className="flex-1">
              <div className="text-[13px] text-muted font-semibold tracking-[0.05em] mb-1.5 flex items-center justify-between">
                <span>日時</span>
                {canEdit && !editingDate && (
                  <button
                    onClick={() => setEditingDate(true)}
                    className="text-muted hover:text-purple-l transition-colors"
                    title="日時を編集"
                  >
                    <span className="material-icons text-[16px]">calendar_month</span>
                  </button>
                )}
              </div>

              {editingDate ? (
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] text-muted">開始</label>
                  <input
                    type="datetime-local"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    className={inputClass}
                  />
                  <label className="text-[11px] text-muted">終了</label>
                  <input
                    type="datetime-local"
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                    className={inputClass}
                  />
                  {dateError && <p className="text-[12px] text-live">{dateError}</p>}
                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      onClick={() => {
                        setEditingDate(false);
                        setDateError(null);
                        setStartAt(schedule.startAt.toISOString().slice(0, 16));
                        setEndAt(schedule.endAt.toISOString().slice(0, 16));
                      }}
                      className="px-3 py-1 text-[12px] text-muted border border-border rounded-[6px] hover:text-text transition-colors"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleSaveDate}
                      disabled={savingDate}
                      className="px-3 py-1 text-[12px] bg-purple-d text-purple-l rounded-[6px] hover:bg-purple transition-colors disabled:opacity-50"
                    >
                      {savingDate ? '保存中...' : '保存'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-[15px] font-medium text-text font-num">
                  {format(schedule.startAt, 'yyyy年 MM月 dd日（E）', { locale: ja })}
                  <br />
                  <span className="text-[20px] text-purple-l font-bold">
                    {format(schedule.startAt, 'HH:mm')} – {format(schedule.endAt, 'HH:mm')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* カテゴリ */}
          <div className="flex gap-4">
            <span className="material-icons text-muted text-[22px] w-7 text-center pt-0.5 shrink-0">
              label
            </span>
            <div className="flex-1">
              <div className="text-[13px] text-muted font-semibold tracking-[0.05em] mb-1.5">
                カテゴリ
              </div>
              {canEdit ? (
                <select
                  value={categoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  disabled={savingCategory}
                  className="bg-bg border border-border text-text px-3 py-2 rounded-[8px] text-[13px] outline-none focus:border-purple disabled:opacity-50 transition-colors"
                >
                  <option value="">未選択</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-[15px] font-medium text-text">
                  {currentCategory?.name ?? '未選択'}
                </div>
              )}
            </div>
          </div>

          {/* 内容 */}
          <div className="flex gap-4">
            <span className="material-icons text-muted text-[22px] w-7 text-center pt-0.5 shrink-0">
              description
            </span>
            <div className="flex-1">
              <div className="text-[13px] text-muted font-semibold tracking-[0.05em] mb-1.5 flex items-center justify-between">
                <span>内容</span>
                {canEdit && !editingDesc && (
                  <button
                    onClick={() => setEditingDesc(true)}
                    className="text-muted hover:text-purple-l transition-colors"
                    title="内容を編集"
                  >
                    <span className="material-icons text-[16px]">edit</span>
                  </button>
                )}
              </div>

              {editingDesc ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    maxLength={1000}
                    className="w-full bg-bg border border-border text-text px-3 py-2 rounded-[8px] text-[13px] outline-none focus:border-purple resize-y transition-colors"
                  />
                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      onClick={() => {
                        setDescription(schedule.description);
                        setEditingDesc(false);
                      }}
                      className="px-3 py-1 text-[12px] text-muted border border-border rounded-[6px] hover:text-text transition-colors"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleSaveDesc}
                      disabled={savingDesc}
                      className="px-3 py-1 text-[12px] bg-purple-d text-purple-l rounded-[6px] hover:bg-purple transition-colors disabled:opacity-50"
                    >
                      {savingDesc ? '保存中...' : '保存'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-[14px] text-text-2 leading-relaxed whitespace-pre-wrap">
                  {description || (
                    <span className="text-muted italic text-[13px]">内容なし</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* コラボ相手 */}
          {schedule.collabPartnerName && (
            <div className="flex gap-4">
              <span className="material-icons text-muted text-[22px] w-7 text-center pt-0.5 shrink-0">
                handshake
              </span>
              <div className="flex-1">
                <div className="text-[13px] text-muted font-semibold tracking-[0.05em] mb-1.5">
                  コラボ相手
                </div>
                <div className="text-[15px] font-medium text-text">
                  {schedule.collabPartnerName}
                </div>
              </div>
            </div>
          )}

          {/* コメント / メモ */}
          <div className="border-t border-border pt-6">
            <div className="text-[13px] text-muted font-semibold tracking-[0.05em] mb-4">
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
                      <div className="flex-1 bg-bg border border-border rounded-[0_12px_12px_12px] px-4 py-3">
                        <div className="flex justify-between text-[12px] text-muted mb-1.5">
                          <strong className="text-text font-semibold">{comment.authorName}</strong>
                          <span>{comment.time}</span>
                        </div>
                        <p className="text-[14px] text-text leading-relaxed mb-2">{comment.text}</p>
                        <button
                          onClick={() =>
                            setReplyingTo(replyingTo === comment.id ? null : comment.id)
                          }
                          className="text-[12px] font-semibold text-muted hover:text-purple-l transition-colors"
                        >
                          返信する
                        </button>
                      </div>
                    </div>

                    {/* 返信 */}
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="flex gap-3 ml-10 mt-3 relative">
                        <div className="absolute -left-[22px] top-0 bottom-5 w-0.5 bg-border rounded" />
                        <div className="absolute -left-[22px] top-5 w-3 h-0.5 bg-border rounded" />
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5"
                          style={{ background: 'rgba(239,159,39,0.2)', color: 'var(--amber-l)' }}
                        >
                          {reply.authorInitials}
                        </div>
                        <div className="flex-1 bg-bg border border-border rounded-[0_12px_12px_12px] px-4 py-3">
                          <div className="flex justify-between text-[12px] text-muted mb-1.5">
                            <strong className="text-text font-semibold">{reply.authorName}</strong>
                            <span>{reply.time}</span>
                          </div>
                          <p className="text-[14px] text-text leading-relaxed">{reply.text}</p>
                        </div>
                      </div>
                    ))}

                    {/* 返信入力 */}
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
                            className="w-full bg-bg border border-border text-text px-4 py-3 rounded-[12px] text-[13px] outline-none focus:border-purple resize-y min-h-[60px] transition-colors"
                          />
                          <div className="flex gap-2 self-end">
                            <button
                              onClick={() => setReplyingTo(null)}
                              className="px-3 py-1 text-[12px] text-muted border border-border rounded-[6px] hover:text-text transition-colors"
                            >
                              キャンセル
                            </button>
                            <button
                              onClick={() => addReply(comment.id)}
                              disabled={!replyText.trim()}
                              className="px-3 py-1 text-[12px] bg-purple-d text-purple-l rounded-[6px] hover:bg-purple transition-colors disabled:opacity-40"
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
                  className="w-full bg-bg border border-border text-text px-4 py-3 rounded-[12px] text-[14px] outline-none focus:border-purple resize-y min-h-[70px] transition-colors"
                />
                <div className="self-end">
                  <button
                    onClick={addComment}
                    disabled={!commentText.trim()}
                    className="px-4 py-1.5 text-[13px] font-semibold bg-purple-d text-purple-l rounded-[12px] hover:bg-purple transition-colors disabled:opacity-40"
                  >
                    送信
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="px-8 py-5 border-t border-border bg-surface flex items-center gap-4 shrink-0">
          {canEdit && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-[12px] text-[13px] font-semibold border transition-colors mr-auto"
              style={{
                background: 'rgba(226,53,57,0.15)',
                color: '#ff6b70',
                borderColor: 'rgba(226,53,57,0.3)',
              }}
            >
              <span className="material-icons text-[16px]">delete</span>
              削除
            </button>
          )}
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-[12px] text-[13px] font-semibold bg-purple-d text-purple-l hover:bg-purple transition-colors"
          >
            <span className="material-icons text-[16px]">check</span>
            確定
          </button>
        </div>
      </div>
    </div>
  );
}
