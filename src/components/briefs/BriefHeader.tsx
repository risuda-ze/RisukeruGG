'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { DateInput } from '@/components/ui/DateInput';
import { Dropdown } from '@/components/ui/Dropdown';
import { Icon } from '@/components/ui/Icon';
import { FieldInputs } from './FieldInputs';
import { BriefProgress } from './BriefProgress';
import { useBriefOps } from '@/hooks/useBriefOps';
import { planDueDateRecalc } from '@/lib/briefs/deadlines';
import { formatShortDate, fromDateInputValue, toDateInputValue } from '@/lib/briefs/format';
import { BRIEF_STATUS_LABELS, type Brief, type BriefStatus, type Step } from '@/types/briefs';
import type { TeamMember } from '@/types/entities';

interface BriefHeaderProps {
  brief: Brief;
  steps: Step[];
  members: TeamMember[];
}

/**
 * 1枚紙の見出し。タイトル・公開予定日・状態・出演者・見出し項目。
 * 公開予定日の変更は、再計算される締切を差分プレビューで示してから保存する。
 */
export function BriefHeader({ brief, steps, members }: BriefHeaderProps) {
  const briefOps = useBriefOps();
  const canEdit = briefOps.canEdit;
  const [title, setTitle] = useState(brief.title);
  const [pendingPublishAt, setPendingPublishAt] = useState<string | null>(null);
  const [fields, setFields] = useState(brief.fields);
  const [fieldsDirty, setFieldsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新に失敗しました');
    } finally {
      setBusy(false);
    }
  }

  const pendingDate = pendingPublishAt === null ? null : fromDateInputValue(pendingPublishAt);
  const preview = pendingPublishAt === null ? [] : planDueDateRecalc(steps, pendingDate);
  const stepTitle = (id: string) => steps.find((s) => s.id === id)?.title ?? id;

  async function confirmPublishAt() {
    await run(() => briefOps.updateBriefHeader(brief.id, { publishAt: pendingDate }));
    setPendingPublishAt(null);
  }

  function togglePerformer(uid: string) {
    const next = brief.performerIds.includes(uid)
      ? brief.performerIds.filter((id) => id !== uid)
      : [...brief.performerIds, uid];
    run(() => briefOps.updateBriefHeader(brief.id, { performerIds: next }));
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-start gap-3">
        <div className="min-w-0 flex-1">
          {canEdit ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title.trim() && title !== brief.title && run(() => briefOps.updateBriefHeader(brief.id, { title: title.trim() }))}
              className="w-full bg-transparent text-xl font-bold text-text outline-none"
              aria-label="タイトル"
              maxLength={120}
            />
          ) : (
            <h2 className="text-xl font-bold text-text">{brief.title}</h2>
          )}
          <div className="mt-2">
            <BriefProgress steps={steps} />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Dropdown
            options={(Object.keys(BRIEF_STATUS_LABELS) as BriefStatus[]).map((s) => ({ value: s, label: BRIEF_STATUS_LABELS[s] }))}
            value={brief.status}
            onChange={(v) => canEdit && run(() => briefOps.updateBriefHeader(brief.id, { status: v as BriefStatus }))}
            size="sm"
          />
        </div>
      </div>

      {error && <p className="text-[12px] text-live">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 公開予定日 */}
        <div>
          <DateInput
            label="公開予定日"
            value={pendingPublishAt ?? toDateInputValue(brief.publishAt)}
            onChange={(v) => canEdit && setPendingPublishAt(v)}
            hint="変更すると、手で固定していない工程の締切が再計算されます"
          />
        </div>
        {/* 出演者 */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>出演者</span>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => {
              const on = brief.performerIds.includes(m.userId);
              return (
                <button
                  key={m.userId}
                  type="button"
                  disabled={!canEdit || busy}
                  onClick={() => togglePerformer(m.userId)}
                  className={`ds-badge ${on ? 'ds-badge--primary' : 'ds-badge--neutral'} ${canEdit ? 'cursor-pointer' : ''}`}
                  aria-pressed={on}
                >
                  {m.displayName}
                </button>
              );
            })}
            {members.length === 0 && <span className="text-[12px] text-text-muted">メンバーがいません</span>}
          </div>
        </div>
      </div>

      {/* 見出し項目 */}
      {brief.headerFields.length > 0 && (
        <div className="space-y-3">
          <FieldInputs
            defs={brief.headerFields}
            values={fields}
            onChange={(key, value) => {
              setFields((prev) => ({ ...prev, [key]: value }));
              setFieldsDirty(true);
            }}
            disabled={!canEdit}
          />
          {canEdit && (
            <Button
              size="sm"
              variant="secondary"
              disabled={!fieldsDirty || busy}
              onClick={() => run(() => briefOps.updateBriefHeader(brief.id, { fields })).then(() => setFieldsDirty(false))}
            >
              見出しを保存する
            </Button>
          )}
        </div>
      )}

      {/* 公開予定日変更の差分プレビュー */}
      <Modal
        open={pendingPublishAt !== null}
        onClose={() => setPendingPublishAt(null)}
        title="公開予定日を変更"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingPublishAt(null)} disabled={busy}>
              キャンセル
            </Button>
            <Button onClick={confirmPublishAt} loading={busy}>
              変更する
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-2 mb-3">
          {formatShortDate(brief.publishAt)} → <span className="text-text font-medium">{formatShortDate(pendingDate)}</span>
        </p>
        {preview.length === 0 ? (
          <p className="text-[12px] text-text-muted">締切が変わる工程はありません</p>
        ) : (
          <ul className="space-y-1.5 text-[12px]">
            {preview.map((c) => (
              <li key={c.stepId} className="flex items-center gap-2">
                <Icon name="chevron_right" size={12} className="text-text-muted" />
                <span className="text-text flex-1 truncate">{stepTitle(c.stepId)}</span>
                <span className="text-text-muted">{formatShortDate(c.before)}</span>
                <span className="text-text-muted">→</span>
                <span className="text-text font-medium">{formatShortDate(c.after)}</span>
              </li>
            ))}
          </ul>
        )}
        {steps.some((s) => s.dueDateOverridden) && (
          <p className="text-[11px] text-text-muted mt-3">手で固定した工程の締切は変わりません</p>
        )}
      </Modal>
    </Card>
  );
}
