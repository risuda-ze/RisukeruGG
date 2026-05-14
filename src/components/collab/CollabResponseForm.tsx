'use client';

import { useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import { respondToCollab } from '@/lib/repositories/collabs';
import { Button } from '@/components/ui/Button';
import type { CollabSession } from '@/types/entities';

interface CollabResponseFormProps {
  session: CollabSession;
  teamId: string;
  sessionId: string;
  onSuccess: () => void;
}

export default function CollabResponseForm({
  session,
  teamId,
  sessionId,
  onSuccess,
}: CollabResponseFormProps) {
  const [dates, setDates] = useState<Record<string, 'ok' | 'ng'>>({});
  const [alternativeDate, setAlternativeDate] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const daysLeft = differenceInDays(session.expiresAt, new Date());
  const unselected = session.proposedDates.filter((_, i) => !dates[i.toString()]);

  function toggleDate(index: number, value: 'ok' | 'ng') {
    setDates((prev) => {
      const key = index.toString();
      if (prev[key] === value) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: value };
    });
  }

  function handleSubmitClick() {
    if (unselected.length > 0) {
      setShowConfirm(true);
    } else {
      handleSubmit();
    }
  }

  async function handleSubmit() {
    setShowConfirm(false);
    setSubmitting(true);
    setError(null);
    try {
      await respondToCollab({
        teamId,
        sessionId,
        dates,
        alternativeDates: alternativeDate ? [alternativeDate] : [],
        note: note.trim() || null,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '送信に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-zinc-500">
        <p className="font-medium text-zinc-700 mb-1">
          {session.partnerName}さんからのコラボ打診
        </p>
        <p className="text-lg font-bold text-zinc-900">{session.title}</p>
        {daysLeft > 0 ? (
          <p className="mt-1 text-amber-600">回答期限: あと{daysLeft}日</p>
        ) : (
          <p className="mt-1 text-red-600">有効期限切れ</p>
        )}
      </div>

      <div>
        <p className="text-sm font-medium text-zinc-700 mb-3">候補日程</p>
        <div className="space-y-2">
          {session.proposedDates.map((date, index) => {
            const key = index.toString();
            const val = dates[key];
            return (
              <div key={index} className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200">
                <span className="flex-1 text-sm">
                  {format(date, 'M月d日(E) HH:mm', { locale: ja })}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => toggleDate(index, 'ok')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      val === 'ok'
                        ? 'bg-green-500 text-white'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-green-100'
                    }`}
                    aria-label="OK"
                  >
                    ○ OK
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleDate(index, 'ng')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      val === 'ng'
                        ? 'bg-red-500 text-white'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-red-100'
                    }`}
                    aria-label="NG"
                  >
                    × NG
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          代替日程の提案（任意）
        </label>
        <input
          type="datetime-local"
          value={alternativeDate}
          onChange={(e) => setAlternativeDate(e.target.value)}
          className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          メモ（任意・200文字以内）
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          rows={3}
          className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          placeholder="コメントがあればどうぞ"
        />
        <p className="text-xs text-zinc-400 mt-1 text-right">{note.length}/200</p>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {showConfirm && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800 mb-3">
            {unselected.length}件の候補日程が未選択です。このまま送信しますか？
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowConfirm(false)}>
              戻る
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              このまま送信する
            </Button>
          </div>
        </div>
      )}

      {!showConfirm && (
        <Button onClick={handleSubmitClick} loading={submitting} className="w-full">
          回答を送信する
        </Button>
      )}
    </div>
  );
}
