'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { useAIStore } from '@/stores/ai';
import { useAuthStore } from '@/stores/auth';
import { useTasksStore } from '@/stores/tasks';
import { useScheduleStore } from '@/stores/schedule';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function AIChatWidget() {
  const { chatOpen, toggleChat, closeChat } = useAIStore();
  const { members } = useAuthStore();
  const { tasks, columns } = useTasksStore();
  const { schedules } = useScheduleStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // チームコンテキスト（チャットAPIに渡す）
  const buildContext = useCallback(() => {
    const tasksWithInfo = tasks.map((t) => ({
      title: t.title,
      columnName: columns.find((c) => c.id === t.columnId)?.name ?? null,
      assigneeName: members.find((m) => m.userId === t.assigneeId)?.displayName ?? null,
      dueDate: t.dueDate ? format(t.dueDate, 'yyyy/MM/dd') : null,
    }));

    const schedulesFormatted = schedules.slice(0, 20).map((s) => ({
      title: s.title,
      startAt: format(s.startAt, 'yyyy/MM/dd HH:mm'),
      endAt: format(s.endAt, 'HH:mm'),
    }));

    return {
      tasks: tasksWithInfo,
      schedules: schedulesFormatted,
      collabs: [],
      members: members.map((m) => ({ displayName: m.displayName, role: m.role })),
    };
  }, [tasks, columns, schedules, members]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text };
    const assistantMsg: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: '' };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleExampleClick(q: string) {
    setInput(q);
    sendMessage(q);
  }

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
        <div className="fixed bottom-36 right-4 md:bottom-24 md:right-6 z-50 w-[calc(100vw-32px)] max-w-[380px] h-[480px] bg-surface border border-border rounded-[20px] shadow-2xl flex flex-col overflow-hidden">
          {/* ヘッダー */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <div className="w-8 h-8 rounded-full bg-purple/10 flex items-center justify-center shrink-0">
              <span className="material-icons text-[18px] text-purple">auto_awesome</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-text">AIアシスタント</p>
              <p className="text-[11px] text-muted">チームのデータについて質問できます</p>
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
                <p className="text-[12px] text-muted text-center">こんな質問ができます</p>
                <div className="flex flex-col gap-1.5">
                  {EXAMPLE_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleExampleClick(q)}
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
                  className={`max-w-[85%] px-3 py-2 rounded-[14px] text-[13px] leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-purple text-white rounded-br-[4px]'
                      : 'bg-bg text-text rounded-bl-[4px] border border-border'
                  }`}
                >
                  {m.content || (
                    <div className="flex gap-1 py-1">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {error && (
              <p className="text-[12px] text-live text-center">{error}</p>
            )}

            <div ref={bottomRef} />
          </div>

          {/* 入力欄 */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-3 border-t border-border">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="質問を入力..."
              disabled={isLoading}
              className="flex-1 bg-bg border border-border text-text text-[13px] px-3 py-2 rounded-full outline-none transition-colors focus:border-purple placeholder:text-muted/50 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
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

const EXAMPLE_QUESTIONS = [
  '今週のスケジュールを教えて',
  '未完了のタスクは何がある？',
  'コラボ調整中のものは？',
];
