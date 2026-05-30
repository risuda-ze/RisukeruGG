import { z } from 'zod';

export const taskSchema = z.object({
  title: z.string().min(1, '必須項目です。').max(200, '200文字以内で入力してください。'),
  columnId: z.string().min(1, '必須項目です。'),
  categoryId: z.string().nullable().default(null),
  description: z.string().max(2000).nullable().default(null),
  assigneeId: z.string().nullable().default(null),
  dueDate: z.date().nullable().default(null),
  linkedScheduleId: z.string().nullable().default(null),
});

export const taskStatusSchema = z.object({
  name: z.string().min(1).max(30),
  color: z.string(),
  order: z.number().int().min(0),
});

export type TaskInput = z.infer<typeof taskSchema>;
export type TaskFormInput = z.input<typeof taskSchema>;
export type TaskStatusInput = z.infer<typeof taskStatusSchema>;


