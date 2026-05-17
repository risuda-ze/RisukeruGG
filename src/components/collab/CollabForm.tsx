'use client';

import { useState } from 'react';
import { createCollabSession } from '@/lib/repositories/collabs';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface CollabFormProps {
  teamId: string;
  isLightPlanFull?: boolean;
  onSuccess: (shareUrl: string) => void;
  onCancel: () => void;
}

export default function CollabForm({
  teamId,
  isLightPlanFull,
  onSuccess,
  onCancel,
}: CollabFormProps) {
  const [title, setTitle] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [proposedDates, setProposedDates] = useState<string[]>(['']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addDate() {
    if (proposedDates.length >= 5) return;
    setProposedDates([...proposedDates, '']);
  }

  function removeDate(index: number) {
    setProposedDates(proposedDates.filter((_, i) => i !== index));
  }

  function updateDate(index: number, value: string) {
    setProposedDates(proposedDates.map((d, i) => (i === index ? value : d)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validDates = proposedDates.filter((d) => d.trim());
    if (!title.trim() || !partnerName.trim() || validDates.length === 0) {
      setError('タイトル・相手名・候補日程は必須です');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await createCollabSession({
        teamId,
        title: title.trim(),
        partnerName: partnerName.trim(),
        proposedDates: validDates,
        expiresInDays,
      });
      onSuccess(result.data.shareUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : '作成に失敗しました';
      if (message.includes('failed-precondition') || message.includes('上限')) {
        setError('コラボ作成の月次上限に達しました。PARTYプランにアップグレードしてください。');
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* LIGHTプラン上限時の案内 */}
      {isLightPlanFull && (
        <div className="bg-amber/10 border border-amber/30 rounded-[10px] p-3 text-sm">
          <p className="font-medium text-amber-l">コラボ作成の月次上限に達しました（月3件）</p>
          <p className="text-muted mt-1">
            PARTYプランにアップグレードすると無制限で作成できます。
            <a href="/settings" className="underline ml-1 text-amber-l">
              アップグレードする
            </a>
          </p>
        </div>
      )}

      <Input
        label="タイトル *"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="例: 歌ってみたコラボ"
        maxLength={100}
        disabled={isLightPlanFull}
      />

      <Input
        label="コラボ相手名 *"
        value={partnerName}
        onChange={(e) => setPartnerName(e.target.value)}
        placeholder="例: ○○さん"
        maxLength={50}
        disabled={isLightPlanFull}
      />

      {/* 候補日程 */}
      <div>
        <p className="text-sm font-medium text-text mb-2">候補日程 * （最大5件）</p>
        <div className="space-y-2">
          {proposedDates.map((date, index) => (
            <div key={index} className="flex gap-2 items-center">
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => updateDate(index, e.target.value)}
                className="flex-1 border border-border rounded-[6px] px-3 py-2 text-sm bg-surface text-text focus:ring-1 focus:ring-purple focus:border-purple outline-none"
                disabled={isLightPlanFull}
                aria-label={`候補日程 ${index + 1}`}
              />
              {proposedDates.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeDate(index)}
                  className="text-muted hover:text-live text-sm px-1"
                  aria-label="この候補日程を削除"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        {proposedDates.length < 5 && !isLightPlanFull && (
          <button
            type="button"
            onClick={addDate}
            className="mt-2 text-sm text-purple-l hover:text-purple transition-colors"
          >
            + 候補日を追加
          </button>
        )}
      </div>

      {/* 有効期限 */}
      <div>
        <label className="block text-sm font-medium text-text mb-2">有効期限</label>
        <select
          value={expiresInDays}
          onChange={(e) => setExpiresInDays(Number(e.target.value))}
          className="w-full border border-border rounded-[6px] px-3 py-2 text-sm bg-surface text-text focus:ring-1 focus:ring-purple outline-none"
          disabled={isLightPlanFull}
          aria-label="有効期限を選択"
        >
          {[1, 3, 7, 14, 30].map((d) => (
            <option key={d} value={d}>
              {d}日間
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-live text-sm">{error}</p>}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>
          キャンセル
        </Button>
        <Button type="submit" variant="primary" loading={submitting} disabled={isLightPlanFull}>
          作成する
        </Button>
      </div>
    </form>
  );
}
