'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DateTimeInput } from '@/components/ui/DateTimeInput';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import { saveDraft, loadDraft, clearDraft, DRAFT_KEYS } from '@/lib/formDraft';
import { Dropdown } from '@/components/ui/Dropdown';
import type { ScheduleEntry, ScheduleCategory } from '@/types/entities';

interface ScheduleFormProps {
  initialData?: Partial<ScheduleEntry>;
  categories: ScheduleCategory[];
  onSubmit: (
    data: Omit<ScheduleEntry, 'id' | 'updatedAt' | 'createdAt' | 'createdBy'>
  ) => Promise<void>;
  onCancel: () => void;
}

interface ScheduleFormDraft {
  title: string;
  categoryId: string;
  startAt: Date | null;
  endAt: Date | null;
  description: string;
}

export function ScheduleForm({ initialData, categories, onSubmit, onCancel }: ScheduleFormProps) {
  /* 新規作成フォームのみドラフト復元対象 */
  const draftKey = initialData?.id
    ? DRAFT_KEYS.scheduleEdit(initialData.id)
    : DRAFT_KEYS.SCHEDULE_NEW;
  const savedDraft = loadDraft<ScheduleFormDraft>(draftKey);

  const [title, setTitle] = useState(savedDraft?.title ?? initialData?.title ?? '');
  const [categoryId, setCategoryId] = useState<string>(
    savedDraft?.categoryId ?? initialData?.categoryId ?? ''
  );
  const [startAt, setStartAt] = useState<Date | null>(
    savedDraft?.startAt ?? initialData?.startAt ?? null
  );
  const [endAt, setEndAt] = useState<Date | null>(
    savedDraft?.endAt ?? initialData?.endAt ?? null
  );
  const [description, setDescription] = useState(
    savedDraft?.description ?? initialData?.description ?? ''
  );
  const [isAllDay, setIsAllDay] = useState(initialData?.allDay ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* 入力変更のたびにドラフトを保存 */
  useEffect(() => {
    saveDraft<ScheduleFormDraft>(draftKey, { title, categoryId, startAt, endAt, description });
  }, [title, categoryId, startAt, endAt, description]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleStartAtChange(date: Date | null) {
    setStartAt(date);
    /* 開始日時が変更されたとき、終了日時が未設定なら2時間後を自動補完 */
    if (date && !endAt) {
      const auto = new Date(date.getTime() + 2 * 60 * 60 * 1000);
      setEndAt(auto);
    }
  }

  function handleAllDay() {
    if (!startAt) return;
    const start = new Date(startAt);
    start.setHours(0, 0, 0, 0);
    const end = new Date(startAt);
    end.setHours(0, 0, 0, 0);
    setStartAt(start);
    setEndAt(end);
    setIsAllDay(true);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startAt || !endAt) {
      setError('必須項目を入力してください');
      return;
    }
    if (!isAllDay && endAt <= startAt) {
      setError('終了日時は開始日時より後にしてください');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        title,
        categoryId: categoryId || null,
        startAt,
        endAt,
        description,
        participantIds: initialData?.participantIds ?? [],
        collabPartnerName: initialData?.collabPartnerName ?? null,
        linkedTaskIds: initialData?.linkedTaskIds ?? [],
        allDay: isAllDay,
      });
      clearDraft(draftKey);
    } catch {
      setError('保存に失敗しました。もう一度お試しください');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="タイトル"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        maxLength={100}
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-semibold text-muted">カテゴリ</label>
        <Dropdown
          value={categoryId}
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          placeholder="未選択"
          onChange={setCategoryId}
          scroll
        />
      </div>

      {/* 開始日時 + 終日ボタン */}
      <div className="flex items-end gap-2">
        <DateTimeInput
          label="開始日時"
          value={startAt}
          onChange={handleStartAtChange}
          allDay={isAllDay}
          required
          className="flex-1"
        />
        <button
          type="button"
          onClick={handleAllDay}
          disabled={!startAt}
          className={`mb-0.5 px-3 py-2.5 rounded-[12px] text-[12px] font-semibold border transition-colors disabled:opacity-40 whitespace-nowrap ${isAllDay ? 'border-purple text-purple' : 'border-border text-muted hover:text-purple-l hover:border-purple-l'}`}
        >
          終日
        </button>
      </div>

      <DateTimeInput
        label="終了日時"
        value={endAt}
        onChange={setEndAt}
        min={startAt ?? undefined}
        allDay={isAllDay}
        required
      />

      <MarkdownEditor
        label="説明"
        value={description}
        onChange={setDescription}
        placeholder="予定の詳細を入力..."
        maxLength={1000}
        rows={3}
      />

      {error && <p className="text-[12px] text-live">{error}</p>}

      <div className="flex justify-end gap-3 pt-1">
        <Button variant="ghost" type="button" onClick={onCancel}>
          キャンセル
        </Button>
        <Button type="submit" loading={loading}>
          保存する
        </Button>
      </div>
    </form>
  );
}
