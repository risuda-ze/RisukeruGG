'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import type { Task, KanbanColumn, TeamMember, TaskCategory } from '@/types/entities';

interface TaskBoardPreviewProps {
  tasks: Task[];
  columns: KanbanColumn[];
  members: TeamMember[];
}

/* カテゴリ表示名 */
const CATEGORY_LABELS: Record<TaskCategory, string> = {
  shooting: '撮影',
  editing: '編集',
  thumbnail: 'サムネ',
  announcement: '告知',
  other: 'その他',
};

const CATEGORY_VARIANTS: Record<TaskCategory, 'purple' | 'amber' | 'green' | 'live' | 'muted'> = {
  shooting: 'purple',
  editing: 'amber',
  thumbnail: 'green',
  announcement: 'live',
  other: 'muted',
};

export function TaskBoardPreview({ tasks, columns, members }: TaskBoardPreviewProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  if (tasks.length === 0) {
    return <p className="text-[12px] text-muted py-4 text-center">タスクはありません</p>;
  }

  const getAssignee = (assigneeId: string | null) =>
    members.find((m) => m.userId === assigneeId) ?? null;

  const getColumnName = (columnId: string) => columns.find((c) => c.id === columnId)?.name ?? '—';

  const selectedAssignee = selectedTask ? getAssignee(selectedTask.assigneeId) : null;

  return (
    <>
      {/* タスクカードグリッド */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map((task) => {
          const assignee = getAssignee(task.assigneeId);
          return (
            <button
              key={task.id}
              onClick={() => setSelectedTask(task)}
              className="text-left bg-card border border-border rounded-[10px] p-4 hover:border-purple/50 hover:bg-purple/5 transition-colors"
            >
              {/* タスク名 */}
              <p className="text-sm font-semibold text-text mb-2 line-clamp-2">{task.title}</p>

              {/* カテゴリバッジ */}
              <Badge variant={CATEGORY_VARIANTS[task.category]}>
                {CATEGORY_LABELS[task.category]}
              </Badge>

              {/* 期限 */}
              {task.dueDate && (
                <p className="text-[11px] text-muted mt-2">
                  {format(task.dueDate, 'M月d日（E）', { locale: ja })}
                </p>
              )}

              {/* 担当者 */}
              {assignee && (
                <div className="flex items-center gap-1.5 mt-3">
                  <Avatar
                    initials={assignee.displayName.slice(0, 2)}
                    bgClass="bg-purple-d/30"
                    textClass="text-purple-l"
                    size="sm"
                  />
                  <span className="text-[11px] text-muted truncate">{assignee.displayName}</span>
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
          <Link href="/tasks" className="text-sm text-purple-l hover:text-purple transition-colors">
            タスク管理で編集 →
          </Link>
        }
      >
        {selectedTask && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-muted w-20">カテゴリ</span>
              <Badge variant={CATEGORY_VARIANTS[selectedTask.category]}>
                {CATEGORY_LABELS[selectedTask.category]}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-muted w-20">進捗</span>
              <span className="text-[12px] text-text">{getColumnName(selectedTask.columnId)}</span>
            </div>
            {selectedTask.dueDate && (
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-muted w-20">期限</span>
                <span className="text-[12px] text-text">
                  {format(selectedTask.dueDate, 'yyyy年M月d日（E）', { locale: ja })}
                </span>
              </div>
            )}
            {selectedAssignee && (
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-muted w-20">担当者</span>
                <div className="flex items-center gap-1.5">
                  <Avatar
                    initials={selectedAssignee.displayName.slice(0, 2)}
                    bgClass="bg-purple-d/30"
                    textClass="text-purple-l"
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
