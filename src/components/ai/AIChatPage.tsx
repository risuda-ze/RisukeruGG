'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAIChatStore } from '@/stores/aiChat';
import type { ChatMessage, Proposal, ProposalStatus } from '@/stores/aiChat';
import { useAuthStore } from '@/stores/auth';
import { useTasksStore } from '@/stores/tasks';
import { useScheduleStore } from '@/stores/schedule';
import { createSchedule } from '@/lib/repositories/schedules';
import { createTask } from '@/lib/repositories/tasks';
import { createCollabSession } from '@/lib/repositories/collabs';

// ── 定数 ───────────────────────────────────────────────────────

const PROPOSAL_REGEX = /%%PROPOSAL%%([\s\S]*?)%%\/PROPOSAL%%/;

/** ユーザーが確認の意思を示すパターン */
const CONFIRM_PATTERN =
  /^(ok|OK|おk|はい|いいよ|それで|うん|いいね|大丈夫|確定|登録して|お願い|yes|よし|そうして|おねがい)[\!！。\s]*$/i;

const TYPE_LABELS: Record<string, string> = {
  schedule: 'スケジュール',
  task: 'タスク',
  collab: 'コラボ調整',
};
const TYPE_ICONS: Record<string, string> = {
  schedule: 'event',
  task: 'task_alt',
  collab: 'handshake',
};
const TYPE_ROUTES: Record<string, string> = {
  schedule: '/schedule',
  task: '/tasks',
  collab: '/collabs',
};

/** 入力欄の例示チップ */
const EXAMPLE_CHIPS = [
  { label: '📅 配信告知', text: '来週の配信スケジュールを入れたい' },
  { label: '✅ タスク追加', text: '動画編集をタスクに追加して' },
  { label: '🤝 コラボ調整', text: 'コラボ配信の日程調整がしたい' },
];

// ── ヘルパー関数 ─────────────────────────────────────────────

function parseProposalFromContent(content: string): { text: string; proposal: Proposal | null } {
  const match = PROPOSAL_REGEX.exec(content);
  if (!match) return { text: content, proposal: null };
  try {
    const proposal = JSON.parse(match[1].trim()) as Proposal;
    const text = content.replace(PROPOSAL_REGEX, '').trim();
    return { text, proposal };
  } catch {
    return { text: content, proposal: null };
  }
}

function formatDateTimeDisplay(iso: string): string {
  try {
    return format(new Date(iso), 'M月d日(E) HH:mm', { locale: ja });
  } catch {
    return iso;
  }
}

// ── 提案カード ─────────────────────────────────────────────────

interface ProposalCardProps {
  proposal: Proposal;
  status: ProposalStatus;
  onConfirm: () => void;
  onReject: () => void;
}

