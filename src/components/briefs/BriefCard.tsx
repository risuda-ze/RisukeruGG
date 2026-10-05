'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { BriefProgress } from './BriefProgress';
import { daysUntilDue } from '@/lib/briefs/deadlines';
import { isBlockedByInput, isStepClosed } from '@/lib/briefs/transitions';
import { formatShortDate } from '@/lib/briefs/format';
import { BRIEF_STATUS_LABELS, type Brief, type Step } from '@/types/briefs';
import type { TeamMember } from '@/types/entities';

interface BriefCardProps {
  brief: Brief;
  steps: Step[];
  members: TeamMember[];
}

/** ブリーフ一覧の 1 枚。公開予定日・進捗・注意（入力待ち・遅延・担当未定）を出す */
export function BriefCard({ brief, steps, members }: BriefCardProps) {
  const open = steps.filter((s) => !isStepClosed(s.status));
  const blocked = open.filter(isBlockedByInput).length;
  const overdue = open.filter((s) => {
    const d = daysUntilDue(s.dueDate);
    return d !== null && d < 0;
  }).length;
  const unassigned = open.filter((s) => s.status !== 'waiting' && !s.assigneeId).length;
  const next = open.find((s) => s.status === 'ready' || s.status === 'in_progress');
  const nextAssignee = next?.assigneeId ? members.find((m) => m.userId === next.assigneeId) : null;
  const publishDays = daysUntilDue(brief.publishAt);

  return (
    <Link href={`/briefs/${brief.id}`} className="block no-underline">
      <Card interactive className="flex flex-col gap-3 h-full">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-bold text-text leading-snug line-clamp-2">{brief.title}</h3>
          <Badge variant={brief.status === 'published' ? 'success' : brief.status === 'archived' ? 'muted' : 'info'}>
            {BRIEF_STATUS_LABELS[brief.status]}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-muted">
          <Icon name="event" size={14} />
          <span>公開 {formatShortDate(brief.publishAt)}</span>
          {publishDays !== null && publishDays >= 0 && brief.status !== 'published' && (
            <span className="text-text-2">（あと{publishDays}日）</span>
          )}
        </div>
        <BriefProgress steps={steps} compact />
        {next && (
          <p className="text-[12px] text-text-2 truncate">
            次: {next.title}
            {nextAssignee && <span className="text-muted">（{nextAssignee.displayName}）</span>}
          </p>
        )}
        {(blocked > 0 || overdue > 0 || unassigned > 0) && (
          <div className="flex flex-wrap gap-1">
            {overdue > 0 && <Badge variant="danger">遅延 {overdue}</Badge>}
            {blocked > 0 && <Badge variant="warning">入力待ち {blocked}</Badge>}
            {unassigned > 0 && <Badge variant="neutral">担当未定 {unassigned}</Badge>}
          </div>
        )}
      </Card>
    </Link>
  );
}
