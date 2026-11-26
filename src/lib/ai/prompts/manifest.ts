/**
 * プロンプトテンプレートの版管理（C-1 / AI-021）。
 *
 * テンプレート本体は生成関数（`generateSystemPrompt` など）が持つ。
 * ここでは id・現在の版・変更履歴を宣言し、`/settings/ai` の表示と
 * スナップショットテスト（tests/unit/ai/systemPrompt.test.ts）で回帰を検出する。
 *
 * 運用ルール:
 *   - 生成関数の文言や構造を変えたら `version` を上げ、`changelog` に 1 行足す
 *   - スナップショットの更新（`pnpm vitest run -u`）は版を上げた PR でのみ行う
 */

export interface PromptTemplateInfo {
  id: string;
  name: string;
  /** 使う場所 */
  usedBy: string[];
  /** 現在の版（日付 + 連番） */
  version: string;
  changelog: Array<{ version: string; date: string; summary: string }>;
}

export const PROMPT_TEMPLATES: PromptTemplateInfo[] = [
  {
    id: 'assistant',
    name: 'AI アシスタント（登録・照会・タスク編集）',
    usedBy: ['POST /api/ai/chat', 'Discord /risukerugg'],
    version: '2026.11.26-1',
    changelog: [
      { version: '2026.11.26-1', date: '2026-11-26', summary: 'コンテキストと案内文からタスクのコメントを削除' },
      { version: '2026.11.19-1', date: '2026-11-19', summary: 'コンテキストから「メンバーの予定」を削除' },
      { version: '2026.09.06-1', date: '2026-09-06', summary: 'チームからの追加指示（AI 設定）の注入と版管理を追加' },
      { version: '2026.09.05-1', date: '2026-09-05', summary: 'task_update の編集可能フィールド全面対応、コメント・カテゴリのコンテキスト追加' },
      { version: '2026.07-1', date: '2026-07-05', summary: '終日予定の排他的終了、複数提案の並列出力' },
    ],
  },
];

export function getPromptTemplate(id: string): PromptTemplateInfo | undefined {
  return PROMPT_TEMPLATES.find((p) => p.id === id);
}
