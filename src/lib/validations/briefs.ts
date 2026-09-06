import { z } from 'zod';

/**
 * タスク管理 v2（1枚紙）の入力スキーマ。
 * 操作層（src/lib/briefs/operations）と画面フォームの両方が使う。
 */

const keySchema = z
  .string()
  .min(1, '必須項目です。')
  .max(40)
  .regex(/^[a-z0-9_]+$/, '英小文字・数字・_ のみ使用できます');

export const fieldDefSchema = z.object({
  key: keySchema,
  label: z.string().min(1, '必須項目です。').max(40),
  type: z.enum(['text', 'url', 'number', 'date', 'select']),
  options: z.array(z.string().min(1).max(40)).max(20).optional(),
  required: z.boolean().default(false),
  ownerRoleLabel: z.string().max(20).nullable().default(null),
});

export const stepDefSchema = z.object({
  key: keySchema,
  title: z.string().min(1, '必須項目です。').max(60, '60文字以内で入力してください。'),
  roleLabel: z.string().max(20).nullable().default(null),
  defaultAssigneeId: z.string().nullable().default(null),
  leadDays: z.number().int().min(0).max(365).default(0),
  dependsOn: z.array(keySchema).max(20).default([]),
  requiredFields: z.array(fieldDefSchema).max(20).default([]),
  reminderDaysBefore: z.number().int().min(0).max(30).default(1),
  optional: z.boolean().default(false),
});

export const playbookInputSchema = z.object({
  name: z.string().min(1, '必須項目です。').max(60, '60文字以内で入力してください。'),
  origin: z.enum(['dialogue', 'manual', 'derived']).default('manual'),
  headerFields: z.array(fieldDefSchema).max(20).default([]),
  steps: z
    .array(stepDefSchema)
    .max(50)
    .default([])
    .refine((steps) => new Set(steps.map((s) => s.key)).size === steps.length, {
      message: '工程キーが重複しています',
    })
    .refine(
      (steps) => {
        const keys = new Set(steps.map((s) => s.key));
        return steps.every((s) => s.dependsOn.every((d) => keys.has(d) && d !== s.key));
      },
      { message: '先行工程の指定が不正です' }
    ),
});

export const createBriefInputSchema = z.object({
  title: z.string().min(1, '必須項目です。').max(120, '120文字以内で入力してください。'),
  publishAt: z.date().nullable().default(null),
  playbookId: z.string().nullable().default(null),
  performerIds: z.array(z.string()).max(50).default([]),
  linkedScheduleId: z.string().nullable().default(null),
});

export const updateBriefHeaderInputSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  publishAt: z.date().nullable().optional(),
  status: z.enum(['planning', 'in_progress', 'published', 'archived']).optional(),
  performerIds: z.array(z.string()).max(50).optional(),
  fields: z.record(z.string(), z.unknown()).optional(),
});

export const addStepInputSchema = z.object({
  title: z.string().min(1, '必須項目です。').max(60),
  assigneeId: z.string().nullable().default(null),
  leadDays: z.number().int().min(0).max(365).default(0),
  dependsOn: z.array(z.string()).max(20).default([]),
  requiredFields: z.array(fieldDefSchema).max(20).default([]),
  optional: z.boolean().default(false),
  /** 挿入位置（省略時は末尾） */
  afterStepId: z.string().nullable().default(null),
});

export const stepCommentInputSchema = z.object({
  body: z.string().min(1, '必須項目です。').max(2000, '2000文字以内で入力してください。'),
});

export type FieldDefInput = z.infer<typeof fieldDefSchema>;
export type StepDefInput = z.infer<typeof stepDefSchema>;
export type PlaybookInput = z.infer<typeof playbookInputSchema>;
export type PlaybookFormInput = z.input<typeof playbookInputSchema>;
export type CreateBriefInput = z.infer<typeof createBriefInputSchema>;
export type UpdateBriefHeaderInput = z.infer<typeof updateBriefHeaderInputSchema>;
export type AddStepInput = z.infer<typeof addStepInputSchema>;
