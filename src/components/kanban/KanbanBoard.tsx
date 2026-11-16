'use client';

import { useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useTasksStore } from '@/stores/tasks';
import { useCategoryStore } from '@/stores/categories';
import { updateTask } from '@/lib/repositories/tasks';
import { sortTasksByDueDate } from '@/lib/utils/taskOrdering';
import type { TaskStatus, Task, TeamMember, Category } from '@/types/entities';
import TaskCard from './TaskCard';

interface KanbanBoardProps {
  teamId: string;
  members: TeamMember[];
  canEdit: boolean;
  tasks?: Task[];
  showHint: boolean;
  onDismissHint: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: (columnId?: string) => void;
}

export default function KanbanBoard({
  teamId,
  members,
  canEdit,
  tasks: tasksProp,
  showHint,
  onDismissHint,
  onEditTask,
  onDeleteTask,
  onAddTask,
}: KanbanBoardProps) {
  const storeTasks = useTasksStore((s) => s.tasks);
  const columns = useTasksStore((s) => s.columns);
  const categories = useCategoryStore((s) => s.categories);
  const tasks = tasksProp ?? storeTasks;

  /* カラムごとに「フィルタ＋締切ソート」した結果を事前計算。
     tasks / columns が変わらない限り再計算しない */
  const tasksByColumn = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const column of columns) {
      map.set(column.id, sortTasksByDueDate(tasks.filter((t) => t.columnId === column.id)));
    }
    return map;
  }, [tasks, columns]);

  async function handleDragEnd(result: DropResult) {
    if (!result.destination || !canEdit) return;
    const { draggableId, destination } = result;
    const task = tasks.find((t) => t.id === draggableId);
    if (!task || task.columnId === destination.droppableId) return;
    await updateTask(teamId, draggableId, { columnId: destination.droppableId }, task.updatedAt);
  }

  return (
    <div className="flex flex-col h-full w-full min-h-0">
      {/* ヒントバー */}
      {showHint && (
        <div
          className="flex items-center gap-3 px-4 py-2.5 mb-3 rounded-[10px] text-[12px] shrink-0"
          style={{ background: 'var(--purple-xs)', border: '1px solid var(--purple-sm)' }}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0 text-purple-l">
            <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
          </svg>
          <span className="flex-1 text-text-secondary">
            タスクカードをドラッグして列間を移動できます。カード右上のボタンで編集・削除、列下部の「＋」から素早く追加できます。
          </span>
          <button
            onClick={onDismissHint}
            className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-text-muted hover:text-text transition-colors"
            aria-label="ヒントを閉じる"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
              <path strokeLinecap="round" d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
      )}

      {/* スクロールエリア */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1 min-h-0 scrollbar-none" style={{ alignItems: 'flex-start' }}>
          {columns.map((column) => (
            <TaskStatusPanel
              key={column.id}
              column={column}
              tasks={tasksByColumn.get(column.id) ?? []}
              teamId={teamId}
              members={members}
              columns={columns}
              categories={categories}
              canEdit={canEdit}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              onAddTask={onAddTask}
            />
          ))}

        </div>
      </DragDropContext>
    </div>
  );
}

interface TaskStatusPanelProps {
  column: TaskStatus;
  tasks: Task[];
  teamId: string;
  members: TeamMember[];
  columns: TaskStatus[];
  categories: Category[];
  canEdit: boolean;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: (columnId?: string) => void;
}

function TaskStatusPanel({
  column,
  tasks,
  members,
  columns,
  categories,
  canEdit,
  onEditTask,
  onDeleteTask,
  onAddTask,
}: TaskStatusPanelProps) {
  return (
    <div
      className="flex flex-col rounded-[12px] min-h-[200px]"
      style={{
        flex: '1 1 0',
        minWidth: '180px',
        background: 'var(--surface)',
        border: '1px solid var(--card-border)',
      }}
    >
      {/* カラムヘッダー */}
      <div
        className="flex items-center gap-2.5 px-3.5 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--card-border)' }}
      >
        {/* カラーバー */}
        <span
          className="w-1 h-[17px] rounded-full shrink-0"
          style={{ background: column.color }}
          aria-hidden="true"
        />
        {/* ステータスアイコン */}
        {column.icon && (
          <span
            className="material-icons text-[15px] shrink-0"
            style={{ color: column.color }}
            aria-hidden="true"
          >
            {column.icon}
          </span>
        )}
        <span
          className="font-semibold text-[14px] text-text flex-1 truncate"
          style={{ fontFamily: 'var(--font-head)' }}
        >
          {column.name}
        </span>
        {/* 件数バッジ */}
        <span
          className="min-w-[22px] h-[22px] px-1.5 rounded-full flex items-center justify-center text-[11px] font-bold font-num text-text-muted"
          style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
        >
          {tasks.length}
        </span>
      </div>

      {/* カードリスト */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex flex-col gap-2.5 p-3 flex-1 transition-colors"
            style={{
              background: snapshot.isDraggingOver
                ? 'color-mix(in oklab, var(--primary) 6%, transparent)'
                : undefined,
              minHeight: 60,
            }}
          >
            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <p className="text-[11px] text-text-muted text-center py-3">タスクはありません</p>
            )}
            {tasks.map((task, index) => (
              <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={!canEdit}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                    <TaskCard
                      task={task}
                      members={members}
                      columns={columns}
                      categories={categories}
                      isDragging={snapshot.isDragging}
                      canEdit={canEdit}
                      onEdit={onEditTask}
                      onDelete={onDeleteTask}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {/* ＋ タスクを追加 ボタン */}
      {canEdit && (
        <button
          onClick={() => onAddTask(column.id)}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 text-[12px] text-text-muted hover:text-text transition-colors shrink-0"
          style={{ borderTop: '1px dashed var(--border-light)' }}
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v10M3 8h10" />
          </svg>
          タスクを追加
        </button>
      )}
    </div>
  );
}
