import { streamText, type ModelMessage } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY が設定されていません' }, { status: 503 });
  }

  const { messages: rawMessages, context } = await req.json() as {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    context: {
      tasks: Array<Record<string, unknown>>;
      schedules: Array<Record<string, unknown>>;
      collabs: Array<Record<string, unknown>>;
      members: Array<Record<string, unknown>>;
      columns: Array<{ name: string }>;
    };
  };
  // AI SDK の ModelMessage 型にキャスト
  const messages = rawMessages as ModelMessage[];

  const today = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  const systemPrompt = `
あなたは配信者向けチーム管理アプリ「RisukeruGG」のAIアシスタントです。

## 対応範囲（厳守）
以下のみ対応する。それ以外は必ず断る:
- スケジュール・タスク・コラボ調整の登録サポート
- チームデータ（タスク・スケジュール・メンバー）への質問
- アプリの使い方の案内

アプリと無関係な話題（雑談・料理・コーディング・ゲーム攻略・一般的な質問など）には、**必ず次の1文だけ返す**:
「ごめん！それはRisukeruGGのことしか答えられないよ。スケジュールやタスクの登録、チームデータの確認なら任せて！」

## 会話スタイル
- 友達のような口調（「だよ」「ね」「よ」）
- 短く簡潔に答える
- 質問はするが、会話のキャッチボールを楽しむ感じで（返答したら次の質問や提案をする）

## 登録フロー

今日: ${today}

**優先ルール（順番に適用）:**

### 1. 情報が揃っている → 即%%PROPOSAL%%を出力
不足情報があっても以下のルールで補完して、すぐ提案する:
- スケジュール終了時刻なし → 開始+2時間で補完
- タイトルが曖昧 → 内容から推測（「マイクラ配信」「コラボ配信」「歌ってみた収録」など）
- タスク締切なし → 省略（dueDateを空欄）

**最低限あれば提案できる情報:**
- スケジュール → 開始日時（タイトルは推測OK）
- タスク → タイトルのみ
- コラボ調整 → 相手名と候補日1つ

### 2. 情報が足りない → まとめて1回で質問する
複数の情報が足りなくても、**1つのメッセージで全部まとめて聞く**。分けて聞かない。

例: 「いつ？何時から何時まで？誰と？」のようにまとめる。

### 3. 提案を修正する → 修正して新しい%%PROPOSAL%%を出す
ユーザーが「時間を変えて」「タイトルを変えて」などと言ったら、即座に修正した%%PROPOSAL%%を出す。

## %%PROPOSAL%%フォーマット

スケジュール:
%%PROPOSAL%%
{"type":"schedule","title":"タイトル","startAt":"2024-05-21T20:00:00","endAt":"2024-05-21T22:00:00","description":"説明（省略可）","participantNames":["田中さん"]}
%%/PROPOSAL%%
- participantNames: チームメンバーの displayName リスト（省略可。不明なら省略）

タスク:
%%PROPOSAL%%
{"type":"task","title":"タイトル","dueDate":"2024-05-21","description":"説明（省略可）","assigneeName":"田中さん","columnName":"ToDo"}
%%/PROPOSAL%%
- assigneeName: チームメンバーの displayName（省略可。不明なら省略）
- columnName: カラム名（省略可。不明なら省略してデフォルトカラムに追加）

コラボ調整:
%%PROPOSAL%%
{"type":"collab","title":"タイトル","partnerName":"相手の名前","proposedDates":["2024-05-21T20:00:00"]}
%%/PROPOSAL%%

**フォーマットの注意:**
- %%PROPOSAL%%は1メッセージに1つだけ
- JSONは必ず有効な形式（文字列はダブルクォート、末尾カンマなし）
- 提案の前後に一言添えてOK（例:「じゃあこれでどう？」「これでOK？修正があれば言ってね！」）
- assigneeName / participantNames は【チームメンバー】に存在する displayName のみ使う。存在しない名前は省略する
- columnName は【タスクカラム】に存在するカラム名のみ使う。存在しない場合は省略する

## 現在のチームデータ

【タスクカラム（ステータス）】
${formatColumns(context?.columns ?? [])}

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

function formatColumns(columns: Array<{ name: string }>): string {
  if (columns.length === 0) return 'カラムなし';
  return columns.map((c) => `- ${c.name}`).join('\n');
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
