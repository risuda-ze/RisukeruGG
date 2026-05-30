import { describe, expect, it } from 'vitest';
import type { Task } from '@/types/entities';
import { sortTasksByDueDate } from '@/lib/utils/taskOrdering';

function createTask(overrides: Partial<Task>): Task {
  const baseDate = new Date('2026-05-30T09:00:00.000Z');

  return {
    id: 'task-id',
    title: 'task',
    columnId: 'todo',
    categoryId: null,
    description: null,
    assigneeId: null,
    dueDate: null,
    linkedScheduleId: null,
    comments: [],
    updatedAt: baseDate,
    createdBy: 'user-1',
    createdAt: baseDate,
    ...overrides,
  };
}

describe('sortTasksByDueDate', () => {
  it('締切が近いタスクを先頭に並べる', () => {
    const tasks = [
      createTask({ id: 'later', title: 'later', dueDate: new Date('2026-06-10T00:00:00.000Z') }),
      createTask({ id: 'soon', title: 'soon', dueDate: new Date('2026-06-01T00:00:00.000Z') }),
      createTask({ id: 'none', title: 'none', dueDate: null }),
    ];

    expect(sortTasksByDueDate(tasks).map((task) => task.id)).toEqual(['soon', 'later', 'none']);
  });

  it('締切なしは末尾に送る', () => {
    const tasks = [
      createTask({
        id: 'none-a',
        title: 'none-a',
        dueDate: null,
        updatedAt: new Date('2026-05-29T00:00:00.000Z'),
      }),
      createTask({
        id: 'has-due',
        title: 'has-due',
        dueDate: new Date('2026-06-03T00:00:00.000Z'),
      }),
      createTask({
        id: 'none-b',
        title: 'none-b',
        dueDate: null,
        updatedAt: new Date('2026-05-30T00:00:00.000Z'),
      }),
    ];

    expect(sortTasksByDueDate(tasks).map((task) => task.id)).toEqual([
      'has-due',
      'none-b',
      'none-a',
    ]);
  });
});
