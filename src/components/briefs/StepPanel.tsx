'use client';

import { useEffect, useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/Button';
import { Dropdown } from '@/components/ui/Dropdown';
import { DateInput } from '@/components/ui/DateInput';
import { Textarea } from '@/components/ui/Textarea';
import { Icon } from '@/components/ui/Icon';
import { FieldInputs } from './FieldInputs';
import { StepAlertBadges, StepStatusBadge } from './StepStatusBadge';
import { useBriefOps } from '@/hooks/useBriefOps';
import { addStepComment, subscribeStepComments } from '@/lib/repositories/briefs';
import { canTransition, missingRequiredFields } from '@/lib/briefs/transitions';
import { formatDateTime, fromDateInputValue, toDateInputValue } from '@/lib/briefs/format';
import { stepCommentInputSchema } from '@/lib/validations/briefs';
import { useAuthStore } from '@/stores/auth';
import { briefsLoadErrorMessage } from '@/stores/briefs';
import type { Step, StepComment, StepStatus } from '@/types/briefs';
import type { TeamMember } from '@/types/entities';

interface StepPanelProps {
  step: Step;
  members: TeamMember[];
  onClose: () => void;
}

/**
 * 工程パネル（右ドロワー / モバイルは全画面）。
 * 状態の操作、担当・締切、工程固有の項目、コメントをここで扱う。
 */
export function StepPanel({ step, members, onClose }: StepPanelProps) {
  const briefOps = useBriefOps();
  const currentUser = useAuthStore((s) => s.currentUser);
  const teamId = briefOps.teamId;
  const canEdit = briefOps.canEdit;

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState(step.title);
  const [fields, setFields] = useState<Record<string, unknown>>(step.fields);
  const [fieldsDirty, setFieldsDirty] = useState(false);
  const [comments, setComments] = useState<StepComment[]>([]);
  const [commentBody, setCommentBody] = useState('');

  // 別の工程に切り替わったらローカル状態を差し替える
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTitle(step.title);
    setFields(step.fields);
    setFieldsDirty(false);
    setError(null);
  }, [step.id, step.title, step.fields]);

  useEffect(() => {
    if (!teamId) return;
    // コメントの読み取りが拒否されても画面に理由を出す
    return subscribeStepComments(teamId, step.briefId, step.id, setComments, (err) =>
      setError(briefsLoadErrorMessage(err))
    );
  }, [teamId, step.briefId, step.id]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作に失敗しました');
    } finally {
      setBusy(false);
    }
  }

  const transition = (to: StepStatus) => run(() => briefOps.changeStepStatus(step.briefId, step.id, to));
  const missing = missingRequiredFields({ requiredFields: step.requiredFields, fields });

  async function saveFields() {
    await run(() => briefOps.setStepFields(step.briefId, step.id, fields));
    setFieldsDirty(false);
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId || !currentUser) return;
    const parsed = stepCommentInputSchema.safeParse({ body: commentBody.trim() });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'コメントを入力してください');
      return;
    }
    await run(() =>
      addStepComment(teamId, step.briefId, step.id, {
        authorId: currentUser.uid,
        authorName: currentUser.displayName ?? 'メンバー',
        body: parsed.data.body,
      })
    );
    setCommentBody('');
  }

  const actions: Array<{ to: StepStatus; label: string; variant: 'primary' | 'secondary' | 'success' | 'subtle' }> = [
    { to: 'in_progress', label: '着手する', variant: 'secondary' },
    { to: 'done', label: '完了にする', variant: 'success' },
    { to: 'skipped', label: '飛ばす', variant: 'subtle' },
    { to: 'ready', label: '差し戻す', variant: 'subtle' },
  ];

  return (
    <aside
      className="flex flex-col h-full bg-surface border-l border-border"
      aria-label={`工程: ${step.title}`}
    >
      {/* ヘッダー */}
      <div className="flex items-start gap-2 px-4 py-3 border-b border-border">
        <div className="min-w-0 flex-1">
          {canEdit ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title.trim() !== step.title && run(() => briefOps.renameStep(step.briefId, step.id, title))}
              className="w-full bg-transparent text-base font-bold text-text outline-none"
              aria-label="工程名"
              maxLength={60}
            />
          ) : (
            <h3 className="text-base font-bold text-text">{step.title}</h3>
          )}
          <div className="flex flex-wrap items-center gap-1 mt-1">
            <StepStatusBadge status={step.status} />
            <StepAlertBadges step={step} />
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="閉じる" className={buttonVariants({ variant: 'subtle', size: 'icon-sm' })}>
          <Icon name="close" size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {error && <p className="text-[12px] text-live">{error}</p>}

        {/* 状態の操作 */}
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            {actions
              .filter((a) => canTransition(step, a.to).ok)
              .map((a) => (
                <Button key={a.to} size="sm" variant={a.variant} onClick={() => transition(a.to)} disabled={busy}>
                  {a.label}
                </Button>
              ))}
          </div>
        )}
        {step.status === 'waiting' && (
          <p className="text-[12px] text-text-muted">
            先行工程（{step.dependsOn.join('・') || 'なし'}）が終わると着手できます
          </p>
        )}

        {/* 担当・締切 */}
        <div className="grid grid-cols-1 gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>
              担当
            </span>
            <Dropdown
              options={[{ value: '', label: '未定' }, ...members.map((m) => ({ value: m.userId, label: m.displayName }))]}
              value={step.assigneeId ?? ''}
              onChange={(v) => canEdit && run(() => briefOps.assignStep(step.briefId, step.id, v || null))}
              size="sm"
            />
          </div>
          <div>
            <DateInput
              label="締切"
              value={toDateInputValue(step.dueDate)}
              onChange={(v) => canEdit && run(() => briefOps.setStepDueDate(step.briefId, step.id, fromDateInputValue(v)))}
              hint={
                step.dueDateOverridden
                  ? '手で固定した締切です。公開日を変えても動きません'
                  : `公開予定日の ${step.leadDays} 日前から自動計算`
              }
            />
            {step.dueDateOverridden && canEdit && (
              <button
                type="button"
                className="mt-1 text-[11px] text-brand-2 hover:underline"
                onClick={() => run(() => briefOps.setStepDueDate(step.briefId, step.id, null))}
              >
                固定を解除して自動計算に戻す
              </button>
            )}
          </div>
        </div>

        {/* 工程固有の項目 */}
        {step.requiredFields.length > 0 && (
          <section className="space-y-3">
            <h4 className="text-[12px] font-semibold text-text-muted uppercase tracking-wide">この工程に必要な情報</h4>
            <FieldInputs
              defs={step.requiredFields}
              values={fields}
              onChange={(key, value) => {
                setFields((prev) => ({ ...prev, [key]: value }));
                setFieldsDirty(true);
              }}
              disabled={!canEdit}
            />
            {missing.length > 0 && (
              <p className="text-[11px] text-orange-text">
                未入力: {missing.map((f) => f.label).join('、')}
                {missing.some((f) => f.ownerRoleLabel) &&
                  `（${[...new Set(missing.map((f) => f.ownerRoleLabel).filter(Boolean))].join('・')} が入力）`}
              </p>
            )}
            {canEdit && (
              <Button size="sm" onClick={saveFields} disabled={!fieldsDirty || busy} loading={busy && fieldsDirty}>
                情報を保存する
              </Button>
            )}
          </section>
        )}

        {/* コメント */}
        <section className="space-y-3">
          <h4 className="text-[12px] font-semibold text-text-muted uppercase tracking-wide">やり取り</h4>
          {comments.length === 0 ? (
            <p className="text-[12px] text-text-muted">まだコメントはありません</p>
          ) : (
            <ul className="space-y-2">
              {comments.map((c) => (
                <li key={c.id} className="rounded-[10px] px-3 py-2" style={{ background: 'var(--canvas)' }}>
                  <div className="flex items-center gap-2 text-[11px] text-text-muted">
                    <span className="font-medium text-text-2">{c.authorName}</span>
                    <span>{formatDateTime(c.createdAt)}</span>
                    {c.source === 'discord' && <Icon name="discord" size={12} />}
                  </div>
                  <p className="text-sm text-text whitespace-pre-wrap mt-1">{c.body}</p>
                </li>
              ))}
            </ul>
          )}
          {canEdit && (
            <form onSubmit={submitComment} className="space-y-2">
              <Textarea
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="この工程についてのメモ・相談"
                rows={2}
                maxLength={2000}
              />
              <Button type="submit" size="sm" variant="secondary" disabled={!commentBody.trim() || busy}>
                コメントする
              </Button>
            </form>
          )}
        </section>

        {/* 削除 */}
        {canEdit && (
          <div className="pt-2 border-t border-border">
            <button
              type="button"
              className="text-[12px] text-text-muted hover:text-live transition-colors"
              onClick={() => {
                if (confirm(`工程「${step.title}」を削除しますか？`)) {
                  run(() => briefOps.removeStep(step.briefId, step.id)).then(onClose);
                }
              }}
            >
              この工程を削除する
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
