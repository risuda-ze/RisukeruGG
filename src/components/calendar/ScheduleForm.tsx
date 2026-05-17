'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { ScheduleEntry, ScheduleCategory } from '@/types/entities';

interface ScheduleFormProps {
  initialData?: Partial<ScheduleEntry>;
  categories: ScheduleCategory[];
  onSubmit: (
    data: Omit<ScheduleEntry, 'id' | 'updatedAt' | 'createdAt' | 'createdBy'>
  ) => Promise<void>;
  onCancel: () => void;
}

const selectClass =
  'w-full bg-bg border border-border text-text px-3.5 py-2.5 rounded-[12px] text-[14px] outline-none transition-colors focus:border-purple';

export function ScheduleForm({ initialData, categories, onSubmit, onCancel }: ScheduleFormProps) {
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [categoryId, setCategoryId] = useState<string>(initialData?.categoryId ?? '');
  const [startAt, setStartAt] = useState(initialData?.startAt?.toISOString().slice(0, 16) ?? '');
  const [endAt, setEndAt] = useState(initialData?.endAt?.toISOString().slice(0, 16) ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startAt || !endAt) {
      setError('必須項目を入力してください');
      return;
    }
    const start = new Date(startAt);
    const end = new Date(endAt);
    if (end <= start) {
      setError('終了日時は開始日時より後にしてください');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        title,
        categoryId: categoryId || null,
        startAt: start,
        endAt: end,
        description,
        participantIds: initialData?.participantIds ?? [],
        collabPartnerName: initialData?.collabPartnerName ?? null,
        linkedTaskIds: initialData?.linkedTaskIds ?? [],
      });
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
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className={selectClass}
        >
          <option value="">未選択</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-semibold text-muted">開始日時</label>
        <input
          type="datetime-local"
          value={startAt}
          onChange={(e) => setStartAt(e.target.value)}
          required
          className={selectClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-semibold text-muted">終了日時</label>
        <input
          type="datetime-local"
          value={endAt}
          onChange={(e) => setEndAt(e.target.value)}
          required
          className={selectClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-semibold text-muted">説明</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1000}
          rows={3}
          className="w-full bg-bg border border-border text-text px-3.5 py-2.5 rounded-[12px] text-[14px] outline-none transition-colors focus:border-purple resize-y"
        />
      </div>

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
