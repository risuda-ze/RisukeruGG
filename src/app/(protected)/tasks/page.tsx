'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuthStore } from '@/stores/auth';
import { useTasksStore } from '@/stores/tasks';
import { deleteTask } from '@/lib/repositories/tasks';
import { exportTasksCsv } from '@/lib/utils/exportTasksCsv';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { Task } from '@/types/entities';
import { LIGHT_PLAN_LIMITS } from '@/types/entities';

const KanbanBoard = dynamic(() => import('@/components/kanban/KanbanBoard'), {
  loading: () => <div className="flex justify-center py-16"><Spinner size="lg" /></div>,
  ssr: false,
});
const TaskForm = dynamic(() => import('@/components/kanban/TaskForm'));

/* カテゴリフィルタ定義 */
const FILTER_TABS = [
  { value: 'all',          label: 'すべて' },
  { value: 'shooting',     label: '撮影' },
  { value: 'editing',      label: '編集' },
  { value: 'thumbnail',    label: 'サムネ' },
  { value: 'announcement', label: '告知' },
] as const;

type FilterValue = typeof FILTER_TABS[number]['value'];

export default function TasksPage() {
  const { currentUser, currentTeam, members } = useAuthStore();
  const { tasks, columns, loading, subscribe } = useTasksStore();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [, setDeletingTaskId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterValue>('all');

  const teamId = currentTeam?.id;
  const myMember = members.find((m) => m.userId === currentUser?.uid);
  const canEdit = myMember?.role === 'owner' || myMember?.role === 'editor';

  const myTaskCount = tasks.filter((t) => t.createdBy === currentUser?.uid).length;
  const isLightPlanFull =
    myMember?.plan === 'light' && myTaskCount >= LIGHT_PLAN_LIMITS.monthlyTasks;

  useEffect(() => {
    if (!teamId) return;
    return subscribe(teamId);
  }, [teamId, subscribe]);

  async function handleDelete(taskId: string) {
    if (!teamId || !confirm('このタスクを削除しますか？')) return;
    setDeletingTaskId(taskId);
    try {
      await deleteTask(teamId, taskId);
    } finally {
      setDeletingTaskId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-bg">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!teamId) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted text-sm px-4">
        チームに参加してからタスク管理を利用できます
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── ページヘッダー ─────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-4 md:px-7 border-b border-border gap-3 flex-wrap">
        <h2 className="text-base font-semibold text-text">タスク管理</h2>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => exportTasksCsv(tasks, columns, members)}>
            CSVエクスポート
          </Button>
          {canEdit && (
            <Button
              variant="amber"
              size="sm"
              onClick={() => setShowCreateForm(true)}
              disabled={isLightPlanFull}
              aria-label="タスクを追加"
            >
              + タスク
            </Button>
          )}
        </div>
      </div>

      {/* ── カテゴリフィルタタブ ─────────────────────────── */}
      <div className="flex gap-2 px-4 py-3 md:px-7 overflow-x-auto scrollbar-none shrink-0">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveFilter(tab.value)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              activeFilter === tab.value
                ? 'bg-purple-d text-purple-l'
                : 'bg-surface border border-border text-muted hover:text-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── カンバンボード ──────────────────────────────────── */}
      <div className="flex-1 overflow-auto px-4 py-2 md:px-7">
        {columns.length === 0 ? (
          <div className="text-center text-muted text-sm py-16">
            <p>カンバンカラムがありません</p>
            <p className="mt-1 text-[11px]">設定ページからカラムを追加してください</p>
          </div>
        ) : (
          <KanbanBoard
            teamId={teamId}
            members={members}
            canEdit={canEdit}
            onEditTask={setEditingTask}
            onDeleteTask={handleDelete}
          />
        )}
      </div>

      {/* タスク作成モーダル */}
      <Modal open={showCreateForm} onClose={() => setShowCreateForm(false)} title="タスクを追加">
        <TaskForm
          teamId={teamId}
          members={members}
          isLightPlanFull={isLightPlanFull}
          onSuccess={() => setShowCreateForm(false)}
          onCancel={() => setShowCreateForm(false)}
        />
      </Modal>

      {/* タスク編集モーダル */}
      {editingTask && (
        <Modal open={true} onClose={() => setEditingTask(null)} title="タスクを編集">
          <TaskForm
            teamId={teamId}
            members={members}
            task={editingTask}
            onSuccess={() => setEditingTask(null)}
            onCancel={() => setEditingTask(null)}
          />
        </Modal>
      )}
    </div>
  );
}