function ProposalCard({ proposal, status, onConfirm, onReject }: ProposalCardProps) {
  return (
    <div className="mt-3 rounded-[14px] border border-purple/20 bg-purple/5 p-4 flex flex-col gap-2.5">
      {/* ヘッダー */}
      <div className="flex items-center gap-1.5">
        <span className="material-icons text-[16px] text-purple">{TYPE_ICONS[proposal.type]}</span>
        <span className="text-[12px] font-bold text-purple uppercase tracking-wide">
          {TYPE_LABELS[proposal.type]}
        </span>
      </div>

      {/* タイトル */}
      <p className="text-[15px] font-semibold text-text">{proposal.title}</p>

      {/* 詳細情報 */}
      <div className="flex flex-col gap-1">
        {proposal.type === 'schedule' && (
          <>
            {proposal.startAt && (
              <p className="text-[13px] text-muted">
                <span className="text-muted/60">開始: </span>
                {formatDateTimeDisplay(proposal.startAt)}
              </p>
            )}
            {proposal.endAt && (
              <p className="text-[13px] text-muted">
                <span className="text-muted/60">終了: </span>
                {formatDateTimeDisplay(proposal.endAt)}
              </p>
            )}
            {proposal.description && (
              <p className="text-[13px] text-muted">
                <span className="text-muted/60">メモ: </span>
                {proposal.description}
              </p>
            )}
          </>
        )}
        {proposal.type === 'task' && (
          <>
            {proposal.dueDate && (
              <p className="text-[13px] text-muted">
                <span className="text-muted/60">締切: </span>
                {proposal.dueDate}
              </p>
            )}
            {proposal.description && (
              <p className="text-[13px] text-muted">
                <span className="text-muted/60">説明: </span>
                {proposal.description}
              </p>
            )}
          </>
        )}
        {proposal.type === 'collab' && (
          <>
            {proposal.partnerName && (
              <p className="text-[13px] text-muted">
                <span className="text-muted/60">相手: </span>
                {proposal.partnerName}
              </p>
            )}
            {(proposal.proposedDates ?? []).length > 0 && (
              <div>
                <p className="text-[13px] text-muted/60">候補日:</p>
                {(proposal.proposedDates ?? []).slice(0, 4).map((d, i) => (
                  <p key={i} className="text-[13px] text-muted pl-2">
                    ・{formatDateTimeDisplay(d)}
                  </p>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* アクションボタン / 完了状態 */}
      {status === 'done' ? (
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 text-[13px] text-green-500">
            <span className="material-icons text-[16px]">check_circle</span>
            登録しました！
          </div>
          <Link
            href={TYPE_ROUTES[proposal.type]}
            className="text-[13px] text-purple-l hover:underline"
          >
            確認する →
          </Link>
        </div>
      ) : status === 'error' ? (
        <p className="text-[13px] text-live pt-1">登録に失敗しました。もう一度お試しください。</p>
      ) : (
        <div className="flex gap-2 pt-1">
          <button
            onClick={onConfirm}
            disabled={status === 'loading'}
            className="flex-1 h-9 rounded-full bg-purple text-white text-[13px] font-semibold transition-all hover:bg-purple-l disabled:opacity-60 flex items-center justify-center gap-1.5"
          >
            {status === 'loading' ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span className="material-icons text-[15px]">check</span>
                登録する
              </>
            )}
          </button>
          <button
            onClick={onReject}
            disabled={status === 'loading'}
            className="px-4 h-9 rounded-full border border-border text-[13px] text-muted transition-all hover:border-purple-l hover:text-purple-l disabled:opacity-60"
          >
            修正する
          </button>
        </div>
      )}
    </div>
  );
}

// ── メインコンポーネント ─────────────────────────────────────────

export function AIChatPage() {
  const router = useRouter();

  // Zustand ストアから状態取得（ページ遷移後も保持）
  const {
    messages,
    isLoading,
    pendingProposal,
    proposalStatus,
    proposalMessageId,
    addMessage,
    updateLastAssistantMessage,
    setIsLoading,
    setPendingProposal,
    setProposalStatus,
    setProposalMessageId,
    clearMessages,
  } = useAIChatStore();

  // アプリデータ
  const { members, currentUser, currentTeamId } = useAuthStore();
  const { tasks, columns } = useTasksStore();
  const { schedules } = useScheduleStore();

  // ローカル UI 状態
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  // stale closure 対策: messages と proposalMessageId の最新値を ref で保持
  const messagesRef = useRef<ChatMessage[]>([]);
  const proposalMessageIdRef = useRef<string | null>(null);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    proposalMessageIdRef.current = proposalMessageId;
  }, [proposalMessageId]);

  // メッセージ一覧の末尾に自動スクロール
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // textarea の自動伸縮
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  // チームコンテキスト構築
  const buildContext = useCallback(() => {
    return {
      tasks: tasks.map((t) => ({
        title: t.title,
        columnName: columns.find((c) => c.id === t.columnId)?.name ?? null,
        assigneeName: members.find((m) => m.userId === t.assigneeId)?.displayName ?? null,
        dueDate: t.dueDate ? format(t.dueDate, 'yyyy/MM/dd') : null,
      })),
      schedules: schedules.slice(0, 20).map((s) => ({
        title: s.title,
        startAt: format(s.startAt, 'yyyy/MM/dd HH:mm'),
        endAt: format(s.endAt, 'HH:mm'),
      })),
      collabs: [],
      members: members.map((m) => ({ displayName: m.displayName, role: m.role })),
    };
  }, [tasks, columns, schedules, members]);

  // ── ストリーミング完了後: アシスタントメッセージから提案を解析 ───────
  useEffect(() => {
    if (isLoading) return;
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    if (!lastAssistant) return;
    const { proposal } = parseProposalFromContent(lastAssistant.content);
    if (proposal && lastAssistant.id !== proposalMessageIdRef.current) {
      proposalMessageIdRef.current = lastAssistant.id;
      setProposalMessageId(lastAssistant.id);
      setPendingProposal(proposal);
      setProposalStatus('pending');
    }
  }, [isLoading, messages, setProposalMessageId, setPendingProposal, setProposalStatus]);

  // ── APIへのメッセージ送信（ストリーミング）─────────────────────
  async function sendMessage(text: string) {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text };
    const assistantMsg: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: '' };

    addMessage(userMsg);
    addMessage(assistantMsg);
    setIsLoading(true);
    setError(null);

    try {
      // messagesRef で常に最新の会話履歴を参照（stale closure 対策）
      const apiMessages = [...messagesRef.current, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, context: buildContext() }),
      });

      if (!res.ok || !res.body) throw new Error('APIエラー');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        updateLastAssistantMessage(assistantMsg.id, chunk);
      }
    } catch {
      setError('エラーが発生しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  }

  // ── Firestore への登録実行 ────────────────────────────────────
  async function handleRegister() {
    if (!pendingProposal || !currentTeamId || !currentUser) return;
    setProposalStatus('loading');

    try {
      const p = pendingProposal;

      if (p.type === 'schedule') {
        await createSchedule(currentTeamId, {
          title: p.title,
          categoryId: null,
          startAt: new Date(p.startAt ?? ''),
          endAt: new Date(p.endAt ?? ''),
          description: p.description ?? '',
          participantIds: [],
          collabPartnerName: null,
          linkedTaskIds: [],
          createdBy: currentUser.uid,
          allDay: false,
        });
      } else if (p.type === 'task') {
        const firstColumn = columns[0];
        if (!firstColumn) throw new Error('カラムが見つかりません');
        await createTask({
          teamId: currentTeamId,
          title: p.title,
          columnId: firstColumn.id,
          categoryId: null,
          assigneeId: null,
          dueDate: p.dueDate ? new Date(p.dueDate).toISOString() : null,
          linkedScheduleId: null,
        });
      } else if (p.type === 'collab') {
        await createCollabSession({
          teamId: currentTeamId,
          title: p.title,
          partnerName: p.partnerName ?? '',
          proposedDates: (p.proposedDates ?? []).map((d) => new Date(d).toISOString()),
          expiresInDays: 7,
        });
      }

      setProposalStatus('done');
      // 登録成功メッセージをチャットに追加
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `登録したよ！「${p.title}」を${TYPE_LABELS[p.type]}に追加したよ 🎉 他にも何かあれば気軽に話しかけてね！`,
      });
    } catch {
      setProposalStatus('error');
    }
  }

  // ── 提案を修正する ───────────────────────────────────────────
  function handleReject() {
    proposalMessageIdRef.current = null;
    setProposalMessageId(null);
    setPendingProposal(null);
    setProposalStatus('pending');
    addMessage({
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'わかった！どこを修正したい？教えてね。',
    });
  }

  // ── フォーム送信 ─────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading || proposalStatus === 'loading') return;

    // 確認パターン + 提案中 → ユーザーメッセージを追加してそのまま登録実行
    if (CONFIRM_PATTERN.test(trimmed) && pendingProposal && proposalStatus === 'pending') {
      addMessage({ id: crypto.randomUUID(), role: 'user', content: trimmed });
      setInput('');
      handleRegister();
      return;
    }

    setInput('');
    sendMessage(trimmed);
  }

  // ── textarea キー操作（Enter送信 / Shift+Enter改行）──────────
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  // ── メッセージ内容のレンダリング ─────────────────────────────
  function renderMessageContent(msg: ChatMessage) {
    const { text, proposal } = parseProposalFromContent(msg.content);
    const isActiveProposal = msg.id === proposalMessageId;

    return (
      <>
        {/* %%PROPOSAL%% ブロックを除いたテキスト */}
        {(proposal ? text : msg.content) && (
          <span className="whitespace-pre-wrap">{proposal ? text : msg.content}</span>
        )}
        {/* アクティブな提案カードをインライン描画 */}
        {isActiveProposal && proposal && (
          <ProposalCard
            proposal={proposal}
            status={proposalStatus}
            onConfirm={handleRegister}
            onReject={handleReject}
          />
        )}
      </>
    );
  }

  const hasMessages = messages.length > 0;

  // ── レンダリング ──────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-bg">
      {/* ── TopBar ──────────────────────────────────────────── */}
      <header className="h-14 shrink-0 bg-surface border-b border-border flex items-center px-4 gap-3">
        {/* 戻るボタン（モバイルのみ） */}
        <button
          onClick={() => router.back()}
          className="md:hidden w-9 h-9 flex items-center justify-center rounded-full text-muted hover:text-text hover:bg-bg transition-colors"
          aria-label="戻る"
        >
          <span className="material-icons text-[22px]">arrow_back</span>
        </button>

        {/* アイコン + タイトル */}
        <div className="flex items-center gap-2 flex-1">
          <div className="w-7 h-7 rounded-full bg-purple/10 flex items-center justify-center shrink-0">
            <span className="material-icons text-[16px] text-purple">auto_awesome</span>
          </div>
          <span className="text-[16px] font-bold text-text">AIに相談</span>
        </div>

        {/* 会話リセットボタン（メッセージがあるときのみ表示） */}
        {hasMessages && (
          <button
            onClick={clearMessages}
            aria-label="会話をリセット"
            className="w-9 h-9 flex items-center justify-center rounded-full text-muted hover:text-text hover:bg-bg transition-colors"
          >
            <span className="material-icons text-[20px]">delete_outline</span>
          </button>
        )}
      </header>

      {/* ── メインエリア ──────────────────────────────────────── */}
      {hasMessages ? (
        /* 会話中: メッセージ一覧 + 下部固定入力欄 */
        <>
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {/* AIアバター（左側） */}
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-purple/10 flex items-center justify-center shrink-0 mr-2 mt-1">
                    <span className="material-icons text-[14px] text-purple">auto_awesome</span>
                  </div>
                )}

                <div
                  className={`max-w-[80%] px-4 py-3 rounded-[18px] text-[14px] leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-purple text-white rounded-br-[4px]'
                      : 'bg-surface text-text rounded-bl-[4px] border border-border'
                  }`}
                >
                  {/* タイピングインジケーター */}
                  {m.content === '' && m.role === 'assistant' ? (
                    <div className="flex gap-1.5 py-0.5">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-2 h-2 bg-muted rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  ) : (
                    renderMessageContent(m)
                  )}
                </div>
              </div>
            ))}

            {error && <p className="text-[13px] text-live text-center">{error}</p>}
            <div ref={bottomRef} />
          </div>

          {/* 下部固定入力欄 */}
          <div className="shrink-0 border-t border-border bg-surface px-4 py-3">
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder={
                  pendingProposal && proposalStatus === 'pending'
                    ? '「OK」で登録、修正内容も話せます'
                    : 'メッセージを入力...'
                }
                disabled={isLoading || proposalStatus === 'loading'}
                className="flex-1 bg-bg border border-border text-text text-[14px] px-4 py-2.5 rounded-[14px] outline-none transition-colors focus:border-purple placeholder:text-muted/50 disabled:opacity-50 resize-none overflow-hidden max-h-[120px]"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading || proposalStatus === 'loading'}
                className="w-10 h-10 shrink-0 rounded-full bg-purple text-white flex items-center justify-center transition-all disabled:opacity-40 hover:bg-purple-l"
              >
                <span className="material-icons text-[20px]">send</span>
              </button>
            </form>
            <p className="text-[11px] text-muted/50 text-center mt-1.5">
              Enter で送信 · Shift+Enter で改行
            </p>
          </div>
        </>
      ) : (
        /* 空の状態: 入力欄を画面中央に配置（ChatGPT風） */
        <div className="flex-1 flex flex-col items-center justify-center px-4 gap-6">
          {/* ウェルカムメッセージ */}
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-purple/10 flex items-center justify-center mx-auto mb-3">
              <span className="material-icons text-[28px] text-purple">auto_awesome</span>
            </div>
            <h2 className="text-[18px] font-bold text-text">AIアシスタント</h2>
            <p className="text-[13px] text-muted mt-1">
              スケジュールやタスクの登録、チームデータへの質問ができます
            </p>
          </div>

          {/* 入力エリア */}
          <div className="w-full max-w-[600px] flex flex-col gap-3">
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="メッセージを入力..."
                disabled={isLoading}
                className="flex-1 bg-surface border border-border text-text text-[14px] px-4 py-3 rounded-[14px] outline-none transition-colors focus:border-purple placeholder:text-muted/50 disabled:opacity-50 resize-none overflow-hidden max-h-[120px] shadow-sm"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="w-11 h-11 shrink-0 rounded-full bg-purple text-white flex items-center justify-center transition-all disabled:opacity-40 hover:bg-purple-l shadow-sm"
              >
                <span className="material-icons text-[20px]">send</span>
              </button>
            </form>

            {/* 例示チップ */}
            <div className="flex flex-wrap gap-2 justify-center">
              {EXAMPLE_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => sendMessage(chip.text)}
                  disabled={isLoading}
                  className="text-[12px] text-purple-l bg-purple/5 hover:bg-purple/10 px-3 py-1.5 rounded-full transition-colors border border-purple/10 disabled:opacity-50"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
