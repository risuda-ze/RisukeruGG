import { z } from 'zod';

/**
 * AI 出力の %%PROPOSAL%% ブロックをパースするユーティリティ。
 * Web の chat/route.ts と Discord ボットの handleRisukerugg.ts の両方で共有する。
 * Zod スキーマで AI 出力の型・長さ・形式を厳密に検証する。
 */

const STR_MAX = 500;
const LONG_STR_MAX = 2000;
const ARRAY_MAX = 10;

// ─── Zod スキーマ ────────────────────────────────────────────

const ScheduleProposalSchema = z.object({
  type: z.literal('schedule'),
  title: z.string().min(1).max(STR_MAX),
  // AI（およびシステムプロンプトの例）はタイムゾーン無しのローカル日時
  // （例: 2026-07-11T00:00:00）を出力する。offset/local を許可しないと Zod 検証に
  // 失敗して %%PROPOSAL%% が無効化され、登録ボタンが出ず「登録した」と誤応答する原因になる。
  startAt: z
    .string()
    .datetime({ offset: true, local: true, message: 'startAt は ISO datetime 形式である必要があります' }),
  endAt: z
    .string()
    .datetime({ offset: true, local: true, message: 'endAt は ISO datetime 形式である必要があります' }),
  // 終日予定フラグ。省略時は false（時刻指定予定）として扱う。
  allDay: z.boolean().optional(),
  description: z.string().max(LONG_STR_MAX).optional(),
  participantNames: z.array(z.string().max(100)).max(ARRAY_MAX).optional(),
});

const TaskProposalSchema = z.object({
  type: z.literal('task'),
  title: z.string().min(1).max(STR_MAX),
  dueDate: z.string().date().optional(),
  description: z.string().max(LONG_STR_MAX).optional(),
  assigneeName: z.string().max(100).optional(),
  columnName: z.string().max(100).optional(),
});

// 既存タスクの部分更新提案。changes に含まれるフィールドのみ書き換える。
const TaskUpdateProposalSchema = z.object({
  type: z.literal('task_update'),
  // 対象タスクの ID（システムプロンプトの【タスク一覧】に記載された ID をそのまま使う）
  taskId: z.string().min(1).max(100),
  changes: z
    .object({
      title: z.string().min(1).max(STR_MAX).optional(),
      description: z.string().max(LONG_STR_MAX).optional(),
      dueDate: z.string().date().optional(),
      assigneeName: z.string().max(100).optional(),
      columnName: z.string().max(100).optional(),
    })
    .refine((c) => Object.values(c).some((v) => v !== undefined), {
      message: 'changes には少なくとも1つのフィールドが必要です',
    }),
});

const CollabProposalSchema = z.object({
  type: z.literal('collab'),
  title: z.string().min(1).max(STR_MAX),
  partnerName: z.string().min(1).max(100),
  proposedDates: z
    .array(
      z
        .string()
        .datetime({ offset: true, local: true, message: 'proposedDates の要素は ISO datetime 形式が必要です' })
    )
    .min(1)
    .max(ARRAY_MAX),
});

export const ProposalDataSchema = z.discriminatedUnion('type', [
  ScheduleProposalSchema,
  TaskProposalSchema,
  TaskUpdateProposalSchema,
  CollabProposalSchema,
]);

// ─── 型定義（スキーマから自動生成） ────────────────────────────

export type ScheduleProposal = z.infer<typeof ScheduleProposalSchema>;
export type TaskProposal = z.infer<typeof TaskProposalSchema>;
export type TaskUpdateProposal = z.infer<typeof TaskUpdateProposalSchema>;
export type CollabProposal = z.infer<typeof CollabProposalSchema>;
export type ProposalData = z.infer<typeof ProposalDataSchema>;

const PROPOSAL_REGEX = /%%PROPOSAL%%\s*([\s\S]*?)\s*%%\/PROPOSAL%%/g;

/**
 * テキストから %%PROPOSAL%% ブロックをすべて抽出してパースする。
 * Zod バリデーションに失敗したブロックはスキップする（不正なデータを無視）。
 */
export function extractProposals(text: string): ProposalData[] {
  const proposals: ProposalData[] = [];
  let match: RegExpExecArray | null;
  PROPOSAL_REGEX.lastIndex = 0;

  while ((match = PROPOSAL_REGEX.exec(text)) !== null) {
    try {
      const raw: unknown = JSON.parse(match[1]);
      const result = ProposalDataSchema.safeParse(raw);
      if (result.success) {
        proposals.push(result.data);
      }
    } catch {
      // JSON パース失敗はスキップ
    }
  }

  return proposals;
}

/** テキストに %%PROPOSAL%% ブロックが含まれるか確認する */
export function hasProposal(text: string): boolean {
  PROPOSAL_REGEX.lastIndex = 0;
  return PROPOSAL_REGEX.test(text);
}

/** テキストから %%PROPOSAL%% ブロックを除去したテキスト部分のみを返す */
export function stripProposalBlocks(text: string): string {
  return text.replace(/%%PROPOSAL%%[\s\S]*?%%\/PROPOSAL%%/g, '').trim();
}

/** 末尾にタイムゾーン指定（Z / +09:00 / +0900）を持つか */
const HAS_TIMEZONE_REGEX = /(?:[zZ]|[+-]\d{2}:?\d{2})$/;

/**
 * 提案の日時文字列を Date に変換する。
 *
 * AI（とシステムプロンプトの例）はタイムゾーンを付けず日本時間(JST)の壁時計時刻で
 * 日時を出力する（例: 2026-07-11T00:00:00）。これをサーバー（Vercel = UTC）で
 * `new Date()` に直接渡すと UTC として解釈され 9 時間ずれてしまう。
 * そのためタイムゾーン指定が無い場合は JST(+09:00) として解釈する。
 * 既に Z / オフセット付きの場合はその指定を尊重する。
 */
export function parseProposalDateTime(value: string): Date {
  return new Date(HAS_TIMEZONE_REGEX.test(value) ? value : `${value}+09:00`);
}
