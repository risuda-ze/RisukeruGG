'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { ScheduleEntry } from '@/types/entities';

interface ScheduleFormProps {
  initialData?: Partial<ScheduleEntry>;
  onSubmit: (
    data: Omit<ScheduleEntry, 'id' | 'updatedAt' | 'createdAt' | 'createdBy'>
  ) => Promise<void>;
  onCancel: () => void;
  teamMemberIds?: string[];
}

export function ScheduleForm({ initialData, onSubmit, onCancel }: ScheduleFormProps) {
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [type, setType] = useState<'stream' | 'video'>(initialData?.type ?? 'stream');
  const [startAt, setStartAt] = useState(initialData?.startAt?.toISOString().slice(0, 16) ?? '');
  const [endAt, setEndAt] = useState(initialData?.endAt?.toISOString().slice(0, 16) ?? '');
  const [platform, setPlatform] = useState<'youtube' | 'twitch' | 'both' | ''>(
    initialData?.platform ?? ''
  );
  const [status, setStatus] = useState<ScheduleEntry['status']>(initialData?.status ?? 'planned');
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
        type,
        startAt: start,
        endAt: end,
        platform: platform || null,
        status,
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="タイトル"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        maxLength={100}
      />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700">種別</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as 'stream' | 'video')}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="stream">配信枠</option>
          <option value="video">動画投稿</option>
        </select>
      </div>

      <Input
        label="開始日時"
        type="datetime-local"
        value={startAt}
        onChange={(e) => setStartAt(e.target.value)}
        required
      />
      <Input
        label="終了日時"
        type="datetime-local"
        value={endAt}
        onChange={(e) => setEndAt(e.target.value)}
        required
      />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700">プラットフォーム</label>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as 'youtube' | 'twitch' | 'both' | '')}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="">未選択</option>
          <option value="youtube">YouTube</option>
          <option value="twitch">Twitch</option>
          <option value="both">両方</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700">ステータス</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ScheduleEntry['status'])}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="planned">予定</option>
          <option value="live">LIVE</option>
          <option value="ended">終了</option>
          <option value="cancelled">キャンセル</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700">説明</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1000}
          rows={3}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-3">
        <Button variant="secondary" type="button" onClick={onCancel}>
          キャンセル
        </Button>
        <Button type="submit" loading={loading}>
          保存する
        </Button>
      </div>
    </form>
  );
}
