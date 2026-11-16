'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { useCategoryStore } from '@/stores/categories';
import { sortTasksByDueDate } from '@/lib/utils/taskOrdering';
import type { Task, TaskStatus, TeamMember } from '@/types/entities';

interface TaskBoardPreviewProps {
  tasks: Task[];
  columns: TaskStatus[];
  members: TeamMember[];
}

export function TaskBoardPreview({ tasks, columns, members }: TaskBoardPreviewProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const categories = useCategoryStore((s) => s.categories);
  const sortedTasks = sortTasksByDueDate(tasks);

  if (tasks.length === 0) {
    return <p className="text-[12px] text-text-muted py-4 text-center">タスクはありません</p>;
  }

  const getAssignee = (assigneeId: string | null) =>
    members.find((m) => m.userId === assigneeId) ?? null;

  const getColumnName = (columnId: string) => columns.find((c) => c.id === columnId)?.name ?? '—';

  const getCategory = (categoryId: string | null) =>
    categoryId ? (categories.find((c) => c.id === categoryId) ?? null) : null;

  const selectedAssignee = selectedTask ? getAssignee(selectedTask.assigneeId) : null;
  const selectedCategory = selectedTask ? getCategory(selectedTask.categoryId) : null;

  return (
    <>
      {/* タスクカードグリッド */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedTasks.map((task) => {
          const assignee = getAssignee(task.assigneeId);
          const category = getCategory(task.categoryId);
          return (
            <button
              key={task.id}
              onClick={() => setSelectedTask(task)}
              className="text-left bg-card border border-border rounded-[10px] p-4 hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              {/* タスク名 */}
              <p className="text-sm font-semibold text-text mb-2 line-clamp-2">{task.title}</p>

              {/* カテゴリバッジ */}
              {category && (
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide"
                  style={{ backgroundColor: category.color + '33', color: category.color }}
                >
                  {category.name}
                </span>
              )}

              {/* 期限 */}
              {task.dueDate && (
                <p className="text-[11px] text-text-muted mt-2">
                  {format(task.dueDate, 'M月d日（E）', { locale: ja })}
                </p>
              )}

              {/* 担当者 */}
              {assignee && (
                <div className="flex items-center gap-1.5 mt-3">
                  <Avatar
                    initials={assignee.displayName.slice(0, 2)}
                    src={assignee.avatarUrl}
                    bgClass="bg-primary/10"
                    textClass="text-brand-2"
                    size="sm"
                  />
                  <span className="text-[11px] text-text-muted truncate">{assignee.displayName}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* タスク詳細モーダル */}
      <Modal
        open={selectedTask !== null}
        onClose={() => setSelectedTask(null)}
        title={selectedTask?.title ?? ''}
        size="md"
        footer={
          <Link href="/tasks" className="text-sm text-brand-2 hover:text-primary transition-colors">
            タスク管理で編集 →
          </Link>
        }
      >
        {selectedTask && (
          <div className="space-y-3">
            {selectedCategory && (
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-text-muted w-20">カテゴリ</span>
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide"
                  style={{
                    backgroundColor: selectedCategory.color + '33',
                    color: selectedCategory.color,
                  }}
                >
                  {selectedCategory.name}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-text-muted w-20">進捗</span>
              <span className="text-[12px] text-text">{getColumnName(selectedTask.columnId)}</span>
            </div>
            {selectedTask.dueDate && (
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-text-muted w-20">期限</span>
                <span className="text-[12px] text-text">
                  {format(selectedTask.dueDate, 'yyyy年M月d日（E）', { locale: ja })}
                </span>
              </div>
            )}
            {selectedAssignee && (
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-text-muted w-20">担当者</span>
                <div className="flex items-center gap-1.5">
                  <Avatar
                    initials={selectedAssignee.displayName.slice(0, 2)}
                    bgClass="bg-primary/10"
                    textClass="text-brand-2"
                    size="sm"
                  />
                  <span className="text-[12px] text-text">{selectedAssignee.displayName}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
