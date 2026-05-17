'use client';

import { useState, useEffect } from 'react';
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
import { Avatar } from '@/components/ui/Avatar';
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
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  /* assigneeId は RHF の外で管理（unregistered field の挙動を避けるため） */
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);
  const currentAssignee = members.find((m) => m.userId === selectedAssigneeId) ?? null;

  const {
    register,
    handleSubmit,
    setValue,
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

  /* カラムが遅れてロードされた場合に defaultValues が '' のまま残るのを防ぐ */
  useEffect(() => {
    if (columns.length > 0) {
      setValue('columnId', columns[0].id, { shouldDirty: false, shouldValidate: false });
    }
  // columns が変わるたびに実行しないよう初回のみ想定（useEffect の deps は columns[0]?.id）
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns[0]?.id]);

  async function onSubmit(data: TaskInput) {
    setSubmitError(null);
    try {
      await createTask({
        teamId,
        title: data.title,
        columnId: data.columnId,
        /* select の空文字選択は null として送信する */
        categoryId: data.categoryId || null,
        assigneeId: selectedAssigneeId,
        dueDate: data.dueDate ? data.dueDate.toISOString() : null,
        linkedScheduleId: data.linkedScheduleId || null,
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
          className={`w-full border rounded-[8px] px-3 py-2 text-sm bg-card text-text outline-none transition-colors ${
            errors.categoryId ? 'border-live' : 'border-border'
          }`}
        >
          <option value="">なし</option>
          {taskCategories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        {errors.categoryId && (
          <p className="text-live text-[12px] mt-1">必須項目です。</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-muted mb-1">カラム *</label>
        <select
          {...register('columnId')}
          className={`w-full border rounded-[8px] px-3 py-2 text-sm bg-card text-text outline-none transition-colors ${
            errors.columnId ? 'border-live' : 'border-border'
          }`}
        >
          {columns.map((col) => (
            <option key={col.id} value={col.id}>
              {col.name}
            </option>
          ))}
        </select>
        {errors.columnId && (
          <p className="text-live text-[12px] mt-1">必須項目です。</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-muted mb-1">担当者</label>
        {/* 選択中担当者表示ボタン */}
        <button
          type="button"
          onClick={() => setShowAssigneePicker((v) => !v)}
          className="w-full flex items-center gap-2.5 px-3 py-2 border border-border rounded-[8px] bg-card text-left hover:border-border-l transition-colors"
        >
          {currentAssignee ? (
            <>
              <Avatar
                initials={currentAssignee.displayName.slice(0, 2)}
                src={currentAssignee.avatarUrl}
                bgClass="bg-purple-d/30"
                textClass="text-purple-l"
                size="sm"
              />
              <span className="flex-1 text-sm text-text truncate">{currentAssignee.displayName}</span>
            </>
          ) : (
            <span className="flex-1 text-sm text-muted">なし</span>
          )}
          <span className="material-icons text-[16px] text-muted">
            {showAssigneePicker ? 'expand_less' : 'expand_more'}
          </span>
        </button>
        {/* メンバーピッカー（インライン展開） */}
        {showAssigneePicker && (
          <div className="mt-1 border border-border rounded-[10px] overflow-hidden">
            <button
              type="button"
              onClick={() => { setSelectedAssigneeId(null); setShowAssigneePicker(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors text-left ${
                !selectedAssigneeId ? 'bg-purple/10 text-purple-l' : 'hover:bg-surface text-muted'
              }`}
            >
              <div className="w-6 h-6 rounded-full border border-dashed border-border flex items-center justify-center shrink-0">
                <span className="material-icons text-[12px]">person_off</span>
              </div>
              <span className="flex-1">なし</span>
              {!selectedAssigneeId && <span className="material-icons text-[14px]">check</span>}
            </button>
            {members.map((m) => (
              <button
                type="button"
                key={m.userId}
                onClick={() => { setSelectedAssigneeId(m.userId); setShowAssigneePicker(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors text-left border-t border-border ${
                  selectedAssigneeId === m.userId ? 'bg-purple/10' : 'hover:bg-surface'
                }`}
              >
                <Avatar
                  initials={m.displayName.slice(0, 2)}
                  src={m.avatarUrl}
                  bgClass="bg-purple-d/30"
                  textClass="text-purple-l"
                  size="sm"
                />
                <span className={`flex-1 truncate ${selectedAssigneeId === m.userId ? 'text-purple-l font-semibold' : 'text-text'}`}>
                  {m.displayName}
                </span>
                {selectedAssigneeId === m.userId && (
                  <span className="material-icons text-[14px] text-purple-l">check</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-muted mb-1">締切日</label>
        <input
          type="date"
          {...register('dueDate', {
            setValueAs: (v: string) => (v ? new Date(v) : null),
          })}
          className={`w-full border rounded-[8px] px-3 py-2 text-sm bg-card text-text outline-none transition-colors ${
            errors.dueDate ? 'border-live' : 'border-border'
          }`}
        />
        {errors.dueDate && (
          <p className="text-live text-[12px] mt-1">必須項目です。</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-muted mb-1">紐付けスケジュール</label>
        <select
          {...register('linkedScheduleId')}
          className={`w-full border rounded-[8px] px-3 py-2 text-sm bg-card text-text outline-none transition-colors ${
            errors.linkedScheduleId ? 'border-live' : 'border-border'
          }`}
        >
          <option value="">なし</option>
          {schedules.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title} ({format(s.startAt, 'M/d')})
            </option>
          ))}
        </select>
        {errors.linkedScheduleId && (
          <p className="text-live text-[12px] mt-1">必須項目です。</p>
        )}
      </div>

      {submitError && <p className="text-live text-sm">{submitError}</p>}

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
