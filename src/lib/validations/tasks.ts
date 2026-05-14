import { z } from 'zod';

export const taskSchema = z.object({
  title: z.string().min(1).max(200),
  columnId: z.string().min(1),
  category: z.enum(['shooting', 'editing', 'thumbnail', 'announcement', 'other']),
  assigneeId: z.string().nullable().default(null),
  dueDate: z.date().nullable().default(null),
  linkedScheduleId: z.string().nullable().default(null),
});

export const kanbanColumnSchema = z.object({
  name: z.string().min(1).max(30),
  color: z.string(),
  order: z.number().int().min(0),
});

export type TaskInput = z.infer<typeof taskSchema>;
export type TaskFormInput = z.input<typeof taskSchema>;
export type KanbanColumnInput = z.infer<typeof kanbanColumnSchema>;
