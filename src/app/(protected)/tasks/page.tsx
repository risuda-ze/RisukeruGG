'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuthStore } from '@/stores/auth';
import { useTasksStore } from '@/stores/tasks';
import { deleteTask } from '@/lib/repositories/tasks';
import { exportTasksCsv } from '@/lib/utils/exportTasksCsv';
import { Spinner } from '@/components/ui/Spinner';

const KanbanBoard = dynamic(() => import('@/components/kanban/KanbanBoard'), {
  loading: () => <div className="flex justify-center py-16"><Spinner size="lg" /></div>,
  ssr: false,
});
const TaskForm = dynamic(() => import('@/components/kanban/TaskForm'));
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { Task } from '@/types/entities';
import { LIGHT_PLAN_LIMITS } from '@/types/entities';

export default function TasksPage() {
  const { currentUser, currentTeam, members } = useAuthStore();
  const { tasks, columns, loading, subscribe } = useTasksStore();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  const teamId = currentTeam?.id;
  const myMember = members.find((m) => m.userId === currentUser?.uid);
  const canEdit = myMember?.role === 'owner' || myMember?.role === 'editor';

  // Monthly task limit check for LIGHT plan
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

  function handleExportCsv() {
    exportTasksCsv(tasks, columns, members);
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!teamId) {
    return (
      <div className="flex flex-1 items-center justify-center text-zinc-500 text-sm">
        チームに参加してからタスク管理を利用できます
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 bg-white">
        <h1 className="text-lg font-semibold text-zinc-900">タスク管理</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExportCsv}>
            CSVエクスポート
          </Button>
          {canEdit && (
            <Button onClick={() => setShowCreateForm(true)} disabled={isLightPlanFull}>
              + タスクを追加
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {columns.length === 0 ? (
          <div className="text-center text-zinc-500 text-sm py-16">
            <p>カンバンカラムがありません</p>
            <p className="mt-1">設定ページからカラムを追加してください</p>
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
      <Modal
        open={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        title="タスクを追加"
      >
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
        <Modal
          open={true}
          onClose={() => setEditingTask(null)}
          title="タスクを編集"
        >
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
