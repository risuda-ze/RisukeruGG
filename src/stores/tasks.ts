import { create } from 'zustand';
import { subscribeTasksByTeam } from '@/lib/repositories/tasks';
import { subscribeColumns } from '@/lib/repositories/kanbanColumns';
import type { Task, KanbanColumn } from '@/types/entities';

interface TasksState {
  tasks: Task[];
  columns: KanbanColumn[];
  loading: boolean;

  subscribe: (teamId: string) => () => void;
}

export const useTasksStore = create<TasksState>((set) => ({
  tasks: [],
  columns: [],
  loading: true,

  subscribe: (teamId) => {
    set({ loading: true });
    const unsubTasks = subscribeTasksByTeam(teamId, (tasks) => {
      set({ tasks, loading: false });
    });
    const unsubColumns = subscribeColumns(teamId, (columns) => {
      set({ columns });
    });
    return () => {
      unsubTasks();
      unsubColumns();
    };
  },
}));
