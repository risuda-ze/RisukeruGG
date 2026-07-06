'use client';

import { useMemo, useState } from 'react';
import { useTasksStore } from '@/stores/tasks';
import { sortTasksByDueDate } from '@/lib/utils/taskOrdering';
import type { Task, TeamMember, Category } from '@/types/entities';
import TaskCard from './TaskCard';

interface TaskMobileBoardProps {
  tasks: Task[];
  members: TeamMember[];
  categories: Category[];
  canEdit: boolean;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onAdd: (columnId?: string) => void;
}

export default function TaskMobileBoard({
  tasks,
  members,
  categories,
  canEdit,
  onEdit,
  onDelete,
  onAdd,
}: TaskMobileBoardProps) {
  const columns = useTasksStore((s) => s.columns);
  const [selectedColumnId, setSelectedColumnId] = useState(columns[0]?.id ?? '');

  const selectedColumn = columns.find((c) => c.id === selectedColumnId);

  /* カラムごとの件数を事前集計（ピル表示用）。tasks が変わらない限り再計算しない */
  const countsByColumn = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tasks) {
      map.set(t.columnId, (map.get(t.columnId) ?? 0) + 1);
    }
    return map;
  }, [tasks]);

  /* 選択中カラムの「フィルタ＋締切ソート」結果 */
  const columnTasks = useMemo(
    () => sortTasksByDueDate(tasks.filter((t) => t.columnId === selectedColumnId)),
    [tasks, selectedColumnId]
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* ステータスピル横スクロール */}
      <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none shrink-0">
        {columns.map((col) => {
          const count = countsByColumn.get(col.id) ?? 0;
          const isActive = col.id === selectedColumnId;
          return (
            <button
              key={col.id}
              onClick={() => setSelectedColumnId(col.id)}
              className="flex-none flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-semibold whitespace-nowrap transition-colors"
              style={
                isActive
                  ? { background: 'var(--primary-950)', border: '1px solid var(--primary-700)', color: 'var(--text-accent)' }
                  : { background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)' }
              }
              aria-pressed={isActive}
            >
              <span
                className="w-2 h-2 rounded-sm shrink-0"
                style={{ background: col.color }}
                aria-hidden="true"
              />
              <span style={{ fontFamily: 'var(--font-head)' }}>{col.name}</span>
              <span
                className="font-bold font-num text-[11px] opacity-80"
                style={{ fontFamily: 'var(--font-num)' }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 選択中ステータスのリストヘッダー */}
      {selectedColumn && (
        <div className="flex items-center gap-2 px-4 pb-2 shrink-0">
          <span className="w-1 h-4 rounded-full shrink-0" style={{ background: selectedColumn.color }} aria-hidden="true" />
          <span className="font-semibold text-[15px] text-text" style={{ fontFamily: 'var(--font-head)' }}>
            {selectedColumn.name}
          </span>
          <span className="text-[12px] text-muted font-num">{columnTasks.length}件</span>
        </div>
      )}

      {/* タスクリスト */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 flex flex-col gap-2.5" style={{ minHeight: 0 }}>
        {columnTasks.length === 0 ? (
          <p className="text-[13px] text-muted text-center py-8">タスクはありません</p>
        ) : (
          columnTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              members={members}
              columns={columns}
              categories={categories}
              isDragging={false}
              canEdit={canEdit}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
      </div>

      {/* 固定 FAB: ＋ タスクを追加 */}
      {canEdit && (
        <button
          onClick={() => onAdd(selectedColumnId)}
          className="fixed bottom-20 right-4 flex items-center gap-2 px-4 h-11 rounded-full shadow-lg font-semibold text-[13px] transition-opacity hover:opacity-90 z-10"
          style={{ background: 'var(--purple-d)', color: 'var(--purple-l)', boxShadow: 'var(--glow-primary)' }}
          aria-label="タスクを追加"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v10M3 8h10" />
          </svg>
          タスクを追加
        </button>
      )}
    </div>
  );
}
