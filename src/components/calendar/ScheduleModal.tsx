'use client';

import { useState, useRef, useEffect } from 'react';
import { startOfDay, addDays } from 'date-fns';
import { createSchedule, updateSchedule, deleteSchedule } from '@/lib/repositories/schedules';
import { trackEvent } from '@/lib/analytics';
import { useAuthStore } from '@/stores/auth';
import { DateField } from '@/components/ui/DateField';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import { saveDraft, loadDraft, clearDraft, DRAFT_KEYS } from '@/lib/formDraft';
import { Icon } from '@/components/ui/Icon';
import { DialogShell } from '@/components/ui/Dialog';
import { Dropdown } from '@/components/ui/Dropdown';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Button, buttonVariants } from '@/components/ui/Button';
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

  /* ─────────────────── レンダリング ─────────────────── */
  return (
    <DialogShell
      onClose={onClose}
      label={isNew ? '予定を追加' : '予定を編集'}
      data-testid="schedule-modal"
      // ドラッグ移動は外枠の transform で行う（position=0 のときは transform を省略して不要な stacking context を避ける）
      className="relative w-full md:w-auto"
      style={
        !isMobile && (position.x !== 0 || position.y !== 0)
          ? { transform: `translate(${position.x}px, ${position.y}px)` }
          : undefined
      }
    >
        {/* ── モーダル本体（スマホは全幅ボトムシート） */}
        <div
          ref={cardRef}
          className="relative flex max-h-full max-w-full flex-col overflow-hidden rounded-lg border border-border bg-card animate-pop-modal"
          style={
            isMobile
              ? { width: '100%', height: '92dvh', minWidth: 0, borderRadius: '20px 20px 0 0' }
              : {
                  width: modalSize?.width ?? 'min(720px, calc(100vw - 64px))',
                  height: modalSize?.height ?? 'min(720px, calc(100vh - 64px))',
                  minWidth: '560px',
                }
          }
        >

          {/* ── ヘッダー（ドラッグハンドル / タイトル inline） */}
          <div
            className="flex flex-none items-center gap-3.5 border-b border-border py-2.75 pr-4.5 pl-5.5 select-none"
            style={{ cursor: isMobile ? 'default' : 'grab' }}
            onPointerDown={isMobile ? undefined : handlePointerDown}
            onPointerMove={isMobile ? undefined : handlePointerMove}
            onPointerUp={isMobile ? undefined : handlePointerUp}
            onPointerCancel={isMobile ? undefined : handlePointerUp}
          >
            <Icon name={isNew ? 'add' : 'edit'} size={17} style={{ color: 'var(--brand-2)', flexShrink: 0 } as React.CSSProperties} />
            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text)', whiteSpace: 'nowrap' }}>
              {isNew ? '予定を追加' : '予定を編集'}
            </span>
            {/* サブ説明はスマホでは非表示（幅確保） */}
            <span className="hidden md:inline" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {isNew ? '— 新しい予定の内容を入力して保存してください。' : '— 予定の内容を編集して保存してください。'}
            </span>
            <button
              onClick={onClose}
              className="ml-auto flex size-9.5 flex-none cursor-pointer items-center justify-center rounded-md bg-surface text-text-2 transition-colors duration-(--duration-fast) ease-out hover:bg-surface-2 hover:text-text"
              title="閉じる"
            >
              <Icon name="close" size={18} />
            </button>
          </div>

          {/* ── 本体 1 カラム（スマホは全体スクロール） */}
          <div
            className="flex flex-col"
            style={{ flex: 1, minHeight: 0, overflow: isMobile ? 'auto' : 'hidden' }}
          >

            {/* ─ 入力フォーム */}
            <div
              className="flex flex-col gap-5 md:overflow-y-auto"
              style={{
                flex: isMobile ? '0 0 auto' : 1,
                padding: isMobile ? '18px 16px' : '22px 20px 22px 26px',
                minHeight: 0,
              }}
            >
              <Input label="タイトル *" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="予定のタイトルを入力" />

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold" style={{ color: 'var(--text-2)' }}>カテゴリ</label>
                <Dropdown value={categoryId} options={categories.map((c) => ({ value: c.id, label: c.name }))} placeholder="未選択" onChange={setCategoryId} scroll />
              </div>

              {/* 開始日時 / 終了日時 / 終日トグル — 横並び（スマホは折り返し） */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 130px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label className="text-[12px] font-semibold" style={{ color: 'var(--text-2)' }}>開始日時 *</label>
                  <DateField value={startAt} onChange={handleStartAtChange} hideTime={isAllDay} placeholder="開始日時を選択" />
                </div>
                <div style={{ flex: '1 1 130px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label className="text-[12px] font-semibold" style={{ color: 'var(--text-2)' }}>終了日時</label>
                  <DateField value={endAt} onChange={(d) => setEndAt(d)} min={startAt ?? undefined} hideTime={isAllDay} placeholder="終了日時を選択" />
                </div>
                <Switch label="終日" checked={isAllDay} onCheckedChange={toggleAllDay} className="pb-2.75" />
              </div>

              <MarkdownEditor label="説明" value={description} onChange={setDescription} placeholder="予定の詳細を入力..." maxLength={1000} rows={5} />

              {error && <p className="text-[12px]" style={{ color: 'var(--danger)' }}>{error}</p>}
            </div>
          </div>

          {/* ── フッター */}
          <div className="flex flex-none items-center gap-3 border-t border-border px-6.5 py-4">
            {!isNew && canEdit && (
              <button onClick={handleDelete} className={buttonVariants({ variant: 'danger', size: 'sm' })}>
                <Icon name="delete" size={15} />削除
              </button>
            )}
            <div className="ml-auto flex gap-3">
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
          className="pointer-events-auto absolute right-3 bottom-3 z-10 flex size-6 cursor-se-resize items-center justify-center rounded-sm text-text-muted opacity-45 transition-[opacity,background-color] duration-(--duration-fast) hover:bg-surface hover:opacity-90"
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          onPointerCancel={handleResizePointerUp}
        >
          <span className="material-icons" style={{ fontSize: '16px', userSelect: 'none' }}>open_in_full</span>
        </div>
        )}

    </DialogShell>
  );
}
