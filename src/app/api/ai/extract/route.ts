import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { NextRequest } from 'next/server';

const ExtractedSchema = z.object({
  type: z.enum(['schedule', 'task', 'collab']),
  schedule: z
    .object({
      title: z.string(),
      startAt: z.string().nullable(),
      endAt: z.string().nullable(),
      description: z.string(),
    })
    .optional(),
  task: z
    .object({
      title: z.string(),
      description: z.string().nullable(),
      dueDate: z.string().nullable(),
    })
    .optional(),
  collab: z
    .object({
      title: z.string(),
      partnerName: z.string(),
      proposedDates: z.array(z.string()),
    })
    .optional(),
});

export type ExtractedData = z.infer<typeof ExtractedSchema>;

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY が設定されていません' }, { status: 503 });
  }

  const { text } = await req.json();

  if (!text || typeof text !== 'string') {
    return Response.json({ error: 'テキストが必要です' }, { status: 400 });
  }

  const today = new Date().toISOString();

  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-5'),
    schema: ExtractedSchema,
    prompt: `
あなたは配信者向けアプリのAIアシスタントです。
ユーザーが貼り付けたテキストを解析して、スケジュール・タスク・コラボ調整のいずれかとして構造化してください。

今日の日時: ${today}

判断基準:
- スケジュール (schedule): 配信・収録・イベントなど、日時が決まっている予定
- タスク (task): 編集・サムネイル作成・告知など、期限付きの作業
- コラボ (collab): 他の配信者との共同配信・コラボ企画の日程調整

日時フォーマット: ISO 8601 (例: "2025-06-15T18:00:00.000Z") で返す。不明な場合は null。
候補日程は複数あれば全て返す。なければ空配列。

解析対象テキスト:
${text}
    `,
  });

  return Response.json(object);
}
