'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { taskSchema, type TaskInput, type TaskFormInput } from '@/lib/validations/tasks';
import { createTask } from '@/lib/repositories/tasks';
import { useTasksStore } from '@/stores/tasks';
import { useTaskCategoryStore } from '@/stores/taskCategories';
import { useScheduleStore } from '@/stores/schedule';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { TeamMember } from '@/types/entities';

interface TaskFormProps {
  teamId: string;
  members: TeamMember[];
  isLightPlanFull?: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function TaskForm({
  teamId,
  members,
  isLightPlanFull,
  onSuccess,
  onCancel,
}: TaskFormProps) {
  const { columns } = useTasksStore();
  const { taskCategories } = useTaskCategoryStore();
  const { schedules } = useScheduleStore();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormInput, unknown, TaskInput>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      columnId: columns[0]?.id ?? '',
      categoryId: null,
      description: null,
      assigneeId: null,
      dueDate: null,
      linkedScheduleId: null,
    },
  });

  async function onSubmit(data: TaskInput) {
    setSubmitError(null);
    try {
      await createTask({
        teamId,
        title: data.title,
        columnId: data.columnId,
        categoryId: data.categoryId ?? null,
        assigneeId: data.assigneeId ?? null,
        dueDate: data.dueDate ? data.dueDate.toISOString() : null,
        linkedScheduleId: data.linkedScheduleId ?? null,
      });
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {isLightPlanFull && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
          <p className="font-medium text-amber-800">タスクの作成上限に達しました（月5件）</p>
          <p className="text-amber-700 mt-1">
            PARTYプランにアップグレードすると無制限でタスクを作成できます。
            <a href="/settings" className="underline ml-1">
              アップグレードする
            </a>
          </p>
        </div>
      )}

      <Input
        label="タイトル *"
        error={errors.title?.message}
        {...register('title')}
        disabled={isLightPlanFull}
      />

      <div>
        <label className="block text-sm font-medium text-muted mb-1">カテゴリ</label>
        <select
          {...register('categoryId')}
          className="w-full border border-border rounded-[8px] px-3 py-2 text-sm bg-card text-text"
        >
          <option value="">なし</option>
          {taskCategories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        {errors.categoryId && (
          <p className="text-red-500 text-xs mt-1">{errors.categoryId.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-muted mb-1">カラム *</label>
        <select
          {...register('columnId')}
          className="w-full border border-border rounded-[8px] px-3 py-2 text-sm bg-card text-text"
        >
          {columns.map((col) => (
            <option key={col.id} value={col.id}>
              {col.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-muted mb-1">担当者</label>
        <select
          {...register('assigneeId')}
          className="w-full border border-border rounded-[8px] px-3 py-2 text-sm bg-card text-text"
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
        <label className="block text-sm font-medium text-muted mb-1">締切日</label>
        <input
          type="date"
          {...register('dueDate', {
            setValueAs: (v: string) => (v ? new Date(v) : null),
          })}
          className="w-full border border-border rounded-[8px] px-3 py-2 text-sm bg-card text-text"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted mb-1">紐付けスケジュール</label>
        <select
          {...register('linkedScheduleId')}
          className="w-full border border-border rounded-[8px] px-3 py-2 text-sm bg-card text-text"
        >
          <option value="">なし</option>
          {schedules.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title} ({format(s.startAt, 'M/d')})
            </option>
          ))}
        </select>
      </div>

      {submitError && <p className="text-red-500 text-sm">{submitError}</p>}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>
          キャンセル
        </Button>
        <Button type="submit" loading={isSubmitting} disabled={isLightPlanFull}>
          作成する
        </Button>
      </div>
    </form>
  );
}
