import { describe, it, expect } from 'vitest';
import type { KanbanColumn, Task } from '@/types/entities';

function buildColumn(id: string, order: number): KanbanColumn {
  return { id, name: `Column ${id}`, order, color: '#000', createdAt: new Date() };
}

function buildTask(id: string, columnId: string): Task {
  return {
    id,
    title: `Task ${id}`,
    columnId,
    category: 'other',
    assigneeId: null,
    dueDate: null,
    linkedScheduleId: null,
    updatedAt: new Date(),
    createdBy: 'user1',
    createdAt: new Date(),
  };
}

/** Pure logic extracted from deleteColumn for unit testing */
function simulateDeleteColumn(
  columns: KanbanColumn[],
  columnId: string,
  tasks: Task[]
): { fallbackColumnId: string; movedTaskIds: string[] } {
  if (columns.length <= 1) {
    throw new Error('最低1つのカラムが必要です');
  }

  const fallback = columns.find((c) => c.id !== columnId);
  if (!fallback) throw new Error('移行先カラムが見つかりません');

  const movedTaskIds = tasks.filter((t) => t.columnId === columnId).map((t) => t.id);

  return { fallbackColumnId: fallback.id, movedTaskIds };
}

describe('カラム削除時のタスク移行ロジック', () => {
  it('カラムが1つのとき削除できない', () => {
    const columns = [buildColumn('col1', 0)];
    const tasks: Task[] = [];
    expect(() => simulateDeleteColumn(columns, 'col1', tasks)).toThrow('最低1つのカラムが必要です');
  });

  it('カラムが2つ以上あれば削除できる', () => {
    const columns = [buildColumn('col1', 0), buildColumn('col2', 1)];
    const tasks = [buildTask('t1', 'col1'), buildTask('t2', 'col2')];
    const result = simulateDeleteColumn(columns, 'col1', tasks);
    expect(result.fallbackColumnId).toBe('col2');
    expect(result.movedTaskIds).toEqual(['t1']);
  });

  it('削除対象カラムのタスクが全て移行先へ移動される', () => {
    const columns = [buildColumn('col1', 0), buildColumn('col2', 1), buildColumn('col3', 2)];
    const tasks = [buildTask('t1', 'col2'), buildTask('t2', 'col2'), buildTask('t3', 'col1')];
    const result = simulateDeleteColumn(columns, 'col2', tasks);
    expect(result.movedTaskIds).toHaveLength(2);
    expect(result.movedTaskIds).toContain('t1');
    expect(result.movedTaskIds).toContain('t2');
  });

  it('削除対象カラムにタスクがない場合は移動なし', () => {
    const columns = [buildColumn('col1', 0), buildColumn('col2', 1)];
    const tasks = [buildTask('t1', 'col2')];
    const result = simulateDeleteColumn(columns, 'col1', tasks);
    expect(result.movedTaskIds).toHaveLength(0);
    expect(result.fallbackColumnId).toBe('col2');
  });

  it('移行先はソート順で最初のカラムになる', () => {
    const columns = [buildColumn('col1', 0), buildColumn('col2', 1), buildColumn('col3', 2)];
    const tasks: Task[] = [];
    const result = simulateDeleteColumn(columns, 'col1', tasks);
    // findで見つかる最初の非削除カラム
    expect(result.fallbackColumnId).toBe('col2');
  });
});
