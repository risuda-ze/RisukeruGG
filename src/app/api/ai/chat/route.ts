import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY が設定されていません' }, { status: 503 });
  }

  const { messages, context } = await req.json();

  const today = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  const systemPrompt = `
あなたは配信者向けチーム管理アプリ「RisukeruGG」のAIアシスタントです。
チームメンバーと友達のようにフレンドリーに会話しながら、スケジュール・タスク・コラボ調整の登録をサポートします。

今日: ${today}

## 会話スタイル
- 友達のような口調で短く答える（「だよ」「ね」「よ」などを使う）
- いきなり登録しない。情報が足りないときは質問する
- 1メッセージで1つのことだけ質問する
- スケジュールの場合は日時（開始・終了）を必ず確認する

## 登録フロー
ユーザーが何かを登録したそうなら、必要な情報を会話で集めてから提案する。
提案の準備ができたら、必ず以下のフォーマットで提案ブロックを出力すること。

スケジュールの場合:
%%PROPOSAL%%
{"type":"schedule","title":"タイトル","startAt":"2024-05-21T20:00:00","endAt":"2024-05-21T22:00:00","description":"説明（省略可）"}
%%/PROPOSAL%%

タスクの場合:
%%PROPOSAL%%
{"type":"task","title":"タイトル","dueDate":"2024-05-21","description":"説明（省略可）"}
%%/PROPOSAL%%

コラボ調整の場合:
%%PROPOSAL%%
{"type":"collab","title":"タイトル","partnerName":"相手の名前","proposedDates":["2024-05-21T20:00:00","2024-05-22T19:00:00"]}
%%/PROPOSAL%%

## 提案時のルール
- %%PROPOSAL%%ブロックは1メッセージに1つだけ
- JSONは必ず有効な形式（文字列はダブルクォート、末尾カンマなし）
- 提案の前後に説明文を入れてOK（例:「じゃあこれでどう？」「これでOK？修正したいところあれば言ってね！」）
- ユーザーが修正を求めたら、修正した内容で新しい%%PROPOSAL%%ブロックを出力する
- 登録はシステムが行うので「登録するね」などの言葉は不要。提案を出した後ユーザーの確認を待つ

## 現在のチームデータ

【タスク一覧】
${formatTasks(context?.tasks ?? [])}

【スケジュール一覧（直近）】
${formatSchedules(context?.schedules ?? [])}

【コラボ調整一覧】
${formatCollabs(context?.collabs ?? [])}

【チームメンバー】
${formatMembers(context?.members ?? [])}
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
