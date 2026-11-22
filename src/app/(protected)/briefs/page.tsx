'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth';
import { useBriefsStore, selectStepsOfBrief } from '@/stores/briefs';
import { useBriefOps } from '@/hooks/useBriefOps';
import { TopBar } from '@/components/layout/TopBar';
import { Button, buttonVariants } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { BriefsLoadError } from '@/components/briefs/BriefsLoadError';
import { Icon } from '@/components/ui/Icon';
import { Badge, badgeVariants } from '@/components/ui/Badge';
import { BriefCard } from '@/components/briefs/BriefCard';
import { NewBriefModal } from '@/components/briefs/NewBriefModal';
import type { Brief } from '@/types/briefs';
import { cn } from '@/lib/utils/cn';

type Filter = 'active' | 'mine' | 'all';

/**
 * タスク管理 v2: ブリーフ一覧（/briefs）。
 * 進行中のブリーフをカードで並べ、公開予定日・進捗・注意を一目で見せる。
 */
export default function BriefsPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const currentTeam = useAuthStore((s) => s.currentTeam);
  const members = useAuthStore((s) => s.members);
  const briefs = useBriefsStore((s) => s.briefs);
  const steps = useBriefsStore((s) => s.steps);
  const playbooks = useBriefsStore((s) => s.playbooks);
  const loading = useBriefsStore((s) => s.loading);
  const loadError = useBriefsStore((s) => s.error);
  const subscribe = useBriefsStore((s) => s.subscribe);
  const briefOps = useBriefOps();

  const [filter, setFilter] = useState<Filter>('active');
  const [showNew, setShowNew] = useState(false);

  const teamId = currentTeam?.id;
  useEffect(() => {
    if (!teamId) return;
    return subscribe(teamId);
  }, [teamId, subscribe]);

  const visible = useMemo(() => {
    const uid = currentUser?.uid;
    return briefs.filter((b: Brief) => {
      if (filter === 'all') return true;
      if (filter === 'mine') {
        return (
          b.performerIds.includes(uid ?? '') ||
          steps.some((s) => s.briefId === b.id && s.assigneeId === uid && s.status !== 'done' && s.status !== 'skipped')
        );
      }
      return b.status === 'planning' || b.status === 'in_progress';
    });
  }, [briefs, steps, filter, currentUser?.uid]);

  if (!teamId) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar title="タスク管理 v2" />
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-7 max-w-lg">
          <Card>
            <p className="text-sm text-text-muted">チームに参加すると、動画ごとの1枚紙で制作を進められます。</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="タスク管理 v2" subtitle="動画1本を1枚紙で回す（β）">
        <div className="flex items-center gap-2">
          <Link href="/briefs/mine" className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'hidden sm:inline-flex')}>
            <Icon name="task_alt" size={14} />
            自分の工程
          </Link>
          <Link href="/briefs/playbooks" className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'hidden sm:inline-flex')}>
            <Icon name="settings" size={14} />
            進め方
          </Link>
          {briefOps.canCreate && (
            <Button size="sm" onClick={() => setShowNew(true)}>
              <Icon name="add" size={14} />
              新しいブリーフ
            </Button>
          )}
        </div>
      </TopBar>

      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-7">
        {/* フィルタ */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {(
            [
              ['active', '進行中'],
              ['mine', '自分が関わる'],
              ['all', 'すべて'],
            ] as Array<[Filter, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(badgeVariants({ variant: filter === key ? 'primary' : 'neutral' }), 'cursor-pointer')}
              aria-pressed={filter === key}
            >
              {label}
            </button>
          ))}
          <div className="sm:hidden ml-auto flex gap-2">
            <Link href="/briefs/mine" className="text-[12px] text-brand-2">自分の工程</Link>
            <Link href="/briefs/playbooks" className="text-[12px] text-brand-2">進め方</Link>
          </div>
        </div>

        {loadError ? (
          <BriefsLoadError message={loadError} />
        ) : loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : visible.length === 0 ? (
          <Card className="text-center py-10">
            <p className="text-sm text-text mb-1">
              {briefs.length === 0 ? 'まだブリーフがありません' : '条件に合うブリーフがありません'}
            </p>
            <p className="text-[12px] text-text-muted mb-4">
              動画1本ごとに1枚紙を作ると、工程・担当・締切が自動で埋まります。
              {playbooks.length === 0 && ' まず「進め方」を作っておくと、次からは公開日を入れるだけで済みます。'}
            </p>
            {briefOps.canCreate && (
              <div className="flex justify-center gap-2">
                <Button size="sm" onClick={() => setShowNew(true)}>
                  新しいブリーフ
                </Button>
                {playbooks.length === 0 && (
                  <Link href="/briefs/playbooks" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
                    進め方を作る
                  </Link>
                )}
              </div>
            )}
          </Card>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))' }}>
            {visible.map((b) => (
              <BriefCard key={b.id} brief={b} steps={selectStepsOfBrief(steps, b.id)} members={members} />
            ))}
          </div>
        )}

        <p className="mt-6 text-[11px] text-text-muted flex items-center gap-1">
          <Badge variant="info">β</Badge>
          従来のカンバン（タスク管理）はそのまま使えます。v2 は動画1本単位の進行管理に向いています。
        </p>
      </div>

      {showNew && (
        <NewBriefModal open onClose={() => setShowNew(false)} playbooks={playbooks} members={members} />
      )}
    </div>
  );
}
