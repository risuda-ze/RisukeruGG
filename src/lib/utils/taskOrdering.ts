import type { Task } from '@/types/entities';

function getDueDateTime(task: Task): number | null {
  return task.dueDate ? task.dueDate.getTime() : null;
}

export function compareTasksByDueDate(a: Task, b: Task): number {
  const aDue = getDueDateTime(a);
  const bDue = getDueDateTime(b);

  if (aDue !== null && bDue !== null && aDue !== bDue) {
    return aDue - bDue;
  }

  if (aDue !== null && bDue === null) {
    return -1;
  }

  if (aDue === null && bDue !== null) {
    return 1;
  }

  const updatedDiff = b.updatedAt.getTime() - a.updatedAt.getTime();
  if (updatedDiff !== 0) {
    return updatedDiff;
  }

  const createdDiff = b.createdAt.getTime() - a.createdAt.getTime();
  if (createdDiff !== 0) {
    return createdDiff;
  }

  return a.title.localeCompare(b.title, 'ja');
}

export function sortTasksByDueDate(tasks: Task[]): Task[] {
  return [...tasks].sort(compareTasksByDueDate);
}
