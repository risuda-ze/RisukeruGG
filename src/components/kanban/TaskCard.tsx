'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { Task, TeamMember, KanbanColumn } from '@/types/entities';
import { useTasksStore } from '@/stores/tasks';
import { updateTask } from '@/lib/repositories/tasks';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';

const CATEGORY_LABELS: Record<Task['category'], string> = {
  shooting:     '撮影',
  editing:      '編集',
  thumbnail:    'サムネ',
  announcement: '告知',
  other:        'その他',
};

/* カテゴリ別バッジバリアント */
type BadgeVariant = 'purple' | 'amber' | 'live' | 'green' | 'muted' | 'default';
const CATEGORY_BADGE: Record<Task['category'], BadgeVariant> = {
  shooting:     'purple',
  editing:      'amber',
  thumbnail:    'green',
  announcement: 'live',
  other:        'muted',
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
  const assigneeName = assignee?.displayName ?? (task.assigneeId ? '元メンバー' : null);
  const assigneeInitials = assigneeName ? assigneeName.slice(0, 2) : '';

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
      className={`bg-surface border rounded-[8px] p-3 flex flex-col gap-2 select-none transition-colors ${
        isDragging
          ? 'border-purple shadow-md rotate-1'
          : 'border-border hover:border-purple'
      }`}
    >
      {/* タスクタイトル + アクションボタン */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-text break-words flex-1 leading-snug">
          {task.title}
        </span>
        {canEdit && (
          <div className="flex gap-0.5 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="px-1.5 py-1 text-muted hover:text-purple-l"
              aria-label="タスクを編集"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.013 2.513a1.75 1.75 0 0 1 2.475 2.474L6.226 12.25a2.751 2.751 0 0 1-.892.566l-2.35.864a.75.75 0 0 1-.96-.96l.864-2.35a2.75 2.75 0 0 1 .566-.892l7.56-7.559Z" />
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="px-1.5 py-1 text-muted hover:text-live"
              aria-label="タスクを削除"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2 4h12M5 4V2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5V4m2 0-1 9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1L3 4" />
              </svg>
            </Button>
          </div>
        )}
      </div>

      {/* メタ情報（カテゴリ・担当者・期限） */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <Badge variant={CATEGORY_BADGE[task.category]}>
          {CATEGORY_LABELS[task.category]}
        </Badge>
        {assigneeName && (
          <div className="flex items-center gap-1">
            <Avatar initials={assigneeInitials} size="sm" />
            <span className="text-[10px] text-muted font-num truncate max-w-[80px]">{assigneeName}</span>
          </div>
        )}
        {task.dueDate && (
          <span className="text-[10px] text-muted font-num">
            {format(task.dueDate, 'M/d', { locale: ja })}
          </span>
        )}
      </div>

      {/* モバイル向けカラム変更セレクト */}
      {canEdit && (
        <div className="sm:hidden">
          <select
            value={task.columnId}
            onChange={handleColumnChange}
            disabled={movingColumn}
            className="text-xs border border-border rounded-[6px] px-2 py-1 w-full bg-card text-text"
            aria-label="カラムを変更"
          >
            {columns.map((col: KanbanColumn) => (
              <option key={col.id} value={col.id}>{col.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
