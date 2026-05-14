'use client';

import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useTasksStore } from '@/stores/tasks';
import { updateTask } from '@/lib/repositories/tasks';
import type { KanbanColumn, Task, TeamMember } from '@/types/entities';
import { Badge } from '@/components/ui/Badge';
import TaskCard from './TaskCard';

interface KanbanBoardProps {
  teamId: string;
  members: TeamMember[];
  canEdit: boolean;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export default function KanbanBoard({
  teamId,
  members,
  canEdit,
  onEditTask,
  onDeleteTask,
}: KanbanBoardProps) {
  const { tasks, columns } = useTasksStore();

  async function handleDragEnd(result: DropResult) {
    if (!result.destination || !canEdit) return;
    const { draggableId, destination } = result;
    const task = tasks.find((t) => t.id === draggableId);
    if (!task || task.columnId === destination.droppableId) return;

    await updateTask(teamId, draggableId, { columnId: destination.droppableId }, task.updatedAt);
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[60vh] scrollbar-none">
        {columns.map((column) => (
          <KanbanColumnPanel
            key={column.id}
            column={column}
            tasks={tasks.filter((t) => t.columnId === column.id)}
            teamId={teamId}
            members={members}
            canEdit={canEdit}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
          />
        ))}
      </div>
    </DragDropContext>
  );
}

interface KanbanColumnPanelProps {
  column: KanbanColumn;
  tasks: Task[];
  teamId: string;
  members: TeamMember[];
  canEdit: boolean;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

function KanbanColumnPanel({ column, tasks, teamId, members, canEdit, onEditTask, onDeleteTask }: KanbanColumnPanelProps) {
  return (
    <div className="flex-shrink-0 w-[272px]">
      {/* カラムヘッダー */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: column.color }}
          aria-hidden="true"
        />
        <span className="text-sm font-semibold text-text">{column.name}</span>
        <Badge variant="muted" className="ml-auto">{tasks.length}</Badge>
      </div>

      {/* カラムボディ */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`min-h-24 rounded-[10px] p-3 flex flex-col gap-2 transition-colors ${
              snapshot.isDraggingOver ? 'bg-purple/8' : 'bg-surface/50'
            }`}
          >
            {tasks.map((task, index) => (
              <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={!canEdit}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                  >
                    <TaskCard
                      task={task}
                      teamId={teamId}
                      members={members}
                      isDragging={snapshot.isDragging}
                      canEdit={canEdit}
                      onEdit={() => onEditTask(task)}
                      onDelete={() => onDeleteTask(task.id)}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
