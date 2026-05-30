import { streamText, type ModelMessage } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { NextRequest } from 'next/server';
import {
  generateSystemPrompt,
  type AiChatContext,
} from '@/lib/ai/systemPrompt';

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY が設定されていません' }, { status: 503 });
  }

  const { messages: rawMessages, context } = await req.json() as {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    context: AiChatContext;
  };
  // AI SDK の ModelMessage 型にキャスト
  const messages = rawMessages as ModelMessage[];

  const todayDate = new Date();
  const today = todayDate.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
  // ISO形式（日付計算用）
  const todayISO = todayDate.toISOString().split('T')[0]!;

  const systemPrompt = generateSystemPrompt(context ?? {
    tasks: [],
    schedules: [],
    collabs: [],
    members: [],
    columns: [],
  }, today, todayISO);

  const result = streamText({
    model: anthropic('claude-haiku-4-5'),
    system: systemPrompt,
    messages,
  });

  return result.toTextStreamResponse();
}
