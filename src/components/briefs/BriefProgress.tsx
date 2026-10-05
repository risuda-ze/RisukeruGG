import { isStepClosed } from '@/lib/briefs/transitions';
import type { Step } from '@/types/briefs';

/** 工程の進捗帯（完了・スキップ / 全体） */
export function BriefProgress({ steps, compact = false }: { steps: Step[]; compact?: boolean }) {
  const total = steps.length;
  const closed = steps.filter((s) => isStepClosed(s.status)).length;
  const ratio = total === 0 ? 0 : Math.round((closed / total) * 100);
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div
        className="h-1.5 flex-1 rounded-full overflow-hidden"
        style={{ background: 'var(--border)' }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={closed}
        aria-label="工程の進捗"
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${ratio}%`, background: ratio === 100 ? 'var(--success)' : 'var(--primary)' }}
        />
      </div>
      <span className={`shrink-0 tabular-nums text-muted ${compact ? 'text-[11px]' : 'text-[12px]'}`}>
        {closed}/{total}
      </span>
    </div>
  );
}
