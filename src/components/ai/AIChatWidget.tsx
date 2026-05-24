'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAIStore } from '@/stores/ai';
import { useAuthStore } from '@/stores/auth';
import { useTasksStore } from '@/stores/tasks';
import { useScheduleStore } from '@/stores/schedule';
import { createSchedule } from '@/lib/repositories/schedules';
import { createTask } from '@/lib/repositories/tasks';
import { createCollabSession } from '@/lib/repositories/collabs';

// ── 型定義 ──────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface Proposal {
  type: 'schedule' | 'task' | 'collab';
  title: string;
  // schedule
  startAt?: string;
  endAt?: string;
  description?: string;
  // task
  dueDate?: string;
  // collab
  partnerName?: string;
  proposedDates?: string[];
}

type ProposalStatus = 'pending' | 'loading' | 'done' | 'error';

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

const EXAMPLE_QUESTIONS = [
  '6月5日にコラボ配信の予定を入れたい',
  '今週のスケジュールを教えて',
  '未完了のタスクは何がある？',
];

// ── ヘルパー ────────────────────────────────────────────────────
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
  onClose: () => void;
}

function ProposalCard({ proposal, status, onConfirm, onReject, onClose }: ProposalCardProps) {
  return (
    <div className="mt-2 rounded-[12px] border border-purple/20 bg-purple/5 p-3 flex flex-col gap-2">
      {/* ヘッダー */}
      <div className="flex items-center gap-1.5">
        <span className="material-icons text-[14px] text-purple">{TYPE_ICONS[proposal.type]}</span>
        <span className="text-[11px] font-bold text-purple uppercase tracking-wide">
          {TYPE_LABELS[proposal.type]}
        </span>
      </div>

      {/* タイトル */}
      <p className="text-[13px] font-semibold text-text">{proposal.title}</p>

      {/* 詳細 */}
      <div className="flex flex-col gap-0.5">
        {proposal.type === 'schedule' && (
          <>
            {proposal.startAt && (
              <p className="text-[12px] text-muted">
                <span className="text-muted/60">開始: </span>
                {formatDateTimeDisplay(proposal.startAt)}
              </p>
            )}
            {proposal.endAt && (
              <p className="text-[12px] text-muted">
                <span className="text-muted/60">終了: </span>
                {formatDateTimeDisplay(proposal.endAt)}
              </p>
            )}
            {proposal.description && (
              <p className="text-[12px] text-muted">
                <span className="text-muted/60">メモ: </span>
                {proposal.description}
              </p>
            )}
          </>
        )}
        {proposal.type === 'task' && (
          <>
            {proposal.dueDate && (
              <p className="text-[12px] text-muted">
                <span className="text-muted/60">締切: </span>
                {proposal.dueDate}
              </p>
            )}
            {proposal.description && (
              <p className="text-[12px] text-muted">
                <span className="text-muted/60">説明: </span>
                {proposal.description}
              </p>
            )}
          </>
        )}
        {proposal.type === 'collab' && (
          <>
            {proposal.partnerName && (
              <p className="text-[12px] text-muted">
                <span className="text-muted/60">相手: </span>
                {proposal.partnerName}
              </p>
            )}
            {(proposal.proposedDates ?? []).length > 0 && (
              <div>
                <p className="text-[12px] text-muted/60">候補日:</p>
                {(proposal.proposedDates ?? []).slice(0, 4).map((d, i) => (
                  <p key={i} className="text-[12px] text-muted pl-2">
                    ・{formatDateTimeDisplay(d)}
                  </p>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* アクションボタン */}
      {status === 'done' ? (
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1 text-[12px] text-green-500">
            <span className="material-icons text-[14px]">check_circle</span>
            登録しました！
          </div>
          <Link
            href={TYPE_ROUTES[proposal.type]}
            onClick={onClose}
            className="text-[12px] text-purple-l hover:underline"
          >
            確認する →
          </Link>
        </div>
      ) : status === 'error' ? (
        <p className="text-[12px] text-live pt-1">登録に失敗しました。もう一度お試しください。</p>
      ) : (
        <div className="flex gap-2 pt-1">
          <button
            onClick={onConfirm}
            disabled={status === 'loading'}
            className="flex-1 h-8 rounded-full bg-purple text-white text-[12px] font-semibold transition-all hover:bg-purple-l disabled:opacity-60 flex items-center justify-center gap-1"
          >
            {status === 'loading' ? (
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span className="material-icons text-[13px]">check</span>
                登録する
              </>
            )}
          </button>
          <button
            onClick={onReject}
            disabled={status === 'loading'}
            className="px-3 h-8 rounded-full border border-border text-[12px] text-muted transition-all hover:border-purple-l hover:text-purple-l disabled:opacity-60"
          >
            修正する
          </button>
        </div>
      )}
    </div>
  );
}

// ── メインコンポーネント ─────────────────────────────────────────
export function AIChatWidget() {
  const { chatOpen, toggleChat, closeChat } = useAIStore();
  const { members, currentUser, currentTeamId } = useAuthStore();
  const { tasks, columns } = useTasksStore();
  const { schedules } = useScheduleStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 登録提案の状態
  const [pendingProposal, setPendingProposal] = useState<Proposal | null>(null);
  const [proposalStatus, setProposalStatus] = useState<ProposalStatus>('pending');
  const [proposalMessageId, setProposalMessageId] = useState<string | null>(null);
  // stale closure を防ぐため ref でも保持
  const proposalMessageIdRef = useRef<string | null>(null);

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

  // 自動スクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ストリーミング完了後: 最新アシスタントメッセージから提案を解析
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
  }, [isLoading, messages]);

  // ── APIへのメッセージ送信（ストリーミング）────────────────────
  async function sendMessage(text: string) {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text };
    const assistantMsg: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: '' };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // 全会話履歴を送信（マルチターン対応）
      const apiMessages = [...messages, userMsg].map((m) => ({
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
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id ? { ...m, content: m.content + chunk } : m
          )
        );
      }
    } catch {
      setError('エラーが発生しました。もう一度お試しください。');
      setMessages((prev) => prev.filter((m) => m.id !== assistantMsg.id));
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
      // 成功通知をチャットに追加
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `登録したよ！「${p.title}」を${TYPE_LABELS[p.type]}に追加したよ 🎉 他にも何かあれば気軽に話しかけてね！`,
        },
      ]);
    } catch {
      setProposalStatus('error');
    }
  }

  // ── 提案を修正する ───────────────────────────────────────────
  function handleReject() {
    // 提案カードを非表示にしてユーザーの入力を待つ
    proposalMessageIdRef.current = null;
    setProposalMessageId(null);
    setPendingProposal(null);
    setProposalStatus('pending');
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'わかった！どこを修正したい？教えてね。',
      },
    ]);
  }

  // ── フォーム送信 ─────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading || proposalStatus === 'loading') return;

    // 確認パターン + 提案中 → そのまま登録実行
    if (CONFIRM_PATTERN.test(trimmed) && pendingProposal && proposalStatus === 'pending') {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'user', content: trimmed },
      ]);
      setInput('');
      handleRegister();
      return;
    }

    sendMessage(trimmed);
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
        {/* アクティブな提案カード */}
        {isActiveProposal && proposal && (
          <ProposalCard
            proposal={proposal}
            status={proposalStatus}
            onConfirm={handleRegister}
            onReject={handleReject}
            onClose={closeChat}
          />
        )}
      </>
    );
  }

  // ── レンダリング ──────────────────────────────────────────────
  return (
    <>
      {/* フローティングボタン */}
      <button
        onClick={toggleChat}
        aria-label="AIアシスタント"
        className={`fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
          chatOpen ? 'bg-purple text-white' : 'bg-purple text-white hover:bg-purple-l'
        }`}
      >
        <span className="material-icons text-[24px]">
          {chatOpen ? 'close' : 'auto_awesome'}
        </span>
      </button>

      {/* チャットパネル */}
      {chatOpen && (
        <div className="fixed bottom-36 right-4 md:bottom-24 md:right-6 z-50 w-[calc(100vw-32px)] max-w-[380px] h-[520px] bg-surface border border-border rounded-[20px] shadow-2xl flex flex-col overflow-hidden">
          {/* ヘッダー */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <div className="w-8 h-8 rounded-full bg-purple/10 flex items-center justify-center shrink-0">
              <span className="material-icons text-[18px] text-purple">auto_awesome</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-text">AIアシスタント</p>
              <p className="text-[11px] text-muted">登録の相談・チームデータへの質問</p>
            </div>
            <button
              onClick={closeChat}
              className="w-8 h-8 flex items-center justify-center rounded-full text-muted hover:text-text hover:bg-bg transition-colors"
            >
              <span className="material-icons text-[18px]">close</span>
            </button>
          </div>

          {/* メッセージ一覧 */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
            {messages.length === 0 && (
              <div className="flex flex-col gap-2 mt-4">
                <p className="text-[12px] text-muted text-center">こんなことができます</p>
                <div className="flex flex-col gap-1.5">
                  {EXAMPLE_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-left text-[12px] text-purple-l bg-purple/5 hover:bg-purple/10 px-3 py-2 rounded-[10px] transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[88%] px-3 py-2 rounded-[14px] text-[13px] leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-purple text-white rounded-br-[4px]'
                      : 'bg-bg text-text rounded-bl-[4px] border border-border'
                  }`}
                >
                  {m.content === '' && m.role === 'assistant' ? (
                    /* タイピングインジケーター */
                    <div className="flex gap-1 py-1">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce"
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

            {error && <p className="text-[12px] text-live text-center">{error}</p>}
            <div ref={bottomRef} />
          </div>

          {/* 入力欄 */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 px-3 py-3 border-t border-border"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                pendingProposal && proposalStatus === 'pending'
                  ? '「OK」で登録、修正内容も話せます'
                  : 'メッセージを入力...'
              }
              disabled={isLoading || proposalStatus === 'loading'}
              className="flex-1 bg-bg border border-border text-text text-[13px] px-3 py-2 rounded-full outline-none transition-colors focus:border-purple placeholder:text-muted/50 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading || proposalStatus === 'loading'}
              className="w-9 h-9 rounded-full bg-purple text-white flex items-center justify-center transition-all disabled:opacity-40 hover:bg-purple-l"
            >
              <span className="material-icons text-[18px]">send</span>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
