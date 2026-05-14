'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { taskSchema, type TaskInput, type TaskFormInput } from '@/lib/validations/tasks';
import { createTask, updateTask } from '@/lib/repositories/tasks';
import { useTasksStore } from '@/stores/tasks';
import { useScheduleStore } from '@/stores/schedule';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Task, TeamMember } from '@/types/entities';

const CATEGORY_OPTIONS = [
  { value: 'shooting', label: '撮影' },
  { value: 'editing', label: '編集' },
  { value: 'thumbnail', label: 'サムネ' },
  { value: 'announcement', label: '告知' },
  { value: 'other', label: 'その他' },
] as const;

interface TaskFormProps {
  teamId: string;
  members: TeamMember[];
  task?: Task;
  isLightPlanFull?: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function TaskForm({
  teamId,
  members,
  task,
  isLightPlanFull,
  onSuccess,
  onCancel,
}: TaskFormProps) {
  const { columns } = useTasksStore();
  const { schedules } = useScheduleStore();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormInput, unknown, TaskInput>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title ?? '',
      columnId: task?.columnId ?? columns[0]?.id ?? '',
      category: task?.category ?? 'other',
      assigneeId: task?.assigneeId ?? null,
      dueDate: task?.dueDate ?? null,
      linkedScheduleId: task?.linkedScheduleId ?? null,
    },
  });

  async function onSubmit(data: TaskInput) {
    setSubmitError(null);
    try {
      if (task) {
        await updateTask(teamId, task.id, { ...data }, task.updatedAt);
      } else {
        await createTask({
          teamId,
          title: data.title,
          columnId: data.columnId,
          category: data.category,
          assigneeId: data.assigneeId ?? null,
          dueDate: data.dueDate ? data.dueDate.toISOString() : null,
          linkedScheduleId: data.linkedScheduleId ?? null,
        });
      }
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : '予期しないエラーが発生しました';
      if (message.includes('failed-precondition') || message.includes('上限')) {
        setSubmitError('タスクの作成上限に達しました。PARTYプランにアップグレードしてください。');
      } else {
        setSubmitError(message);
      }
    }
  }

  const isEdit = Boolean(task);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {isLightPlanFull && !isEdit && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
          <p className="font-medium text-amber-800">タスクの作成上限に達しました（月5件）</p>
          <p className="text-amber-700 mt-1">
            PARTYプランにアップグレードすると無制限でタスクを作成できます。
            <a href="/settings" className="underline ml-1">アップグレードする</a>
          </p>
        </div>
      )}

      <Input
        label="タイトル *"
        error={errors.title?.message}
        {...register('title')}
        disabled={isLightPlanFull && !isEdit}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ *</label>
        <select
          {...register('category')}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">カラム *</label>
        <select
          {...register('columnId')}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {columns.map((col) => (
            <option key={col.id} value={col.id}>
              {col.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">担当者</label>
        <select
          {...register('assigneeId')}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">なし</option>
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.displayName}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">締切日</label>
        <input
          type="date"
          {...register('dueDate', {
            setValueAs: (v: string) => (v ? new Date(v) : null),
          })}
          defaultValue={task?.dueDate ? format(task.dueDate, 'yyyy-MM-dd') : ''}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">紐付けスケジュール</label>
        <select
          {...register('linkedScheduleId')}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">なし</option>
          {schedules.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title} ({format(s.startAt, 'M/d')})
            </option>
          ))}
        </select>
      </div>

      {submitError && (
        <p className="text-red-500 text-sm">{submitError}</p>
      )}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>
          キャンセル
        </Button>
        <Button type="submit" loading={isSubmitting} disabled={isLightPlanFull && !isEdit}>
          {isEdit ? '更新する' : '作成する'}
        </Button>
      </div>
    </form>
  );
}
