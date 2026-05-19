'use client';

import { useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import { respondToCollab } from '@/lib/repositories/collabs';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { CollabSession } from '@/types/entities';

type DateChoice = 'ok' | 'ng' | 'pending';

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
  const [respondentName, setRespondentName] = useState('');
  const [dates, setDates] = useState<Record<string, DateChoice>>({});
  const [alternativeDate, setAlternativeDate] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const daysLeft = differenceInDays(session.expiresAt, new Date());
  /* 候補日程を日時の昇順でソート（originalIndex で dates キーを参照） */
  const sortedDatePairs = session.proposedDates
    .map((date, i) => ({ date, originalIndex: i }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  /* OK/NG/未定のどれも未選択の日程 */
  const unselected = session.proposedDates.filter((_, i) => !dates[i.toString()]);

  function toggleDate(index: number, value: DateChoice) {
    setDates((prev) => {
      const key = index.toString();
      /* 同じ値をもう一度クリックしたら選択解除 */
      if (prev[key] === value) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: value };
    });
  }

  function handleSubmitClick() {
    if (!respondentName.trim()) {
      setError('お名前を入力してください');
      return;
    }
    setError(null);
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
        respondentName: respondentName.trim(),
        dates,
        alternativeDates: alternativeDate ? [new Date(alternativeDate).toISOString()] : [],
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
    <div className="space-y-5 overflow-x-hidden">
      {/* セッション情報 */}
      <div>
        <p className="text-[11px] text-muted">{session.partnerName}さんからのコラボ調整</p>
        <p className="text-base font-semibold text-text mt-0.5">{session.title}</p>
        {daysLeft > 0 ? (
          <p className="text-[11px] text-amber-l mt-1">回答期限: あと{daysLeft}日</p>
        ) : (
          <p className="text-[11px] text-live mt-1">有効期限切れ</p>
        )}
      </div>

      {/* お名前（必須） */}
      <div>
        <label className="block text-sm font-medium text-text mb-2">
          お名前 <span className="text-live text-[11px]">必須</span>
        </label>
        <input
          type="text"
          value={respondentName}
          onChange={(e) => setRespondentName(e.target.value)}
          placeholder="例: 田中 太郎"
          maxLength={50}
          className="w-full border border-border rounded-[6px] px-3 py-2 text-sm bg-surface text-text placeholder:text-muted focus:ring-1 focus:ring-purple focus:border-purple outline-none"
          aria-label="お名前"
        />
      </div>

      {/* 候補日程リスト */}
      <div>
        <p className="text-sm font-medium text-text mb-2">候補日程</p>
        <div className="space-y-2">
          {/* 日時の昇順でソート（originalIndex で dates キーを参照） */}
          {sortedDatePairs.map(({ date, originalIndex }) => {
            const key = originalIndex.toString();
            const val = dates[key];
            return (
              <Card key={originalIndex} noPadding>
                <div className="flex flex-wrap items-center gap-2 px-3 py-3 w-full">
                  <span className="flex-1 min-w-0 text-sm text-text">
                    {format(date, 'M月d日(E) HH:mm', { locale: ja })}
                  </span>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleDate(originalIndex, 'ok')}
                      className={`px-2 sm:px-3 py-1.5 rounded-[6px] text-xs font-medium transition-colors ${
                        val === 'ok'
                          ? 'bg-green/15 border border-green/40 text-green'
                          : 'bg-surface border border-border text-muted hover:text-green hover:border-green/40'
                      }`}
                      aria-label="OK"
                    >
                      ○ OK
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleDate(originalIndex, 'ng')}
                      className={`px-2 sm:px-3 py-1.5 rounded-[6px] text-xs font-medium transition-colors ${
                        val === 'ng'
                          ? 'bg-live/10 border border-live/30 text-live'
                          : 'bg-surface border border-border text-muted hover:text-live hover:border-live/30'
                      }`}
                      aria-label="NG"
                    >
                      × NG
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleDate(originalIndex, 'pending')}
                      className={`px-2 sm:px-3 py-1.5 rounded-[6px] text-xs font-medium transition-colors ${
                        val === 'pending'
                          ? 'bg-amber/15 border border-amber/40 text-amber-l'
                          : 'bg-surface border border-border text-muted hover:text-amber-l hover:border-amber/40'
                      }`}
                      aria-label="未定"
                    >
                      ? 未定
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 別の日程を提案する */}
      <div>
        <label className="block text-sm font-medium text-text mb-2">
          別の日程を提案する（任意）
        </label>
        <input
          type="datetime-local"
          value={alternativeDate}
          onChange={(e) => setAlternativeDate(e.target.value)}
          className="w-full min-w-0 border border-border rounded-[6px] px-3 py-2 text-sm bg-surface text-text focus:ring-1 focus:ring-purple focus:border-purple outline-none"
          aria-label="別の日程を提案"
        />
      </div>

      {/* メモ */}
      <div>
        <label className="block text-sm font-medium text-text mb-2">
          メモ（任意・200文字以内）
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          rows={3}
          className="w-full border border-border rounded-[6px] px-3 py-2 text-sm bg-surface text-text placeholder:text-muted focus:ring-1 focus:ring-purple focus:border-purple outline-none resize-none"
          placeholder="コメントがあればどうぞ"
        />
        <p className="text-[10px] text-muted mt-1 text-right font-num">{note.length}/200</p>
      </div>

      {error && <p className="text-live text-sm">{error}</p>}

      {/* 未選択確認 */}
      {showConfirm && (
        <div className="bg-amber/10 border border-amber/30 rounded-[10px] p-4">
          <p className="text-sm text-amber-l mb-3">
            {unselected.length}件の候補日程が未選択です。このまま送信しますか？
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowConfirm(false)}>
              戻る
            </Button>
            <Button variant="amber" size="sm" onClick={handleSubmit} loading={submitting}>
              このまま送信する
            </Button>
          </div>
        </div>
      )}

      {!showConfirm && (
        <Button variant="amber" onClick={handleSubmitClick} loading={submitting} className="w-full">
          回答を送信する
        </Button>
      )}
    </div>
  );
}
