/**
 * AI 能力レジストリ（C-1 / AI-020）。
 *
 * 「AI に何ができるか」をコードで一か所に定義し、`/settings/ai` の一覧と一致させる。
 * 能力は利用者がプロンプトを名前で呼ぶものではなく、実行面ごとに次の方法で起動する:
 *   - web / discord: 入力欄は 1 つ。どの能力を使うかはモデルが選ぶ
 *   - embedded: 使う場面に置いたボタン・パネルから起動する
 *   - background: Scheduler / Firestore トリガーから起動する
 */

export type CapabilitySurface = 'web' | 'discord' | 'embedded' | 'background';

/** available = 提供中 / planned = 変更仕様で予定 / deferred = 見送り */
export type CapabilityStage = 'available' | 'planned' | 'deferred';

export interface AiCapability {
  id: string;
  name: string;
  description: string;
  surfaces: CapabilitySurface[];
  stage: CapabilityStage;
  /** 使うプロンプトテンプレート（prompts/manifest.ts の id）。なければ null */
  promptId: string | null;
  /** 変更仕様上の段階（例: C-2） */
  plannedIn?: string;
  /** 見送り・予定の補足 */
  note?: string;
}

export const AI_CAPABILITIES: AiCapability[] = [
  {
    id: 'register_from_text',
    name: '自然文から登録する',
    description: '「来週の配信を入れて」「サムネ作成をタスクに」などから、スケジュール・タスク・コラボ調整の登録提案を作る。登録は提案カード／ボタンで確認してから行う。',
    surfaces: ['web', 'discord'],
    stage: 'available',
    promptId: 'assistant',
  },
  {
    id: 'query_team_data',
    name: 'チームのデータに答える',
    description: '今日・今週・来週の予定、空き時間、タスクの進捗などをチームのデータから答える。',
    surfaces: ['web', 'discord'],
    stage: 'available',
    promptId: 'assistant',
  },
  {
    id: 'task_update',
    name: '既存タスクを編集する',
    description: 'タイトル・詳細・期限・担当・ステータス・カテゴリの変更を、変更前 → 変更後の差分付きで提案する。コメントや削除は扱わない。',
    surfaces: ['web', 'discord'],
    stage: 'available',
    promptId: 'assistant',
  },
  {
    id: 'playbook_elicitation',
    name: '進め方をいっしょに作る',
    description: '最初のブリーフを進めながら「まず何をしますか」「誰が」「公開の何日前までに」を聞き、答えを工程の構造に変換する。',
    surfaces: ['embedded'],
    stage: 'planned',
    promptId: null,
    plannedIn: 'C-2',
  },
  {
    id: 'playbook_learning',
    name: '運用から進め方の修正を提案する',
    description: '実際の順序・担当・日数・求められた情報・飛ばされた工程から、進め方の修正案を作る。検出は決定的に行い、AI は提案文の生成に使う。承認はメンバー。',
    surfaces: ['background'],
    stage: 'planned',
    promptId: null,
    plannedIn: 'C-3',
  },
  {
    id: 'report_interpretation',
    name: 'Discord の自由文を完了報告として解釈する',
    description: 'スレッド内の「編集終わりました」を工程完了の提案に変換する。',
    surfaces: ['discord'],
    stage: 'deferred',
    promptId: null,
    note: '完了報告はボタン運用のみとする決定（2026-09-06）により見送り。Message Content Intent が必要になるため。',
  },
];

export const SURFACE_LABELS: Record<CapabilitySurface, string> = {
  web: 'Web チャット',
  discord: 'Discord',
  embedded: '画面内',
  background: 'バックグラウンド',
};

export const STAGE_LABELS: Record<CapabilityStage, string> = {
  available: '提供中',
  planned: '予定',
  deferred: '見送り',
};

export function getCapability(id: string): AiCapability | undefined {
  return AI_CAPABILITIES.find((c) => c.id === id);
}
