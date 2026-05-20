'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuthStore } from '@/stores/auth';
import { useTasksStore } from '@/stores/tasks';
import { useTaskCategoryStore } from '@/stores/taskCategories';
import { deleteTask } from '@/lib/repositories/tasks';
import { exportTasksCsv } from '@/lib/utils/exportTasksCsv';
import { TaskDetailModal } from '@/components/kanban/TaskDetailModal';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { TopBar } from '@/components/layout/TopBar';
import type { Task } from '@/types/entities';
import { LIGHT_PLAN_LIMITS } from '@/types/entities';

const KanbanBoard = dynamic(() => import('@/components/kanban/KanbanBoard'), {
  loading: () => (
    <div className="flex justify-center py-16">
      <Spinner size="lg" />
    </div>
  ),
  ssr: false,
});
const TaskForm = dynamic(() => import('@/components/kanban/TaskForm'));

export default function TasksPage() {
  const { currentUser, currentTeam, members } = useAuthStore();
  const { tasks, columns, loading, subscribe } = useTasksStore();
  const { taskCategories, subscribe: subscribeCategories } = useTaskCategoryStore();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const teamId = currentTeam?.id;
  const myMember = members.find((m) => m.userId === currentUser?.uid);
  const canEdit = myMember?.role === 'operator' || myMember?.role === 'member';

  const myTaskCount = tasks.filter((t) => t.createdBy === currentUser?.uid).length;
  const isLightPlanFull =
    myMember?.plan === 'light' && myTaskCount >= LIGHT_PLAN_LIMITS.monthlyTasks;

  useEffect(() => {
    if (!teamId) return;
    const unsub1 = subscribe(teamId);
    const unsub2 = subscribeCategories(teamId);
    return () => {
      unsub1();
      unsub2();
    };
  }, [teamId, subscribe, subscribeCategories]);

  async function handleDeleteCard(taskId: string) {
    if (!teamId || !confirm('このタスクを削除しますか？')) return;
    await deleteTask(teamId, taskId);
  }

  const filteredTasks =
    activeFilter === 'all' ? tasks : tasks.filter((t) => t.categoryId === activeFilter);

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
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* ── トップバー ─────────────────────────────────────── */}
      <TopBar title="タスク管理">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => exportTasksCsv(tasks, columns, members, taskCategories)}
        >
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
      </TopBar>

      {/* ── カテゴリフィルタタブ ─────────────────────────── */}
      <div className="flex gap-2 px-4 py-3 md:px-7 overflow-x-auto scrollbar-none shrink-0">
        <button
          onClick={() => setActiveFilter('all')}
          className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
            activeFilter === 'all'
              ? 'bg-purple-d text-purple-l'
              : 'bg-surface border border-border text-muted hover:text-text'
          }`}
        >
          すべて
        </button>
        {taskCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveFilter(cat.id)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              activeFilter === cat.id
                ? 'bg-purple-d text-purple-l'
                : 'bg-surface border border-border text-muted hover:text-text'
            }`}
          >
            {cat.name}
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
            tasks={filteredTasks}
            onEditTask={setSelectedTask}
            onDeleteTask={handleDeleteCard}
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

      {/* タスク詳細モーダル */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          teamId={teamId}
          canEdit={canEdit}
          columns={columns}
          members={members}
          categories={taskCategories}
          onClose={() => setSelectedTask(null)}
          onDeleted={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
