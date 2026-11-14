'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { useBriefsStore, selectStepsOfBrief } from '@/stores/briefs';
import { useBriefOps } from '@/hooks/useBriefOps';
import { createPlaybook } from '@/lib/repositories/playbooks';
import { subscribeBriefEvents } from '@/lib/repositories/briefs';
import { deriveHeaderFieldsFromBrief, derivePlaybookStepsFromBrief } from '@/lib/briefs/generate';
import { formatDateTime, formatShortDate } from '@/lib/briefs/format';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { BriefsLoadError } from '@/components/briefs/BriefsLoadError';
import { Icon } from '@/components/ui/Icon';
import { BriefHeader } from '@/components/briefs/BriefHeader';
import { StepRow } from '@/components/briefs/StepRow';
import { StepPanel } from '@/components/briefs/StepPanel';
import { AddStepModal } from '@/components/briefs/AddStepModal';
import { STEP_STATUS_LABELS, type BriefEvent, type Step, type StepStatus } from '@/types/briefs';
import type { TeamMember } from '@/types/entities';

/** 差分 1 件の説明文 */
function describeEvent(e: BriefEvent, members: TeamMember[], stepTitle: (id: string | null) => string): string {
  const who = e.actorId ? (members.find((m) => m.userId === e.actorId)?.displayName ?? 'メンバー') : e.source === 'discord' ? 'Discord' : '自動';
  const name = (id: unknown) => (typeof id === 'string' ? (members.find((m) => m.userId === id)?.displayName ?? id) : '未定');
  const asDate = (v: unknown) => (v instanceof Date ? formatShortDate(v) : '未設定');
  const status = (v: unknown) => STEP_STATUS_LABELS[v as StepStatus] ?? String(v);
  switch (e.type) {
    case 'brief.created':
      return `${who} がブリーフを作成`;
    case 'brief.title_changed':
      return `${who} がタイトルを「${String(e.after)}」に変更`;
    case 'brief.publishAt_changed':
      return `${who} が公開予定日を ${asDate(e.before)} → ${asDate(e.after)} に変更`;
    case 'brief.status_changed':
      return `${who} が状態を変更`;
    case 'brief.field_changed':
      return `${who} が見出しの項目を更新`;
    case 'step.status_changed':
      return `${who}: ${stepTitle(e.stepId)} を ${status(e.before)} → ${status(e.after)}`;
    case 'step.assignee_changed':
      return `${who}: ${stepTitle(e.stepId)} の担当を ${name(e.before)} → ${name(e.after)}`;
    case 'step.dueDate_changed':
      return `${who}: ${stepTitle(e.stepId)} の締切を ${asDate(e.before)} → ${asDate(e.after)}`;
    case 'step.field_filled':
      return `${who}: ${stepTitle(e.stepId)} の情報を入力`;
    case 'step.added':
      return `${who} が工程「${stepTitle(e.stepId)}」を追加`;
    case 'step.removed':
      return `${who} が工程を削除`;
    default:
      return String(e.type);
  }
}

/**
 * 1枚紙（/briefs/[id]）。見出しと工程一覧を本文に、詳細は右の工程パネルで開く。
 */
