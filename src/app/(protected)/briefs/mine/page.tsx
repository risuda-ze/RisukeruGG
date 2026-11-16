'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth';
import { useBriefsStore } from '@/stores/briefs';
import { TopBar } from '@/components/layout/TopBar';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { BriefsLoadError } from '@/components/briefs/BriefsLoadError';
import { Icon } from '@/components/ui/Icon';
import { StepAlertBadges, StepStatusBadge } from '@/components/briefs/StepStatusBadge';
import { formatShortDate } from '@/lib/briefs/format';
import { isStepClosed } from '@/lib/briefs/transitions';

/**
 * 自分の工程（/briefs/mine）。全ブリーフの自分の担当工程を締切順に並べる。
 * 複数の動画を同時に抱える編集者向け。
 */
export default function MyStepsPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const currentTeam = useAuthStore((s) => s.currentTeam);
  const briefs = useBriefsStore((s) => s.briefs);
  const steps = useBriefsStore((s) => s.steps);
  const loading = useBriefsStore((s) => s.loading);
  const loadError = useBriefsStore((s) => s.error);
  const subscribe = useBriefsStore((s) => s.subscribe);

  const teamId = currentTeam?.id;
  useEffect(() => {
    if (!teamId) return;
    return subscribe(teamId);
  }, [teamId, subscribe]);

  const mine = useMemo(() => {
    const uid = currentUser?.uid;
    const briefById = new Map(briefs.map((b) => [b.id, b]));
    return steps
      .filter((s) => s.assigneeId === uid && !isStepClosed(s.status))
      .filter((s) => {
        const b = briefById.get(s.briefId);
        return b && b.status !== 'archived';
      })
      .sort((a, b) => {
        // 締切あり → 近い順、締切なしは末尾。同日なら着手可能を先に
        const ad = a.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
        const bd = b.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
        if (ad !== bd) return ad - bd;
        return (a.status === 'waiting' ? 1 : 0) - (b.status === 'waiting' ? 1 : 0);
      })
      .map((s) => ({ step: s, brief: briefById.get(s.briefId)! }));
  }, [steps, briefs, currentUser?.uid]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="自分の工程" subtitle="担当している工程を締切順に">
        <Link href="/briefs" className="btn btn--secondary btn--sm">
          <Icon name="arrow_back" size={14} />
          ブリーフ一覧
        </Link>
      </TopBar>
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-7 max-w-2xl">
        {loadError ? (
          <BriefsLoadError message={loadError} />
        ) : loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : mine.length === 0 ? (
          <Card className="text-center py-10">
            <p className="text-sm text-text">担当している工程はありません</p>
          </Card>
        ) : (
          <ul className="space-y-2">
            {mine.map(({ step, brief }) => (
              <li key={step.id}>
                <Link href={`/briefs/${brief.id}?step=${step.id}`} className="block no-underline">
                  <Card interactive className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] text-text-muted truncate">{brief.title}</div>
                      <div className="text-sm font-medium text-text truncate">{step.title}</div>
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        <StepStatusBadge status={step.status} />
                        <StepAlertBadges step={step} />
                      </div>
                    </div>
                    <div className="text-[12px] text-text-2 shrink-0 flex items-center gap-1">
                      <Icon name="event" size={13} className="text-text-muted" />
                      {formatShortDate(step.dueDate)}
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
