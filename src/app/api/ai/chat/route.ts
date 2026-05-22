import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY が設定されていません' }, { status: 503 });
  }

  const { messages, context } = await req.json();

  const systemPrompt = `
あなたは配信者向けチーム管理アプリ「RisukeruGG」のAIアシスタントです。
チームのスケジュール・タスク・コラボ調整の情報をもとに、ユーザーの質問に日本語で答えてください。

現在のチームデータ:

【タスク一覧】
${formatTasks(context?.tasks ?? [])}

【スケジュール一覧（直近）】
${formatSchedules(context?.schedules ?? [])}

【コラボ調整一覧】
${formatCollabs(context?.collabs ?? [])}

【チームメンバー】
${formatMembers(context?.members ?? [])}

回答方針:
- 簡潔かつフレンドリーに答える
- データが見つからない場合は「まだ登録されていません」と答える
- アプリの操作方法も答えられる（スケジュール・タスク・コラボの追加・編集など）
- 個人情報の取り扱いには慎重に
  `.trim();

  const result = streamText({
    model: anthropic('claude-haiku-4-5'),
    system: systemPrompt,
    messages,
  });

  return result.toTextStreamResponse();
}

function formatTasks(tasks: Array<Record<string, unknown>>): string {
  if (tasks.length === 0) return 'タスクなし';
  return tasks
    .slice(0, 30)
    .map(
      (t) =>
        `- ${t.title}（ステータス: ${t.columnName ?? '不明'}、担当: ${t.assigneeName ?? 'なし'}、期限: ${t.dueDate ?? 'なし'}）`
    )
    .join('\n');
}

function formatSchedules(schedules: Array<Record<string, unknown>>): string {
  if (schedules.length === 0) return 'スケジュールなし';
  return schedules
    .slice(0, 20)
    .map((s) => `- ${s.title}（${s.startAt} ～ ${s.endAt}）`)
    .join('\n');
}

function formatCollabs(collabs: Array<Record<string, unknown>>): string {
  if (collabs.length === 0) return 'コラボ調整なし';
  return collabs
    .slice(0, 10)
    .map((c) => `- ${c.title}（相手: ${c.partnerName}、状態: ${c.status}）`)
    .join('\n');
}

function formatMembers(members: Array<Record<string, unknown>>): string {
  if (members.length === 0) return 'メンバーなし';
  return members.map((m) => `- ${m.displayName}（${m.role}）`).join('\n');
}
