'use client';

import { memo } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { Task, TeamMember, TaskStatus, Category } from '@/types/entities';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import UrgencyChip from './UrgencyChip';
import { getUrgencyLevel } from '@/lib/urgency';

interface TaskCardProps {
  task: Task;
  members: TeamMember[];
  /* columns / categories は親から受け取る（カード内でストアを購読しない） */
  columns: TaskStatus[];
  categories: Category[];
  isDragging: boolean;
  canEdit: boolean;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

function TaskCardComponent({
  task,
  members,
  columns,
  categories,
  isDragging,
  canEdit,
  onEdit,
  onDelete,
}: TaskCardProps) {
  const assignee = members.find((m) => m.userId === task.assigneeId);
  const assigneeName = assignee?.displayName ?? (task.assigneeId ? '元メンバー' : null);
  const assigneeInitials = assigneeName ? assigneeName.slice(0, 2) : '';

  const category = task.categoryId
    ? categories.find((c) => c.id === task.categoryId)
    : null;

  const column = columns.find((c) => c.id === task.columnId);
  const isDone = column?.role === 'done';
  const urgencyLevel = getUrgencyLevel(task.dueDate, isDone);

  return (
    <div
      data-testid="task-card"
      // 外枠は Card 規格（radius-lg / padding 16px / 左 3px レール）に合わせる。D&D の制約で Card には載せ替えない
      className={`group flex cursor-pointer flex-col gap-[9px] rounded-lg border border-l-[3px] border-border border-l-(--tc) bg-card p-4 animate-[pop-scale_180ms_var(--ease-spring)] transition-colors duration-(--duration-fast) ease-out hover:border-border-strong hover:border-l-(--tc) ${isDone ? 'opacity-[.82]' : ''} ${isDragging ? 'rotate-1 border-border-strong' : ''}`}
      style={{ '--tc': column?.color ?? 'var(--border)' } as React.CSSProperties}
      onClick={() => onEdit(task)}
    >
      {/* カテゴリチップ */}
      {category && (
        <span
          className="inline-flex items-center gap-1 self-start rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide leading-none"
          style={{
            backgroundColor: category.color + '26',
            color: category.color,
            border: `1px solid ${category.color}4d`,
          }}
        >
          {category.icon && (
            <span className="material-icons text-[10px]" aria-hidden="true">
              {category.icon}
            </span>
          )}
          {category.name}
        </span>
      )}

      {/* タイトル + アクションボタン */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-semibold text-text break-words flex-1 leading-snug">
          {task.title}
        </span>
        {canEdit && (
          <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onEdit(task); }}
              className="px-1.5 py-1 text-text-muted hover:text-purple-l"
              aria-label="タスクを編集"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.013 2.513a1.75 1.75 0 0 1 2.475 2.474L6.226 12.25a2.751 2.751 0 0 1-.892.566l-2.35.864a.75.75 0 0 1-.96-.96l.864-2.35a2.75 2.75 0 0 1 .566-.892l7.56-7.559Z" />
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
              className="px-1.5 py-1 text-text-muted hover:text-live"
              aria-label="タスクを削除"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2 4h12M5 4V2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5V4m2 0-1 9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1L3 4" />
              </svg>
            </Button>
          </div>
        )}
      </div>

      {/* フッター: 締め切り日時 → 担当者 → 緊急度チップ（v3: 順序・フォーマット変更） */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* ① 締め切り日時: 終日フラグに応じて M/d または M/d HH:mm */}
        {task.dueDate && (
          <span className="text-[10px] text-text-muted font-num">
            {(task.dueDateAllDay ?? true)
              ? format(task.dueDate, 'M/d', { locale: ja })
              : format(task.dueDate, 'M/d HH:mm', { locale: ja })}
          </span>
        )}
        {/* ② 担当者アバター + 名前 */}
        {assigneeName && (
          <div className="flex items-center gap-1">
            <Avatar initials={assigneeInitials} src={assignee?.avatarUrl} size="sm" />
            <span className="text-[10px] text-text-muted font-num truncate max-w-[70px]">
              {assigneeName}
            </span>
          </div>
        )}
        {/* ③ 緊急度バッジ（末尾に維持） */}
        <UrgencyChip level={urgencyLevel} dueDate={task.dueDate} />
      </div>
    </div>
  );
}

/* memo化: task / members / columns / categories / コールバックが
   変わらないカードは再レンダリングしない */
const TaskCard = memo(TaskCardComponent);
export default TaskCard;
