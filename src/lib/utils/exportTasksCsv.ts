import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { Task, KanbanColumn, TeamMember } from '@/types/entities';

const CATEGORY_LABELS: Record<Task['category'], string> = {
  shooting: '撮影',
  editing: '編集',
  thumbnail: 'サムネ',
  announcement: '告知',
  other: 'その他',
};

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportTasksCsv(
  tasks: Task[],
  columns: KanbanColumn[],
  members: TeamMember[]
): void {
  const columnMap = new Map(columns.map((c) => [c.id, c.name]));
  const memberMap = new Map(members.map((m) => [m.userId, m.displayName]));

  const headers = ['タイトル', '担当者', 'カテゴリ', 'カラム', '締切日', '作成日', '作成者'];
  const rows = tasks.map((task) => [
    task.title,
    task.assigneeId ? (memberMap.get(task.assigneeId) ?? '元メンバー') : '',
    CATEGORY_LABELS[task.category],
    columnMap.get(task.columnId) ?? '',
    task.dueDate ? format(task.dueDate, 'yyyy/MM/dd', { locale: ja }) : '',
    format(task.createdAt, 'yyyy/MM/dd', { locale: ja }),
    memberMap.get(task.createdBy) ?? task.createdBy,
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(','))
    .join('\n');

  const bom = '﻿';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `tasks_${format(new Date(), 'yyyyMMdd')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
