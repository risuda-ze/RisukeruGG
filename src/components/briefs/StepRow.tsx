'use client';

import { Icon } from '@/components/ui/Icon';
import { StepAlertBadges, StepStatusBadge } from './StepStatusBadge';
import { formatShortDate } from '@/lib/briefs/format';
import type { Step } from '@/types/briefs';
import type { TeamMember } from '@/types/entities';

interface StepRowProps {
  step: Step;
  members: TeamMember[];
  selected: boolean;
  onSelect: (step: Step) => void;
  onComplete?: (step: Step) => void;
  canEdit: boolean;
}

/**
 * 1枚紙の工程行。本文には状態・担当・締切だけを置き、詳細は工程パネルで開く（1枚は1枚）。
 */
export function StepRow({ step, members, selected, onSelect, onComplete, canEdit }: StepRowProps) {
  const assignee = step.assigneeId ? members.find((m) => m.userId === step.assigneeId) : null;
  const actionable = canEdit && (step.status === 'ready' || step.status === 'in_progress');
  const closed = step.status === 'done' || step.status === 'skipped';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(step)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(step);
        }
      }}
      aria-current={selected ? 'true' : undefined}
      className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_minmax(0,1fr)_140px_110px_auto] items-center gap-x-3 gap-y-1 px-3 py-2.5 rounded-[10px] cursor-pointer transition-colors border"
      style={{
        borderColor: selected ? 'var(--primary)' : 'transparent',
        background: selected ? 'var(--purple-xs)' : 'transparent',
        opacity: closed ? 0.6 : 1,
      }}
    >
      {/* 完了チェック */}
      <button
        type="button"
        disabled={!actionable}
        onClick={(e) => {
          e.stopPropagation();
          onComplete?.(step);
        }}
        aria-label={closed ? '完了済み' : '完了にする'}
        className="w-6 h-6 rounded-full border flex items-center justify-center shrink-0 disabled:cursor-default transition-colors"
        style={{
          borderColor: closed ? 'var(--success)' : actionable ? 'var(--primary)' : 'var(--border)',
          background: closed ? 'var(--success)' : 'transparent',
          color: closed ? 'var(--bg)' : 'var(--primary)',
        }}
      >
        {closed && <Icon name="check" size={14} />}
      </button>

      {/* タイトルと注意 */}
      <div className="min-w-0">
        <div className={`text-sm font-medium truncate ${closed ? 'line-through text-muted' : 'text-text'}`}>
          {step.title}
        </div>
        <div className="flex flex-wrap items-center gap-1 mt-0.5">
          <StepAlertBadges step={step} />
        </div>
      </div>

      {/* 担当（モバイルでは 2 行目） */}
      <div className="col-start-2 md:col-start-3 text-[12px] text-text-2 truncate flex items-center gap-1">
        <Icon name="manage_accounts" size={13} className="text-muted shrink-0" />
        {assignee ? assignee.displayName : <span className="text-muted">未定</span>}
      </div>

      {/* 締切 */}
      <div className="col-start-2 md:col-start-4 text-[12px] text-text-2 flex items-center gap-1">
        <Icon name="event" size={13} className="text-muted shrink-0" />
        {formatShortDate(step.dueDate)}
        {step.dueDateOverridden && <span className="text-muted text-[10px]">固定</span>}
      </div>

      {/* 状態 */}
      <div className="row-start-1 col-start-3 md:col-start-5 justify-self-end">
        <StepStatusBadge status={step.status} />
      </div>
    </div>
  );
}
