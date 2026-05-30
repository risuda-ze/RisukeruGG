/**
 * AI 出力の %%PROPOSAL%% ブロックをパースするユーティリティ。
 * Web の chat/route.ts と Discord ボットの handleRisukerugg.ts の両方で共有する。
 */

/** スケジュール提案データ */
export interface ScheduleProposal {
  type: 'schedule';
  title: string;
  startAt: string;  // ISO datetime
  endAt: string;    // ISO datetime
  description?: string;
  participantNames?: string[];
}

/** タスク提案データ */
export interface TaskProposal {
  type: 'task';
  title: string;
  dueDate?: string;   // ISO date
  description?: string;
  assigneeName?: string;
  columnName?: string;
}

/** コラボ調整提案データ */
export interface CollabProposal {
  type: 'collab';
  title: string;
  partnerName: string;
  proposedDates: string[];  // ISO datetime[]
}

export type ProposalData = ScheduleProposal | TaskProposal | CollabProposal;

const PROPOSAL_REGEX = /%%PROPOSAL%%\s*([\s\S]*?)\s*%%\/PROPOSAL%%/g;

/**
 * テキストから %%PROPOSAL%% ブロックをすべて抽出してパースする。
 * パース失敗したブロックはスキップする。
 */
export function extractProposals(text: string): ProposalData[] {
  const proposals: ProposalData[] = [];
  let match: RegExpExecArray | null;
  PROPOSAL_REGEX.lastIndex = 0;

  while ((match = PROPOSAL_REGEX.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1]) as ProposalData;
      proposals.push(parsed);
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
