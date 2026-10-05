import { Badge } from '@/components/ui/Badge';
import { daysUntilDue } from '@/lib/briefs/deadlines';
import { isBlockedByInput } from '@/lib/briefs/transitions';
import { STEP_STATUS_LABELS, type Step, type StepStatus } from '@/types/briefs';

const STATUS_VARIANT: Record<StepStatus, 'neutral' | 'info' | 'primary' | 'success' | 'muted'> = {
  waiting: 'neutral',
  ready: 'info',
  in_progress: 'primary',
  done: 'success',
  skipped: 'muted',
};

/** 工程の状態バッジ */
export function StepStatusBadge({ status }: { status: StepStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STEP_STATUS_LABELS[status]}</Badge>;
}

/**
 * 工程の注意バッジ（入力待ち・締切超過・今日締切）。該当しなければ何も描画しない。
 * 完了・スキップ済みには出さない。
 */
export function StepAlertBadges({ step }: { step: Step }) {
  if (step.status === 'done' || step.status === 'skipped') return null;
  const days = daysUntilDue(step.dueDate);
  return (
    <>
      {isBlockedByInput(step) && <Badge variant="warning">入力待ち</Badge>}
      {days !== null && days < 0 && <Badge variant="danger">{-days}日超過</Badge>}
      {days === 0 && <Badge variant="danger">今日</Badge>}
      {days !== null && days > 0 && days <= 2 && <Badge variant="amber">あと{days}日</Badge>}
      {!step.assigneeId && step.status !== 'waiting' && <Badge variant="neutral">担当未定</Badge>}
    </>
  );
}
