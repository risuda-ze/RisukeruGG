'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format, isToday } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAuthStore } from '@/stores/auth';
import { useTasksStore } from '@/stores/tasks';
import { useScheduleStore } from '@/stores/schedule';
import { useNotificationsStore } from '@/stores/notifications';
import { subscribeCollabSessions } from '@/lib/repositories/collabs';
import { createTeam } from '@/lib/repositories/teams';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { TodayTimeline } from '@/components/dashboard/TodayTimeline';
import { CollabRequests } from '@/components/dashboard/CollabRequests';
import { BannerAd } from '@/components/plan/BannerAd';
import { TeamJoinForm } from '@/components/team/TeamJoinForm';
import type { CollabSession } from '@/types/entities';

const ROLE_BADGE: Record<string, 'purple' | 'amber' | 'muted'> = {
  owner:  'purple',
  editor: 'amber',
  viewer: 'muted',
};

export default function DashboardPage() {
  const { currentUser, currentTeam, members, loading } = useAuthStore();
  const { tasks, columns, subscribe: subscribeTasks } = useTasksStore();
  const { schedules, subscribe: subscribeSchedules } = useScheduleStore();
  const { notifications } = useNotificationsStore();
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
    return () => { u1?.(); u2?.(); u3?.(); };
  }, [teamId, subscribeTasks, subscribeSchedules]);

  /* 統計算出 */
  const thisMonthSchedules = schedules.filter((s) => {
    const now = new Date();
    return s.startAt.getMonth() === now.getMonth() && s.startAt.getFullYear() === now.getFullYear();
  });
  const liveSchedule = schedules.find((s) => s.status === 'live');
  const pendingCollabs = collabSessions.filter((s) => s.status === 'open');
  const doneTasks = tasks.filter((t) => {
    const doneCol = columns.find((c) => c.name === '完了' || c.name === 'Done');
    return doneCol && t.columnId === doneCol.id;
  });
  const taskCompletionRate = tasks.length > 0
    ? Math.round((doneTasks.length / tasks.length) * 100)
    : 0;

  /* 今日のタイムラインデータ */
  const todaySchedules = schedules.filter((s) => isToday(s.startAt));
  const timelineItems = todaySchedules.map((s) => ({
    time: format(s.startAt, 'HH:mm'),
    title: s.title,
    tags: s.status === 'live'
      ? [{ label: 'LIVE', bgColor: 'rgba(255,77,109,.15)', textColor: 'var(--live)' }]
      : [],
    barColor: s.status === 'live' ? 'var(--live)' : 'var(--purple)',
    meta: undefined,
  }));

  /* コラボリクエストデータ */
  const collabItems = pendingCollabs.slice(0, 3).map((s) => ({
    id: s.id,
    name: s.partnerName,
    initials: s.partnerName.slice(0, 2).toUpperCase(),
    detail: s.title,
    status: 'pending' as const,
    onOk: undefined,
    onNg: undefined,
  }));

  /* チーム作成ハンドラ */
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createTeam({ name: teamName.trim() });
      setShowCreateTeam(false);
      setTeamName('');
    } catch {
      setCreateError('チームの作成に失敗しました');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-bg">
        <Spinner size="lg" />
      </div>
    );
  }

  /* ── ソロ（チーム未所属）オンボーディング ─────────────── */
  if (isSoloTeam) {
    return (
      <div className="px-4 py-6 md:px-7 max-w-lg">
        <h2 className="text-base font-semibold text-text mb-5">ダッシュボード</h2>
        <Card>
          <h3 className="text-sm font-semibold text-text mb-1">チームに参加または作成する</h3>
          <p className="text-[12px] text-muted mb-5">チームメンバーとスケジュールを共有できます</p>
          <div className="mb-5">
            <p className="text-[11px] font-medium text-muted mb-2 uppercase tracking-wide">チームコードで参加</p>
            <TeamJoinForm />
          </div>
          <div className="border-t border-border pt-4">
            <p className="text-[11px] font-medium text-muted mb-2 uppercase tracking-wide">新しいチームを作成</p>
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
              <Button variant="secondary" onClick={() => setShowCreateTeam(false)}>キャンセル</Button>
              <Button loading={creating} onClick={handleCreateTeam}>作成する</Button>
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
    );
  }

  /* ── 通常ダッシュボード ─────────────────────────────────── */
  return (
    <div className="px-4 py-6 md:px-7">

      {/* ── 統計カード（4枚グリッド） ──────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard
          label="今月の配信数"
          value={thisMonthSchedules.length}
          color="purple"
          sub={liveSchedule ? '🔴 LIVE中' : undefined}
        />
        <StatCard
          label="コラボ打診中"
          value={pendingCollabs.length}
          color="amber"
        />
        <StatCard
          label="LIVE視聴者"
          value={liveSchedule ? '—' : '—'}
          color="live"
          sub="配信中のみ取得"
        />
        <StatCard
          label="タスク完了率"
          value={`${taskCompletionRate}%`}
          color="green"
          sub={`${doneTasks.length}/${tasks.length}件`}
        />
      </div>

      {/* ── 2カラムレイアウト ───────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-4">

        {/* ── 左カラム ─────────────────────────────────────── */}
        <div className="space-y-4">

          {/* 今週のスケジュール */}
          <Card noPadding>
            <CardHeader
              title="今日のスケジュール"
              action={<Link href="/schedule" className="text-purple-l hover:text-purple transition-colors">すべて見る →</Link>}
            />
            <div className="px-[18px] py-[14px]">
              <TodayTimeline items={timelineItems} />
            </div>
          </Card>

          {/* タスクプレビュー */}
          <Card noPadding>
            <CardHeader
              title="タスクボード"
              action={<Link href="/tasks" className="text-purple-l hover:text-purple transition-colors">すべて見る →</Link>}
            />
            <div className="px-[18px] py-[14px]">
              {tasks.length === 0 ? (
                <p className="text-[12px] text-muted py-2 text-center">タスクはありません</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {columns.slice(0, 3).map((col) => {
                    const colTasks = tasks.filter((t) => t.columnId === col.id).slice(0, 2);
                    return (
                      <div key={col.id}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                          <span className="text-[11px] font-semibold text-muted">{col.name}</span>
                        </div>
                        <div className="space-y-1.5">
                          {colTasks.map((t) => (
                            <div key={t.id} className="bg-surface border border-border rounded-[6px] px-2.5 py-1.5">
                              <p className="text-[12px] text-text truncate">{t.title}</p>
                            </div>
                          ))}
                          {colTasks.length === 0 && (
                            <p className="text-[11px] text-muted">なし</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ── 右カラム ─────────────────────────────────────── */}
        <div className="space-y-4">

          {/* コラボ打診 */}
          <Card noPadding>
            <CardHeader
              title="コラボ打診"
              action={<Link href="/collabs" className="text-purple-l hover:text-purple transition-colors">すべて見る →</Link>}
            />
            <div className="px-[18px] py-[14px]">
              <CollabRequests items={collabItems} />
            </div>
          </Card>

          {/* 通知 */}
          <Card noPadding>
            <CardHeader
              title="通知"
              action={<a href="/notifications" className="text-purple-l hover:text-purple transition-colors">すべて見る →</a>}
            />
            <div className="px-[18px] py-[14px]">
              {notifications.length === 0 ? (
                <p className="text-[12px] text-muted py-2 text-center">通知はありません</p>
              ) : (
                <ul className="space-y-2">
                  {notifications.slice(0, 4).map((n) => (
                    <li key={n.id} className={`flex items-start gap-2.5 ${!n.isRead ? 'bg-purple/5 rounded-[6px] px-2 py-1.5' : 'px-1 py-1'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-purple mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-text leading-snug">{n.body}</p>
                        <p className="text-[10px] text-muted font-num mt-0.5">
                          {format(n.createdAt, 'M/d HH:mm', { locale: ja })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          {/* チームメンバー */}
          <Card noPadding>
            <CardHeader
              title="チームメンバー"
              action={<a href="/team" className="text-purple-l hover:text-purple transition-colors">管理 →</a>}
            />
            <div className="px-[18px] py-[14px]">
              <ul className="space-y-2">
                {members.slice(0, 5).map((m) => (
                  <li key={m.userId} className="flex items-center gap-2.5">
                    <Avatar
                      initials={m.displayName.slice(0, 2)}
                      bgClass="bg-purple-d/30"
                      textClass="text-purple-l"
                      size="sm"
                    />
                    <span className="text-[12px] text-text truncate flex-1">{m.displayName}</span>
                    <Badge variant={ROLE_BADGE[m.role] ?? 'muted'}>{m.role}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>
      </div>

      {/* LIGHTプラン向けバナー広告 */}
      {myMember?.plan === 'light' && (
        <div className="mt-4 md:hidden">
          <BannerAd plan="light" />
        </div>
      )}
    </div>
  );
}
