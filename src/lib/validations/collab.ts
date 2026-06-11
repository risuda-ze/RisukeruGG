import { z } from 'zod';

// CollabStatus の Zod スキーマ（'draft' を追加）
export const collabStatusSchema = z.enum(['draft', 'open', 'confirmed', 'expired', 'cancelled']);

// コラボセッション作成・編集フォーム用スキーマ
export const collabSessionSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').max(100),
  status: collabStatusSchema.default('draft'),
  content: z.string().max(1000).optional(),
  proposedDates: z.array(z.date()).min(1, '候補日時は1件以上必要です').max(10),
  participants: z.array(
    z.object({
      id: z.string(),
      name: z.string().min(1),
      type: z.enum(['member', 'external']),
    })
  ).min(1, '参加者は1人以上必要です'),
});

// 参加者回答フォーム用スキーマ（'maybe' 追加）
export const collabResponseSchema = z.object({
  dates: z.record(z.string(), z.enum(['ok', 'ng', 'maybe'])),
  alternativeDates: z.array(z.date()).default([]),
  note: z.string().max(200).nullable().default(null),
});

export type CollabSessionInput = z.infer<typeof collabSessionSchema>;
export type CollabResponseInput = z.infer<typeof collabResponseSchema>;
