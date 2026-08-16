import { create } from 'zustand';

// ── 型定義 ──────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

/** task_update 提案の部分更新フィールド（null は「値を外す」操作を表す） */
export interface TaskUpdateChanges {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  assigneeName?: string | null;
  columnName?: string;
  categoryName?: string | null;
}

export interface Proposal {
  type: 'schedule' | 'task' | 'collab' | 'task_update';
  /** task_update ではタイトルは changes 側にあるため省略可 */
  title?: string;
  // タスク更新用
  taskId?: string;
  changes?: TaskUpdateChanges;
  // スケジュール用
  startAt?: string;
  endAt?: string;
  description?: string;
  /** スケジュール参加者: メンバーの displayName リスト（登録時に userId に解決する） */
  participantNames?: string[];
  // タスク用
  dueDate?: string;
  /** タスク担当者: メンバーの displayName（登録時に userId に解決する） */
  assigneeName?: string;
  /** タスクを追加するカラム名（登録時に columnId に解決する） */
  columnName?: string;
  // コラボ調整用
  partnerName?: string;
  proposedDates?: string[];
}

export type ProposalStatus = 'pending' | 'loading' | 'done' | 'error';

// ── ストア定義 ───────────────────────────────────────────────────

interface AIChatStore {
  messages: ChatMessage[];
  isLoading: boolean;
  pendingProposals: Proposal[];
  proposalStatus: ProposalStatus;
  proposalMessageId: string | null;
  /** タスク詳細画面から「AIに相談」で遷移した際のピン留めタスクID */
  pinnedTaskId: string | null;

  // アクション
  addMessage: (msg: ChatMessage) => void;
  updateLastAssistantMessage: (id: string, chunk: string) => void;
  setIsLoading: (v: boolean) => void;
  setPendingProposals: (p: Proposal[]) => void;
  setProposalStatus: (s: ProposalStatus) => void;
  setProposalMessageId: (id: string | null) => void;
  setPinnedTaskId: (id: string | null) => void;
  clearMessages: () => void;
}

export const useAIChatStore = create<AIChatStore>((set) => ({
  messages: [],
  isLoading: false,
  pendingProposals: [],
  proposalStatus: 'pending',
  proposalMessageId: null,
  pinnedTaskId: null,

  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),

  // ストリーミングチャンクをアシスタントメッセージに追記する
  updateLastAssistantMessage: (id, chunk) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + chunk } : m
      ),
    })),

  setIsLoading: (v) => set({ isLoading: v }),
  setPendingProposals: (p) => set({ pendingProposals: p }),
  setProposalStatus: (s) => set({ proposalStatus: s }),
  setProposalMessageId: (id) => set({ proposalMessageId: id }),
  setPinnedTaskId: (id) => set({ pinnedTaskId: id }),

  // 「会話をリセット」ボタン用: 全状態を初期化
  clearMessages: () =>
    set({
      messages: [],
      isLoading: false,
      pendingProposals: [],
      proposalStatus: 'pending',
      proposalMessageId: null,
      pinnedTaskId: null,
    }),
}));
