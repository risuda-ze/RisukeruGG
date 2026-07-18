'use client';

import { useState, useRef, useEffect } from 'react';
import { format, startOfDay, addDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import { createSchedule, updateSchedule, deleteSchedule } from '@/lib/repositories/schedules';
import { trackEvent } from '@/lib/analytics';
import { useAuthStore } from '@/stores/auth';
import { DateField } from '@/components/ui/DateField';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import { saveDraft, loadDraft, clearDraft, DRAFT_KEYS } from '@/lib/formDraft';
import { Icon } from '@/components/ui/Icon';
import { Dropdown } from '@/components/ui/Dropdown';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import type { ScheduleEntry, Category } from '@/types/entities';
import { getEventLastDay } from '@/lib/utils/eventDays';

export interface ScheduleModalProps {
  schedule: ScheduleEntry | null;
  initialDate?: Date;
  teamId: string;
  canEdit: boolean;
  categories: Category[];
  onClose: () => void;
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

export function ScheduleModal({
  schedule,
  initialDate,
  teamId,
  canEdit,
  categories,
  onClose,
  onDeleted,
}: ScheduleModalProps) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const isNew = schedule === null;
  /* スマホ縦持ち（md 未満）ではボトムシート表示・ドラッグ/リサイズ無効化 */
  const isMobile = useMediaQuery(767);

  const draftKey = isNew ? DRAFT_KEYS.SCHEDULE_NEW : DRAFT_KEYS.scheduleEdit(schedule!.id);
  const savedDraft = loadDraft<ScheduleModalDraft>(draftKey);

  const defaultStart = isNew ? (savedDraft?.startAt ?? initialDate ?? null) : schedule!.startAt;
  /* 終日予定はデータ上「翌日00:00」の排他的終了で保持しているため、
   * フォームには「含まれる最終日」に変換して表示する */
  const defaultEnd = isNew
    ? (savedDraft?.endAt ?? (initialDate ? new Date(initialDate.getTime() + 2 * 60 * 60 * 1000) : null))
    : schedule!.allDay
      ? getEventLastDay(schedule!)
      : schedule!.endAt;

  const [title, setTitle] = useState(savedDraft?.title ?? (isNew ? '' : schedule!.title));
  const [categoryId, setCategoryId] = useState(savedDraft?.categoryId ?? (isNew ? '' : (schedule!.categoryId ?? '')));
  const [startAt, setStartAt] = useState<Date | null>(defaultStart);
  const [endAt, setEndAt] = useState<Date | null>(defaultEnd);
  const [description, setDescription] = useState(savedDraft?.description ?? (isNew ? '' : schedule!.description));
  const [isAllDay, setIsAllDay] = useState(savedDraft?.allDay ?? (isNew ? false : (schedule!.allDay ?? false)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── ドラッグ（pointer capture 方式） */
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });
  const mouseDownOnOverlay = useRef(false);

  /* ── リサイズ（pointer capture 方式） */
  const cardRef = useRef<HTMLDivElement>(null);
  const [modalSize, setModalSize] = useState<{ width: number; height: number } | null>(null);
  const isResizing = useRef(false);
  const resizeStart = useRef({ mouseX: 0, mouseY: 0, width: 0, height: 0 });

  function handleResizePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    isResizing.current = true;
    const rect = cardRef.current!.getBoundingClientRect();
    resizeStart.current = { mouseX: e.clientX, mouseY: e.clientY, width: rect.width, height: rect.height };
  }
  function handleResizePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isResizing.current) return;
    const dx = e.clientX - resizeStart.current.mouseX;
    const dy = e.clientY - resizeStart.current.mouseY;
    setModalSize({
      width: Math.max(560, resizeStart.current.width + dx),
      height: Math.max(400, resizeStart.current.height + dy),
    });
  }
  function handleResizePointerUp() {
    isResizing.current = false;
  }

  /* ── コメント状態 */
  const [comments, setComments] = useState<LocalComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const myInitials = (currentUser?.displayName ?? 'ME').slice(0, 2).toUpperCase();
  const myName = currentUser?.displayName ?? 'あなた';

  useEffect(() => {
    saveDraft<ScheduleModalDraft>(draftKey, { title, categoryId, startAt, endAt, description, allDay: isAllDay });
  }, [title, categoryId, startAt, endAt, description, isAllDay]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── pointer capture ドラッグハンドラ */
  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('button, input, select, a, textarea')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.style.cursor = 'grabbing';
    isDragging.current = true;
    dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, posX: position.x, posY: position.y };
    e.preventDefault();
  }
  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging.current) return;
    setPosition({
      x: dragStart.current.posX + e.clientX - dragStart.current.mouseX,
      y: dragStart.current.posY + e.clientY - dragStart.current.mouseY,
    });
  }
  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging.current) return;
    isDragging.current = false;
    e.currentTarget.style.cursor = 'grab';
  }

  function toggleAllDay() {
    if (!isAllDay) {
      const s = new Date(startAt ?? new Date()); s.setHours(0, 0, 0, 0);
      const e = new Date(endAt ?? new Date()); e.setHours(0, 0, 0, 0);
      setStartAt(s); setEndAt(e); setIsAllDay(true);
    } else {
      const s = new Date(startAt ?? new Date()); s.setHours(21, 0, 0, 0);
      const e = new Date(endAt ?? new Date()); e.setHours(23, 30, 0, 0);
      setStartAt(s); setEndAt(e); setIsAllDay(false);
    }
  }

  function handleStartAtChange(date: Date | null) {
    setStartAt(date);
    if (date && !endAt) setEndAt(new Date(date.getTime() + 2 * 60 * 60 * 1000));
  }

  async function handleSave() {
    if (!title.trim()) { setError('タイトルを入力してください'); return; }
    if (!startAt || !endAt) { setError('開始日時と終了日時を入力してください'); return; }
    if (!isAllDay && endAt <= startAt) { setError('終了日時は開始日時より後にしてください'); return; }
    if (isAllDay && startOfDay(endAt) < startOfDay(startAt)) { setError('終了日は開始日以降にしてください'); return; }
    setSaving(true); setError(null);
    /* 終日予定は Google カレンダー仕様（開始日00:00 〜 最終日翌日00:00 の排他的終了）で保存する */
    const saveStartAt = isAllDay ? startOfDay(startAt) : startAt;
    const saveEndAt = isAllDay ? addDays(startOfDay(endAt), 1) : endAt;
    try {
      if (isNew) {
        if (!currentUser) return;
        await createSchedule(teamId, { title: title.trim(), categoryId: categoryId || null, startAt: saveStartAt, endAt: saveEndAt, description, participantIds: [], collabPartnerName: null, linkedTaskIds: [], allDay: isAllDay, createdBy: currentUser.uid });
        trackEvent('schedule_create');
      } else {
        await updateSchedule(teamId, schedule!.id, { title: title.trim(), categoryId: categoryId || null, startAt: saveStartAt, endAt: saveEndAt, description, allDay: isAllDay }, schedule!.updatedAt);
      }
      clearDraft(draftKey); onClose();
    } catch { setError('保存に失敗しました。もう一度お試しください'); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!confirm('この予定を削除しますか？')) return;
    await deleteSchedule(teamId, schedule!.id);
    clearDraft(draftKey); onDeleted(); onClose();
  }

  function addComment() {
    if (!commentText.trim()) return;
    setComments((prev) => [...prev, { id: `c-${Date.now()}`, authorName: myName, authorInitials: myInitials, text: commentText.trim(), time: format(new Date(), 'HH:mm', { locale: ja }), replies: [] }]);
    setCommentText('');
  }

  function addReply(commentId: string) {
    if (!replyText.trim()) return;
    setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, replies: [...c.replies, { id: `r-${Date.now()}`, authorName: myName, authorInitials: myInitials, text: replyText.trim(), time: format(new Date(), 'HH:mm', { locale: ja }) }] } : c));
    setReplyText(''); setReplyingTo(null);
  }

  /* ── スタイル定数 */
  const avatarSm: React.CSSProperties = { background: 'var(--primary-800)', color: 'var(--primary-200)' };
  const bubbleBase: React.CSSProperties = { background: 'var(--bg)', border: '1px solid var(--border)' };

  /* ─────────────────── レンダリング ─────────────────── */
  return (
    <div
      className="fixed inset-0 z-[280] flex items-end justify-center p-0 md:items-center md:p-8"
      style={{ background: 'rgba(6,6,16,0.85)', backdropFilter: 'blur(6px)', animation: 'fade-in 200ms ease-out both' }}
      onMouseDown={(e) => { mouseDownOnOverlay.current = e.target === e.currentTarget; }}
      onClick={() => { if (mouseDownOnOverlay.current) onClose(); }}
    >
      {/* ── ドラッグ移動ラッパー（position=0 のときは transform を省略して不要な stacking context を避ける） */}
      <div
        className="w-full md:w-auto"
        style={{
          position: 'relative',
          ...(!isMobile && (position.x !== 0 || position.y !== 0)
            ? { transform: `translate(${position.x}px, ${position.y}px)` }
            : {}),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── モーダル本体（スマホは全幅ボトムシート） */}
        <div
          ref={cardRef}
          className="smodal__card"
          style={
            isMobile
              ? { width: '100%', height: '92dvh', minWidth: 0, borderRadius: '20px 20px 0 0' }
              : {
                  width: modalSize?.width ?? 'min(1180px, calc(100vw - 64px))',
                  height: modalSize?.height ?? 'min(720px, calc(100vh - 64px))',
                  minWidth: '560px',
                }
          }
        >

          {/* ── ヘッダー（ドラッグハンドル / タイトル inline） */}
          <div
            className="smodal__hd"
            style={{ padding: '11px 18px 11px 22px', cursor: isMobile ? 'default' : 'grab', userSelect: 'none', alignItems: 'center' }}
            onPointerDown={isMobile ? undefined : handlePointerDown}
            onPointerMove={isMobile ? undefined : handlePointerMove}
            onPointerUp={isMobile ? undefined : handlePointerUp}
            onPointerCancel={isMobile ? undefined : handlePointerUp}
          >
            <Icon name={isNew ? 'add' : 'edit'} size={17} style={{ color: 'var(--text-accent)', flexShrink: 0 } as React.CSSProperties} />
            <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              {isNew ? '予定を追加' : '予定を編集'}
            </span>
            {/* サブ説明はスマホでは非表示（幅確保） */}
            <span className="hidden md:inline" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {isNew ? '— 新しい予定の内容を入力して保存してください。' : '— 予定の内容を編集して保存してください。'}
            </span>
            <button onClick={onClose} className="smodal__close" title="閉じる" style={{ marginLeft: 'auto', flexShrink: 0 }}>
              <Icon name="close" size={18} />
            </button>
          </div>

          {/* ── 本体 2 カラム（スマホは縦積み・全体スクロール） */}
          <div
            className="flex flex-col md:flex-row"
            style={{ flex: 1, minHeight: 0, overflow: isMobile ? 'auto' : 'hidden' }}
          >

            {/* ─ 左: 入力フォーム */}
            <div
              className="flex flex-col gap-5 md:overflow-y-auto"
              style={{
                flex: isMobile ? '0 0 auto' : '0 0 55%',
                padding: isMobile ? '18px 16px' : '22px 20px 22px 26px',
                borderRight: isMobile ? 'none' : '1px solid var(--border)',
                minHeight: 0,
              }}
            >
              <Input label="タイトル *" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="予定のタイトルを入力" />

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>カテゴリ</label>
                <Dropdown value={categoryId} options={categories.map((c) => ({ value: c.id, label: c.name }))} placeholder="未選択" onChange={setCategoryId} scroll />
              </div>

              {/* 開始日時 / 終了日時 / 終日トグル — 横並び（スマホは折り返し） */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 130px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label className="text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>開始日時 *</label>
                  <DateField value={startAt} onChange={handleStartAtChange} hideTime={isAllDay} placeholder="開始日時を選択" />
                </div>
                <div style={{ flex: '1 1 130px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label className="text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>終了日時</label>
                  <DateField value={endAt} onChange={(d) => setEndAt(d)} min={startAt ?? undefined} hideTime={isAllDay} placeholder="終了日時を選択" />
                </div>
                {/* 終日トグル（.allday CSS クラス） */}
                <label className={`allday${isAllDay ? ' is-on' : ''}`} onClick={toggleAllDay} style={{ paddingBottom: 11, flexShrink: 0, cursor: 'pointer' }}>
                  <span className="allday__txt">終日</span>
                  <span className="allday__sw" />
                </label>
              </div>

              <MarkdownEditor label="説明" value={description} onChange={setDescription} placeholder="予定の詳細を入力..." maxLength={1000} rows={5} />

              {error && <p className="text-[12px]" style={{ color: 'var(--danger)' }}>{error}</p>}
            </div>

            {/* ─ 右: コメント / メモ（スマホの新規作成時はコメント不可のため非表示） */}
            {!(isMobile && isNew) && (
            <div
              style={{
                flex: 1,
                minHeight: isMobile ? 260 : 0,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                borderTop: isMobile ? '1px solid var(--border)' : 'none',
              }}
            >

              {/* 右カラムヘッダー */}
              <div className="flex items-center gap-2 shrink-0 px-5 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                <span className="material-icons text-[15px]" style={{ color: 'var(--text-accent)' }}>chat</span>
                <span className="text-[12px] font-semibold tracking-[0.05em]" style={{ color: 'var(--text-secondary)' }}>コメント / メモ</span>
              </div>

              {/* コメント一覧（スクロール可） */}
              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4" style={{ minHeight: 0 }}>
                {isNew ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-center" style={{ color: 'var(--text-disabled)' }}>
                    <span className="material-icons text-[32px]">chat_bubble_outline</span>
                    <p className="text-[12px]">予定を保存すると<br />コメントを残せます</p>
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-[12px]" style={{ color: 'var(--text-disabled)' }}>まだコメントはありません</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex flex-col gap-2">
                      {/* 親コメント */}
                      <div className="flex gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5" style={avatarSm}>{comment.authorInitials}</div>
                        <div className="flex-1 px-3 py-2.5 rounded-[0_10px_10px_10px] text-[13px]" style={bubbleBase}>
                          <div className="flex justify-between text-[11px] mb-1" style={{ color: 'var(--text-muted)' }}>
                            <strong style={{ color: 'var(--text-primary)' }}>{comment.authorName}</strong>
                            <span>{comment.time}</span>
                          </div>
                          <p className="leading-relaxed mb-1.5" style={{ color: 'var(--text-primary)' }}>{comment.text}</p>
                          <button className="text-[11px] font-semibold transition-colors" style={{ color: 'var(--text-muted)' }} onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--primary-300)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}>返信する</button>
                        </div>
                      </div>
                      {/* 返信一覧 */}
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="flex gap-2.5 ml-9 relative">
                          <div className="absolute -left-[20px] top-0 bottom-4 w-px bg-border rounded" />
                          <div className="absolute -left-[20px] top-4 w-3 h-px bg-border rounded" />
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5" style={{ background: 'rgba(239,159,39,0.2)', color: 'var(--amber-l)' }}>{reply.authorInitials}</div>
                          <div className="flex-1 px-3 py-2 rounded-[0_10px_10px_10px] text-[12px]" style={bubbleBase}>
                            <div className="flex justify-between text-[11px] mb-1" style={{ color: 'var(--text-muted)' }}>
                              <strong style={{ color: 'var(--text-primary)' }}>{reply.authorName}</strong>
                              <span>{reply.time}</span>
                            </div>
                            <p style={{ color: 'var(--text-primary)' }}>{reply.text}</p>
                          </div>
                        </div>
                      ))}
                      {/* 返信入力 */}
                      {replyingTo === comment.id && (
                        <div className="flex gap-2.5 ml-9">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5" style={avatarSm}>{myInitials}</div>
                          <div className="flex-1 flex flex-col gap-1.5">
                            <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="返信を入力..." rows={2} className="w-full px-3 py-2 rounded-[10px] text-[12px] outline-none resize-none" style={bubbleBase} />
                            <div className="flex gap-1.5 self-end">
                              <button onClick={() => setReplyingTo(null)} className="px-2.5 py-1 text-[11px] rounded-[6px] border" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>キャンセル</button>
                              <button onClick={() => addReply(comment.id)} disabled={!replyText.trim()} className="px-2.5 py-1 text-[11px] rounded-[6px] disabled:opacity-40" style={{ background: 'var(--primary)', color: '#fff' }}>送信</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* コメント入力（編集モードのみ） */}
              {!isNew && (
                <div className="shrink-0 flex gap-2.5 px-5 py-3" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5" style={avatarSm}>{myInitials}</div>
                  <div className="flex-1 flex gap-2">
                    <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addComment(); }} placeholder="コメントを入力… (Ctrl+Enter で送信)" rows={2} className="flex-1 px-3 py-2 rounded-[10px] text-[13px] outline-none resize-none" style={{ ...bubbleBase, minHeight: '60px' }} />
                    <button onClick={addComment} disabled={!commentText.trim()} className="self-end px-3 py-2 rounded-[10px] text-[12px] font-semibold disabled:opacity-40 flex items-center gap-1" style={{ background: 'var(--primary)', color: '#fff' }}>
                      <span className="material-icons text-[14px]">send</span>
                    </button>
                  </div>
                </div>
              )}

            </div>
            )}
          </div>

          {/* ── フッター */}
          <div className="sform__footer">
            {!isNew && canEdit && (
              <button onClick={handleDelete} className="btn btn--danger btn--sm">
                <Icon name="delete" size={15} />削除
              </button>
            )}
            <div className="sform__footer-right">
              <Button variant="ghost" onClick={onClose}>キャンセル</Button>
              {canEdit && (
                <Button variant="primary" onClick={handleSave} loading={saving}>保存する</Button>
              )}
            </div>
          </div>

        </div>

        {/* ── リサイズハンドル（カード外・overflow:hidden の影響を受けない。スマホでは非表示） */}
        {!isMobile && (
        <div
          className="smodal__resize"
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          onPointerCancel={handleResizePointerUp}
        >
          <span className="material-icons" style={{ fontSize: '16px', userSelect: 'none' }}>open_in_full</span>
        </div>
        )}

      </div>
    </div>
  );
}
