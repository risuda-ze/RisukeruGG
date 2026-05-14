'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { Task, TeamMember, KanbanColumn } from '@/types/entities';
import { useTasksStore } from '@/stores/tasks';
import { updateTask } from '@/lib/repositories/tasks';

const CATEGORY_LABELS: Record<Task['category'], string> = {
  shooting: '撮影',
  editing: '編集',
  thumbnail: 'サムネ',
  announcement: '告知',
  other: 'その他',
};

interface TaskCardProps {
  task: Task;
  teamId: string;
  members: TeamMember[];
  isDragging: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export default function TaskCard({ task, teamId, members, isDragging, canEdit, onEdit, onDelete }: TaskCardProps) {
  const { columns } = useTasksStore();
  const [movingColumn, setMovingColumn] = useState(false);

  const assignee = members.find((m) => m.userId === task.assigneeId);
  const assigneeName = assignee ? assignee.displayName : task.assigneeId ? '元メンバー' : null;

  async function handleColumnChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newColumnId = e.target.value;
    if (newColumnId === task.columnId) return;
    setMovingColumn(true);
    try {
      await updateTask(teamId, task.id, { columnId: newColumnId }, task.updatedAt);
    } finally {
      setMovingColumn(false);
    }
  }

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border p-3 flex flex-col gap-1 select-none ${
        isDragging ? 'shadow-lg rotate-1 border-blue-300' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="text-sm font-medium text-gray-800 break-words flex-1">{task.title}</span>
        {canEdit && (
          <div className="flex gap-1 flex-shrink-0">
            <button
              onClick={onEdit}
              className="text-gray-400 hover:text-blue-500 text-xs p-0.5"
              aria-label="タスクを編集"
            >
              ✏️
            </button>
            <button
              onClick={onDelete}
              className="text-gray-400 hover:text-red-500 text-xs p-0.5"
              aria-label="タスクを削除"
            >
              🗑️
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1 items-center">
        <span className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">
          {CATEGORY_LABELS[task.category]}
        </span>
        {assigneeName && (
          <span className="text-xs text-gray-500 truncate max-w-[100px]" title={assigneeName}>
            👤 {assigneeName}
          </span>
        )}
        {task.dueDate && (
          <span className="text-xs text-gray-500">
            📅 {format(task.dueDate, 'M/d', { locale: ja })}
          </span>
        )}
      </div>

      {/* モバイル向けカラム変更セレクト */}
      {canEdit && (
        <div className="sm:hidden mt-1">
          <select
            value={task.columnId}
            onChange={handleColumnChange}
            disabled={movingColumn}
            className="text-xs border border-gray-200 rounded px-1 py-0.5 w-full bg-white"
            aria-label="カラムを変更"
          >
            {columns.map((col: KanbanColumn) => (
              <option key={col.id} value={col.id}>
                {col.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
