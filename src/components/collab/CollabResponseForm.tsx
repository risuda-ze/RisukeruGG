'use client';

import { useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import { respondToCollab, addCollabComment } from '@/lib/repositories/collabs';
import { Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import type { CollabSession, CollabParticipant } from '@/types/entities';

type DateChoice = 'ok' | 'ng' | 'pending';

/* PC 用ステップカードヘッダー（モジュールトップレベルで定義） */
function PcStepBadge({ step, label, description }: { step: number; label: string; description: string }) {
  return (
    <div className="mb-4 pb-3 border-b border-border">
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
          style={{ background: 'var(--purple-d)', color: 'var(--purple-l)' }}
        >
          {step}
        </div>
        <span className="text-[14px] font-bold text-text">{label}</span>
      </div>
      <p className="text-[12px] text-muted">{description}</p>
    </div>
  );
}

/* モバイル用ステップヘッダー（モジュールトップレベルで定義） */
function MobileStepHeader({ step, label, description, active }: { step: number; label: string; description: string; active: boolean }) {
  return (
    <div className={`mb-4 ${active ? '' : 'opacity-60'}`}>
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
          style={
            active
              ? { background: 'var(--purple-d)', color: 'var(--purple-l)' }
              : { background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }
          }
        >
          {step}
        </div>
        <span className="text-[14px] font-bold text-text">{label}</span>
      </div>
      <p className="text-[12px] text-muted pl-8">{description}</p>
    </div>
  );
}

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

  /* モバイル用の現在ステップ（0: 名前, 1: 日程, 2: コメント） */
  const [currentStep, setCurrentStep] = useState(0);

  const daysLeft = differenceInDays(session.expiresAt, new Date());

  /* 候補日程を日時の昇順でソート（originalIndex で dates キーを参照） */
  const sortedDatePairs = session.proposedDates
    .map((date, i) => ({ date, originalIndex: i }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  /* OK/NG/未定のどれも未選択の日程 */
  const unselected = session.proposedDates.filter((_, i) => !dates[i.toString()]);

  /* session.participants から type=member のみアイコン表示候補として使用（認証不要） */
  const memberParticipants: CollabParticipant[] = (session.participants ?? []).filter(
    (p) => p.type === 'member'
  );

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
      setCurrentStep(0);
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
      /* T026: コメントを comments[] に追記（note がある場合のみ） */
      if (note.trim()) {
        const authorId = respondentName.trim().replace(/[.#$[\]/]/g, '_');
        await addCollabComment(teamId, sessionId, {
          id: `resp_${Date.now()}`,
          authorId,
          authorName: respondentName.trim(),
          text: note.trim(),
          createdAt: Timestamp.now(),
        });
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '送信に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  /* ── セッション情報ヘッダー ───────────────────────── */
  const sessionHeader = (
    <div className="mb-6 pb-4 border-b border-border flex items-start justify-between gap-4">
      <div>
        <p className="text-base font-semibold text-text">{session.title}</p>
        {daysLeft > 0 ? (
          <p className="text-[11px] text-amber-l mt-1">回答期限: あと{daysLeft}日</p>
        ) : (
          <p className="text-[11px] text-live mt-1">有効期限切れ</p>
        )}
      </div>
    </div>
  );

  /* ── Step 1 コンテンツ（モバイル用・pl-8 あり） ──── */
  const step1Mobile = (
    <div>
      <MobileStepHeader
        step={1}
        label="お名前を教えてください"
        description="回答者のお名前を入力してください。チームメンバーはアイコンを選択することもできます。"
        active={currentStep === 0}
      />
      {memberParticipants.length > 0 && (
        <div className="mb-3 pl-8">
          <p className="text-[11px] text-muted mb-2">チームメンバーから選択</p>
          <div className="flex flex-wrap gap-2">
            {memberParticipants.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setRespondentName(p.name)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors text-[13px] font-semibold"
                style={
                  respondentName === p.name
                    ? { background: 'var(--purple-d)', borderColor: 'var(--purple)', color: 'var(--purple-l)' }
                    : { background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }
                }
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                  style={{ background: 'var(--purple-d)', color: 'var(--purple-l)' }}
                >
                  {p.name.slice(0, 2).toUpperCase()}
                </div>
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="pl-8">
        {memberParticipants.length > 0 && (
          <p className="text-[11px] text-muted mb-2">または直接入力</p>
        )}
        <input
          type="text"
          value={respondentName}
          onChange={(e) => setRespondentName(e.target.value)}
          placeholder="例: 田中 太郎"
          maxLength={50}
          className="w-full border border-border rounded-[8px] px-3 py-2.5 text-sm bg-surface text-text placeholder:text-muted focus:ring-1 focus:ring-purple focus:border-purple outline-none"
          aria-label="お名前"
        />
        {error && currentStep === 0 && (
          <p className="text-live text-[12px] mt-1">{error}</p>
        )}
      </div>
      <div className="mt-4 pl-8">
        <button
          type="button"
          onClick={() => {
            if (!respondentName.trim()) { setError('お名前を入力してください'); return; }
            setError(null);
            setCurrentStep(1);
          }}
          className="flex items-center gap-1 px-4 py-2 rounded-[10px] text-[13px] font-semibold transition-colors"
          style={{ background: 'var(--purple-d)', color: 'var(--purple-l)' }}
        >
          次へ <Icon name="chevron_right" size={16} />
        </button>
      </div>
    </div>
  );

  /* ── Step 1 コンテンツ（PC用・インデントなし） ────── */
  const step1Pc = (
    <div className="flex flex-col gap-3">
      {memberParticipants.length > 0 && (
        <div>
          <p className="text-[11px] text-muted mb-2">チームメンバーから選択</p>
          <div className="flex flex-wrap gap-2">
            {memberParticipants.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setRespondentName(p.name)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors text-[13px] font-semibold"
                style={
                  respondentName === p.name
                    ? { background: 'var(--purple-d)', borderColor: 'var(--purple)', color: 'var(--purple-l)' }
                    : { background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }
                }
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                  style={{ background: 'var(--purple-d)', color: 'var(--purple-l)' }}
                >
                  {p.name.slice(0, 2).toUpperCase()}
                </div>
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        {memberParticipants.length > 0 && (
          <p className="text-[11px] text-muted mb-2">または直接入力</p>
        )}
        <input
          type="text"
          value={respondentName}
          onChange={(e) => setRespondentName(e.target.value)}
          placeholder="例: 田中 太郎"
          maxLength={50}
          className="w-full border border-border rounded-[8px] px-3 py-2.5 text-sm bg-surface text-text placeholder:text-muted focus:ring-1 focus:ring-purple focus:border-purple outline-none"
          aria-label="お名前"
        />
        {error && (
          <p className="text-live text-[12px] mt-1">{error}</p>
        )}
      </div>
    </div>
  );

  /* ── Step 2 共通コンテンツ ────────────────────────── */
  const step2DateList = (
    <div className="space-y-2">
      {sortedDatePairs.map(({ date, originalIndex }) => {
        const key = originalIndex.toString();
        const val = dates[key];
        return (
          <div
            key={originalIndex}
            className="border border-border rounded-[8px] bg-surface"
          >
            <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 w-full">
              <span className="flex-1 min-w-0 text-sm text-text">
                {format(date, 'M月d日(E) HH:mm', { locale: ja })}
              </span>
              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleDate(originalIndex, 'ok')}
                  className={`px-2 py-1.5 rounded-[6px] text-xs font-medium transition-colors ${
                    val === 'ok'
                      ? 'bg-green/15 border border-green/40 text-green'
                      : 'bg-bg border border-border text-muted hover:text-green hover:border-green/40'
                  }`}
                >
                  ○ OK
                </button>
                <button
                  type="button"
                  onClick={() => toggleDate(originalIndex, 'ng')}
                  className={`px-2 py-1.5 rounded-[6px] text-xs font-medium transition-colors ${
                    val === 'ng'
                      ? 'bg-live/10 border border-live/30 text-live'
                      : 'bg-bg border border-border text-muted hover:text-live hover:border-live/30'
                  }`}
                >
                  × NG
                </button>
                <button
                  type="button"
                  onClick={() => toggleDate(originalIndex, 'pending')}
                  className={`px-2 py-1.5 rounded-[6px] text-xs font-medium transition-colors ${
                    val === 'pending'
                      ? 'bg-amber/15 border border-amber/40 text-amber-l'
                      : 'bg-bg border border-border text-muted hover:text-amber-l hover:border-amber/40'
                  }`}
                >
                  ? 未定
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  /* ── Step 2 コンテンツ（モバイル用） ─────────────── */
  const step2Mobile = (
    <div>
      <MobileStepHeader
        step={2}
        label="候補日程に回答してください"
        description="各日程に OK / NG / 未定 で回答してください。"
        active={currentStep === 1}
      />
      <div className="pl-8 space-y-3">
        {step2DateList}
        <div>
          <label className="block text-[12px] font-semibold text-muted mb-2">
            別の日程を提案する（任意）
          </label>
          <input
            type="datetime-local"
            value={alternativeDate}
            onChange={(e) => setAlternativeDate(e.target.value)}
            className="w-full min-w-0 border border-border rounded-[8px] px-3 py-2.5 text-sm bg-surface text-text focus:ring-1 focus:ring-purple focus:border-purple outline-none"
          />
        </div>
      </div>
      <div className="mt-4 pl-8 flex gap-2">
        <button
          type="button"
          onClick={() => setCurrentStep(0)}
          className="flex items-center gap-1 px-3 py-2 rounded-[10px] text-[13px] font-semibold border border-border text-muted hover:text-text transition-colors"
        >
          <Icon name="chevron_right" size={16} className="rotate-180" />
          戻る
        </button>
        <button
          type="button"
          onClick={() => setCurrentStep(2)}
          className="flex items-center gap-1 px-4 py-2 rounded-[10px] text-[13px] font-semibold transition-colors"
          style={{ background: 'var(--purple-d)', color: 'var(--purple-l)' }}
        >
          次へ <Icon name="chevron_right" size={16} />
        </button>
      </div>
    </div>
  );

  /* ── Step 2 コンテンツ（PC用） ───────────────────── */
  const step2Pc = (
    <div className="flex flex-col gap-3">
      {step2DateList}
      <div>
        <label className="block text-[12px] font-semibold text-muted mb-2">
          別の日程を提案する（任意）
        </label>
        <input
          type="datetime-local"
          value={alternativeDate}
          onChange={(e) => setAlternativeDate(e.target.value)}
          className="w-full min-w-0 border border-border rounded-[8px] px-3 py-2.5 text-sm bg-surface text-text focus:ring-1 focus:ring-purple focus:border-purple outline-none"
        />
      </div>
    </div>
  );

  /* ── Step 3 共通コンテンツ ────────────────────────── */
  const step3Submit = (
    <div className="flex flex-col gap-3">
      <div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          rows={4}
          className="w-full border border-border rounded-[8px] px-3 py-2.5 text-sm bg-surface text-text placeholder:text-muted focus:ring-1 focus:ring-purple focus:border-purple outline-none resize-none"
          placeholder="コメントがあればどうぞ（任意）"
        />
        <p className="text-[10px] text-muted text-right font-num">{note.length}/200</p>
      </div>

      {/* 未選択確認ダイアログ */}
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

  /* ── Step 3 コンテンツ（モバイル用） ─────────────── */
  const step3Mobile = (
    <div>
      <MobileStepHeader
        step={3}
        label="コメント（任意）"
        description="一言コメントや都合のつかない理由など、自由に記入してください。"
        active={currentStep === 2}
      />
      <div className="pl-8">
        {step3Submit}
      </div>
      <div className="mt-2 pl-8">
        <button
          type="button"
          onClick={() => setCurrentStep(1)}
          className="flex items-center gap-1 px-3 py-2 rounded-[10px] text-[13px] font-semibold border border-border text-muted hover:text-text transition-colors"
        >
          <Icon name="chevron_right" size={16} className="rotate-180" />
          戻る
        </button>
      </div>
    </div>
  );

  return (
    <div className="overflow-x-hidden">
      {sessionHeader}

      {/* PC: 3カラム横並び（md以上）— 各ステップをカード形式で表示 */}
      <div className="hidden md:grid md:grid-cols-3 md:gap-4 md:items-start">
        {/* Step 1 カード */}
        <div
          className="rounded-[14px] p-5 flex flex-col gap-0"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
        >
          <PcStepBadge
            step={1}
            label="お名前"
            description="回答するお名前を入力、またはメンバーアイコンを選択してください。"
          />
          {step1Pc}
        </div>

        {/* Step 2 カード */}
        <div
          className="rounded-[14px] p-5 flex flex-col gap-0"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
        >
          <PcStepBadge
            step={2}
            label="候補日程への回答"
            description="各日程に OK / NG / 未定 で回答してください。別の日程も提案できます。"
          />
          {step2Pc}
        </div>

        {/* Step 3 カード */}
        <div
          className="rounded-[14px] p-5 flex flex-col gap-0"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
        >
          <PcStepBadge
            step={3}
            label="コメント・送信"
            description="一言コメントがあれば入力し、回答を送信してください。"
          />
          {step3Submit}
        </div>
      </div>

      {/* モバイル: currentStep に応じて1ステップずつ表示 */}
      <div className="md:hidden">
        {/* プログレスバー */}
        <div className="flex items-center gap-1 mb-5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-colors"
              style={{ background: i <= currentStep ? 'var(--purple)' : 'var(--border)' }}
            />
          ))}
        </div>

        {currentStep === 0 && step1Mobile}
        {currentStep === 1 && step2Mobile}
        {currentStep === 2 && step3Mobile}
      </div>
    </div>
  );
}
