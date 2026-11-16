'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth';
import { useTasksStore } from '@/stores/tasks';
import { useScheduleStore } from '@/stores/schedule';
import { subscribeCollabSessions } from '@/lib/repositories/collabs';
import { createTeam } from '@/lib/repositories/teams';
import { trackEvent } from '@/lib/analytics';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { TaskBoardPreview } from '@/components/dashboard/TaskBoardPreview';
import { BannerAd } from '@/components/plan/BannerAd';
import { LegalUpdateNotice } from '@/components/dashboard/LegalUpdateNotice';
import { isPartyPlan } from '@/lib/plan';
import { TeamJoinForm } from '@/components/team/TeamJoinForm';
import { TopBar } from '@/components/layout/TopBar';
import { ROLE_BADGE, ROLE_LABELS } from '@/lib/utils/teamRoles';
import type { CollabSession } from '@/types/entities';

export default function DashboardPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const currentTeam = useAuthStore((s) => s.currentTeam);
  const members = useAuthStore((s) => s.members);
  const loading = useAuthStore((s) => s.loading);
  const tasks = useTasksStore((s) => s.tasks);
  const columns = useTasksStore((s) => s.columns);
  const subscribeTasks = useTasksStore((s) => s.subscribe);
  const schedules = useScheduleStore((s) => s.schedules);
  const subscribeSchedules = useScheduleStore((s) => s.subscribe);
  const [collabSessions, setCollabSessions] = useState<CollabSession[]>([]);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const teamId = currentTeam?.id;
  const myMember = members.find((m) => m.userId === currentUser?.uid);
  const isSoloTeam = members.length <= 1;

  /* データ購読 */
  useEffect(() => {
    if (!teamId) return;
    const u1 = subscribeTasks(teamId);
    const u2 = subscribeSchedules(teamId);
    const u3 = subscribeCollabSessions(teamId, setCollabSessions);
    return () => {
      u1?.();
      u2?.();
      u3?.();
    };
  }, [teamId, subscribeTasks, subscribeSchedules]);

  /* 統計算出 */
  const now = new Date();
  const thisMonthSchedules = schedules.filter(
    (s) => s.startAt.getMonth() === now.getMonth() && s.startAt.getFullYear() === now.getFullYear()
  );
  const pendingCollabs = collabSessions.filter((s) => s.status === 'open');
  const doneCol = columns.find((c) => c.role === 'done');
  const doneTasks = tasks.filter((t) => doneCol && t.columnId === doneCol.id);
  const taskCompletionRate =
    tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0;

  /* チーム作成ハンドラ */
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createTeam({ name: teamName.trim() });
      trackEvent('team_create');
      setShowCreateTeam(false);
      setTeamName('');
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code: unknown }).code)
          : 'unknown';
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : '';

      if (code === 'functions/not-found' && message.includes('ユーザー')) {
        setCreateError('ユーザー初期化データが見つかりません（functions/not-found）');
      } else if (code === 'functions/not-found') {
        setCreateError('createTeam 関数が見つかりません（functions/not-found）');
      } else if (code === 'functions/unauthenticated') {
        setCreateError('ログイン状態が関数に渡っていません（functions/unauthenticated）');
      } else if (code === 'functions/internal' && message.includes('Cloud Functions API')) {
        setCreateError(
          'Cloud Functions API が Firebase プロジェクトで無効です（functions/internal）'
        );
      } else if (code === 'functions/internal') {
        setCreateError('Cloud Functions 側で内部エラーが発生しました（functions/internal）');
      } else {
        setCreateError(`チームの作成に失敗しました（${code}）`);
      }

      console.error('createTeam failed:', err);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-canvas">
        <Spinner size="lg" />
      </div>
    );
  }

  /* ── ソロ（チーム未所属）オンボーディング ─────────────── */
  if (isSoloTeam) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar title="ダッシュボード" />
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-7 max-w-lg">
          <Card>
            <h3 className="text-sm font-semibold text-text mb-1">チームに参加または作成する</h3>
            <p className="text-[12px] text-text-muted mb-5">
              チームメンバーとスケジュールを共有できます
            </p>
            <div className="mb-5">
              <p className="text-[11px] font-medium text-text-muted mb-2 uppercase tracking-wide">
                チームコードで参加
              </p>
              <TeamJoinForm />
            </div>
            <div className="border-t border-border pt-4">
              <p className="text-[11px] font-medium text-text-muted mb-2 uppercase tracking-wide">
                新しいチームを作成
              </p>
              <Button variant="secondary" size="sm" onClick={() => setShowCreateTeam(true)}>
                チームを作成する
              </Button>
            </div>
          </Card>

          <Modal
            open={showCreateTeam}
            onClose={() => setShowCreateTeam(false)}
            title="チームを作成する"
            footer={
              <>
                <Button variant="secondary" onClick={() => setShowCreateTeam(false)}>
                  キャンセル
                </Button>
                <Button loading={creating} onClick={handleCreateTeam}>
                  作成する
                </Button>
              </>
            }
          >
            <form onSubmit={handleCreateTeam}>
              <Input
                label="チーム名"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="例: 配信チーム"
                maxLength={50}
                error={createError ?? undefined}
              />
            </form>
          </Modal>
        </div>
      </div>
    );
  }

  /* ── 通常ダッシュボード ─────────────────────────────────── */
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="ダッシュボード" />
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-7">
        {/* 利用規約・プライバシーポリシー改定の告知（閉じると改定日単位で非表示） */}
        <div className="mb-4">
          <LegalUpdateNotice />
        </div>
        {/* ── 統計カード（5枚グリッド） ──────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          <StatCard label="今月の配信数" value={thisMonthSchedules.length} color="purple" />
          <StatCard label="完了タスク数" value={doneTasks.length} color="amber" />
          <StatCard label="今月のタスク数" value={tasks.length} color="green" />
          <StatCard label="コラボ調整中" value={pendingCollabs.length} color="live" />
          <StatCard
            label="タスク完了率"
            value={`${taskCompletionRate}%`}
            color="green"
            sub={`${doneTasks.length}/${tasks.length}件`}
          />
        </div>

        {/* ── 2カラムレイアウト ───────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-4">
          {/* ── 左カラム: タスクカードグリッド ─────────────── */}
          <Card noPadding>
            <CardHeader
              title="タスクボード"
              action={
                <Link href="/tasks" className="text-brand-2 hover:text-primary transition-colors">
                  すべて見る →
                </Link>
              }
            />
            <div className="px-[18px] py-[14px]">
              <TaskBoardPreview tasks={tasks} columns={columns} members={members} />
            </div>
          </Card>

          {/* ── 右カラム ─────────────────────────────────────── */}
          <div className="space-y-4">
            {/* コラボ打診リンク */}
            <Card noPadding>
              <CardHeader
                title="コラボ打診"
                action={
                  <Link
                    href="/collabs"
                    className="text-brand-2 hover:text-primary transition-colors"
                  >
                    すべて見る →
                  </Link>
                }
              />
              <div className="px-[18px] py-[14px]">
                {pendingCollabs.length === 0 ? (
                  <p className="text-[12px] text-text-muted py-2 text-center">打診はありません</p>
                ) : (
                  <p className="text-[12px] text-text">
                    {pendingCollabs.length}件の打診が回答待ちです
                  </p>
                )}
              </div>
            </Card>

            {/* チームメンバー */}
            <Card noPadding>
              <CardHeader
                title="チームメンバー"
                action={
                  <Link href="/team" className="text-brand-2 hover:text-primary transition-colors">
                    管理 →
                  </Link>
                }
              />
              <div className="px-[18px] py-[14px]">
                <ul className="space-y-2">
                  {members.slice(0, 5).map((m) => (
                    <li key={m.userId} className="flex items-center gap-2.5">
                      <Avatar
                        initials={m.displayName.slice(0, 2)}
                        src={m.avatarUrl}
                        bgClass="bg-primary/10"
                        textClass="text-brand-2"
                        size="sm"
                      />
                      <span className="text-[12px] text-text truncate flex-1">{m.displayName}</span>
                      <Badge variant={ROLE_BADGE[m.role]}>{ROLE_LABELS[m.role]}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </div>
        </div>

        {/* LIGHTプラン向け自社告知枠（実プランから判定。試用モード中・PARTYは非表示） */}
        {!isPartyPlan(myMember?.plan) && (
          <div className="mt-4 md:hidden">
            <BannerAd plan={myMember?.plan ?? 'light'} />
          </div>
        )}
      </div>
    </div>
  );
}
