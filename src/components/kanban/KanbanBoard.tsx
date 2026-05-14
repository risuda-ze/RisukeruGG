'use client';

import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useTasksStore } from '@/stores/tasks';
import { updateTask } from '@/lib/repositories/tasks';
import type { KanbanColumn, Task, TeamMember } from '@/types/entities';
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
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[60vh]">
        {columns.map((column) => (
          <KanbanColumn
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

interface KanbanColumnProps {
  column: KanbanColumn;
  tasks: Task[];
  teamId: string;
  members: TeamMember[];
  canEdit: boolean;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

function KanbanColumn({ column, tasks, teamId, members, canEdit, onEditTask, onDeleteTask }: KanbanColumnProps) {
  return (
    <div className="flex-shrink-0 w-72">
      <div
        className="rounded-t-lg px-3 py-2 flex items-center gap-2"
        style={{ backgroundColor: column.color }}
      >
        <span className="font-semibold text-white text-sm">{column.name}</span>
        <span className="ml-auto text-white/80 text-xs">{tasks.length}</span>
      </div>
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`min-h-24 rounded-b-lg p-2 flex flex-col gap-2 transition-colors ${
              snapshot.isDraggingOver ? 'bg-gray-100' : 'bg-gray-50'
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
