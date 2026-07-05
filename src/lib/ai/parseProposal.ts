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
  CollabProposalSchema,
]);

// ─── 型定義（スキーマから自動生成） ────────────────────────────

export type ScheduleProposal = z.infer<typeof ScheduleProposalSchema>;
export type TaskProposal = z.infer<typeof TaskProposalSchema>;
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
