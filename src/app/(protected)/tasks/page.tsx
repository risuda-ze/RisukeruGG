'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuthStore } from '@/stores/auth';
import { useTasksStore } from '@/stores/tasks';
import { useCategoryStore } from '@/stores/categories';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { deleteTask } from '@/lib/repositories/tasks';
import { TaskDetailModal } from '@/components/kanban/TaskDetailModal';
import { TaskControlBar } from '@/components/kanban/TaskControlBar';
import { Spinner } from '@/components/ui/Spinner';
import { TopBar } from '@/components/layout/TopBar';
import type { Task } from '@/types/entities';
import { LIGHT_PLAN_LIMITS } from '@/types/entities';
import { isPartyPlan } from '@/lib/plan';

const KanbanBoard = dynamic(() => import('@/components/kanban/KanbanBoard'), {
  loading: () => <div className="flex justify-center py-16"><Spinner size="lg" /></div>,
  ssr: false,
});
const TaskMobileBoard = dynamic(() => import('@/components/kanban/TaskMobileBoard'), { ssr: false });

export default function TasksPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const currentTeam = useAuthStore((s) => s.currentTeam);
  const members = useAuthStore((s) => s.members);
  const tasks = useTasksStore((s) => s.tasks);
  const columns = useTasksStore((s) => s.columns);
  const loading = useTasksStore((s) => s.loading);
  const subscribe = useTasksStore((s) => s.subscribe);
  const categories = useCategoryStore((s) => s.categories);
  const subscribeCategories = useCategoryStore((s) => s.subscribe);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [defaultColumnId, setDefaultColumnId] = useState<string | undefined>(undefined);

  /* v3: カテゴリ複数選択（空配列 = すべて表示）+ 担当者単一選択（null = すべて表示） */
  const [activeCategoryIds, setActiveCategoryIds] = useState<string[]>([]);
  const [activeAssigneeId, setActiveAssigneeId] = useState<string | null>(null);

  /* md ブレークポイント(768px)未満をモバイル判定。CSSで両ボードを隠す代わりに、
     片方だけをマウントして不要な描画コストを避ける */
  const isMobile = useMediaQuery(767);

  /* ヒントバー: localStorage で非表示状態を永続化 */
  const [hintDismissed, setHintDismissed] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHintDismissed(localStorage.getItem('rgg_task_hint_hidden') === '1');
  }, []);

  function dismissHint() {
    localStorage.setItem('rgg_task_hint_hidden', '1');
    setHintDismissed(true);
  }
  function showHint() {
    localStorage.removeItem('rgg_task_hint_hidden');
    setHintDismissed(false);
  }

  const teamId = currentTeam?.id;
  const myMember = members.find((m) => m.userId === currentUser?.uid);
  const canEdit = myMember?.role === 'operator' || myMember?.role === 'member';

  const myTaskCount = tasks.filter((t) => t.createdBy === currentUser?.uid).length;
  const isLightPlanFull =
    !isPartyPlan(myMember?.plan) && myTaskCount >= LIGHT_PLAN_LIMITS.monthlyTasks;

  useEffect(() => {
    if (!teamId) return;
    const unsub1 = subscribe(teamId);
    const unsub2 = subscribeCategories(teamId);
    return () => { unsub1(); unsub2(); };
  }, [teamId, subscribe, subscribeCategories]);

  function openAdd(columnId?: string) {
    setSelectedTask(null);
    setDefaultColumnId(columnId);
    setIsModalOpen(true);
  }
  /* memo化した TaskCard に安定参照を渡すため useCallback で固定 */
  const openEdit = useCallback((task: Task) => {
    setSelectedTask(task);
    setDefaultColumnId(undefined);
    setIsModalOpen(true);
  }, []);
  function closeModal() {
    setIsModalOpen(false);
    setSelectedTask(null);
  }

  const handleDeleteCard = useCallback(
    async (taskId: string) => {
      if (!teamId || !confirm('このタスクを削除しますか？')) return;
      await deleteTask(teamId, taskId);
    },
    [teamId]
  );

  /* カテゴリトグル: 選択済みなら解除、未選択なら追加 */
  function toggleCategory(catId: string) {
    setActiveCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  }

  /* 「すべて」クリック: カテゴリフィルタを全解除 */
  function clearCategories() {
    setActiveCategoryIds([]);
  }

  /* 担当者フィルタ変更 */
  function changeAssignee(id: string | null) {
    setActiveAssigneeId(id);
  }

  /* フィルタロジック: カテゴリ OR条件 × 担当者 AND条件
     tasks / フィルタ条件が変わらない限り再計算しない */
  const filteredTasks = useMemo(
    () =>
      tasks.filter((t) => {
        const catMatch =
          activeCategoryIds.length === 0 ||
          activeCategoryIds.includes(t.categoryId ?? '');
        const assigneeMatch =
          activeAssigneeId === null || t.assigneeId === activeAssigneeId;
        return catMatch && assigneeMatch;
      }),
    [tasks, activeCategoryIds, activeAssigneeId]
  );

  if (loading) {
    return <div className="flex flex-1 items-center justify-center bg-bg"><Spinner size="lg" /></div>;
  }
  if (!teamId) {
    return <div className="flex flex-1 items-center justify-center text-text-muted text-sm px-4">チームに参加してからタスク管理を利用できます</div>;
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* トップバー: v3 で children 空に（操作ボタンは TaskControlBar に移動） */}
      <TopBar title="タスク管理" subtitle="タスクの管理・進捗確認ができます" />

      {/* TaskControlBar: カテゴリ複数選択・担当者フィルタ・タスク追加・設定・ヒント */}
      <TaskControlBar
        categories={categories}
        members={members}
        activeCategoryIds={activeCategoryIds}
        activeAssigneeId={activeAssigneeId}
        taskCount={filteredTasks.length}
        onCategoryToggle={toggleCategory}
        onClearCategories={clearCategories}
        onAssigneeChange={changeAssignee}
        onShowHint={showHint}
      />

      {/* ライトプラン警告 */}
      {isLightPlanFull && (
        <div className="mx-4 md:mx-7 mb-2 px-3 py-2 rounded-[8px] text-[12px] bg-amber-d/10 border border-amber/30 text-amber shrink-0">
          タスク作成上限に達しました（月5件）。PARTYプランにアップグレードしてください。
        </div>
      )}

      {/* ── PC: カンバンボード / モバイル: ステータスピル+リスト ── */}
      {columns.length === 0 ? (
        <div className="text-center text-text-muted text-sm py-16">
          <p>カンバンカラムがありません</p>
          <p className="mt-1 text-[11px]">設定ページからカラムを追加してください</p>
        </div>
      ) : (
        isMobile ? (
          /* モバイルレイアウト（md 未満）: モバイルボードのみマウント */
          <div className="flex flex-1 flex-col overflow-hidden pt-2 min-h-0">
            <TaskMobileBoard
              tasks={filteredTasks}
              members={members}
              categories={categories}
              canEdit={canEdit}
              onEdit={openEdit}
              onDelete={handleDeleteCard}
              onAdd={openAdd}
            />
          </div>
        ) : (
          /* PC カンバン（md 以上）: カンバンボードのみマウント */
          <div className="flex flex-1 overflow-hidden px-7 py-2 min-h-0">
            <KanbanBoard
              teamId={teamId}
              members={members}
              canEdit={canEdit}
              tasks={filteredTasks}
              showHint={!hintDismissed}
              onDismissHint={dismissHint}
              onEditTask={openEdit}
              onDeleteTask={handleDeleteCard}
              onAddTask={openAdd}
            />
          </div>
        )
      )}

      {/* タスク追加・編集モーダル */}
      {isModalOpen && (
        <TaskDetailModal
          task={selectedTask}
          defaultColumnId={defaultColumnId}
          teamId={teamId}
          canEdit={canEdit}
          columns={columns}
          members={members}
          categories={categories}
          onClose={closeModal}
          onDeleted={closeModal}
        />
      )}
    </div>
  );
}