export default function BriefDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const briefId = params.id;

  const currentTeam = useAuthStore((s) => s.currentTeam);
  const members = useAuthStore((s) => s.members);
  const briefs = useBriefsStore((s) => s.briefs);
  const allSteps = useBriefsStore((s) => s.steps);
  const loading = useBriefsStore((s) => s.loading);
  const loadError = useBriefsStore((s) => s.error);
  const subscribe = useBriefsStore((s) => s.subscribe);
  const briefOps = useBriefOps();

  const [selectedStepId, setSelectedStepId] = useState<string | null>(searchParams.get('step'));
  const [showAdd, setShowAdd] = useState(false);
  const [events, setEvents] = useState<BriefEvent[]>([]);
  const [showEvents, setShowEvents] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingPlaybook, setSavingPlaybook] = useState(false);

  const teamId = currentTeam?.id;
  useEffect(() => {
    if (!teamId) return;
    return subscribe(teamId);
  }, [teamId, subscribe]);
  useEffect(() => {
    if (!teamId || !showEvents) return;
    return subscribeBriefEvents(teamId, briefId, setEvents);
  }, [teamId, briefId, showEvents]);

  const brief = briefs.find((b) => b.id === briefId) ?? null;
  const steps = useMemo(() => selectStepsOfBrief(allSteps, briefId), [allSteps, briefId]);
  const selectedStep = steps.find((s) => s.id === selectedStepId) ?? null;
  const stepTitle = (id: string | null) => steps.find((s) => s.id === id)?.title ?? '工程';

  async function completeFromRow(step: Step) {
    setError(null);
    try {
      await briefOps.changeStepStatus(step.briefId, step.id, 'done');
    } catch (err) {
      setError(err instanceof Error ? err.message : '完了にできませんでした');
    }
  }

  async function saveAsPlaybook() {
    if (!teamId || !brief) return;
    const name = prompt('進め方の名前', `${brief.title} の進め方`);
    if (!name) return;
    setSavingPlaybook(true);
    try {
      await createPlaybook(teamId, {
        name,
        origin: 'derived',
        headerFields: deriveHeaderFieldsFromBrief(brief),
        steps: derivePlaybookStepsFromBrief(steps),
      });
    } catch {
      setError('進め方の保存に失敗しました');
    } finally {
      setSavingPlaybook(false);
    }
  }

  if (loadError && !brief) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar title="ブリーフ" />
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-7 max-w-lg">
          <BriefsLoadError message={loadError} />
        </div>
      </div>
    );
  }
  if (loading && !brief) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar title="ブリーフ" />
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }
  if (!brief) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar title="ブリーフ" />
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-7 max-w-lg">
          <Card>
            <p className="text-sm text-muted">ブリーフが見つかりません。</p>
            <Link href="/briefs" className="text-[12px] text-purple-l hover:underline">一覧に戻る</Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title={brief.title} subtitle={`公開 ${formatShortDate(brief.publishAt)}`}>
        <div className="flex items-center gap-2">
          <Link href="/briefs" className="btn btn--secondary btn--sm">
            <Icon name="arrow_back" size={14} />
            一覧
          </Link>
          {briefOps.canEdit && (
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Icon name="add" size={14} />
              工程
            </Button>
          )}
        </div>
      </TopBar>

      <div className="flex-1 flex overflow-hidden">
        {/* 本文（1枚紙） */}
        <div className={`flex-1 overflow-y-auto px-4 py-6 md:px-7 ${selectedStep ? 'hidden md:block' : ''}`}>
          <div className="max-w-3xl space-y-4">
            {error && <p className="text-[12px] text-live">{error}</p>}
            <BriefHeader brief={brief} steps={steps} members={members} />

            <Card noPadding>
              <div className="px-4 pt-4">
                <CardHeader
                  title="工程"
                  action={
                    <div className="flex items-center gap-2">
                      {briefOps.canEdit && steps.length > 0 && (
                        <Button size="sm" variant="subtle" onClick={saveAsPlaybook} loading={savingPlaybook}>
                          この流れを進め方にする
                        </Button>
                      )}
                    </div>
                  }
                />
              </div>
              <div className="px-2 pb-2">
                {steps.length === 0 ? (
                  <p className="text-[12px] text-muted px-2 pb-3">
                    工程がありません。
                    {briefOps.canEdit && '「工程」ボタンから追加するか、進め方を作って次のブリーフから自動生成できます。'}
                  </p>
                ) : (
                  steps.map((s) => (
                    <StepRow
                      key={s.id}
                      step={s}
                      members={members}
                      selected={s.id === selectedStepId}
                      onSelect={(st) => setSelectedStepId(st.id)}
                      onComplete={completeFromRow}
                      canEdit={briefOps.canEdit}
                    />
                  ))
                )}
              </div>
            </Card>

            {/* 差分 */}
            <Card>
              <button
                type="button"
                onClick={() => setShowEvents((v) => !v)}
                className="w-full flex items-center justify-between text-left"
                aria-expanded={showEvents}
              >
                <span className="text-sm font-semibold text-text">変更の記録</span>
                <Icon name={showEvents ? 'expand_less' : 'expand_more'} size={18} className="text-muted" />
              </button>
              {showEvents && (
                <ul className="mt-3 space-y-1.5">
                  {events.length === 0 && <li className="text-[12px] text-muted">記録はまだありません</li>}
                  {events.map((e) => (
                    <li key={e.id} className="text-[12px] text-text-2 flex gap-2">
                      <span className="text-muted shrink-0 tabular-nums">{formatDateTime(e.createdAt)}</span>
                      <span>{describeEvent(e, members, stepTitle)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>

        {/* 工程パネル */}
        {selectedStep && (
          <div className="w-full md:w-[380px] lg:w-[420px] shrink-0 overflow-hidden">
            <StepPanel step={selectedStep} members={members} onClose={() => setSelectedStepId(null)} />
          </div>
        )}
      </div>

      {showAdd && (
        <AddStepModal open onClose={() => setShowAdd(false)} briefId={brief.id} steps={steps} members={members} />
      )}
    </div>
  );
}
