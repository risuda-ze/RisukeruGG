'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAIStore } from '@/stores/ai';
import { useAuthStore } from '@/stores/auth';
import { useTasksStore } from '@/stores/tasks';
import { createSchedule } from '@/lib/repositories/schedules';
import { createTask } from '@/lib/repositories/tasks';
import { createCollabSession } from '@/lib/repositories/collabs';

// ────────────────────────────────────────────────
// 型定義
// ────────────────────────────────────────────────
type ExtractType = 'schedule' | 'task' | 'collab';

interface ScheduleData {
  title: string;
  startAt: string;
  endAt: string;
  description: string;
}
interface TaskData {
  title: string;
  description: string;
  dueDate: string;
}
interface CollabData {
  title: string;
  partnerName: string;
  proposedDates: string[];
}

const TYPE_LABELS: Record<ExtractType, string> = {
  schedule: 'スケジュール',
  task: 'タスク',
  collab: 'コラボ調整',
};
const TYPE_ICONS: Record<ExtractType, string> = {
  schedule: 'event',
  task: 'task_alt',
  collab: 'handshake',
};

// ────────────────────────────────────────────────
// テンプレート定義
// ────────────────────────────────────────────────
interface Template {
  id: string;
  emoji: string;
  label: string;
  text: string;
}

const TEMPLATES: Template[] = [
  {
    id: 'stream-announce',
    emoji: '📅',
    label: '配信告知',
    text: '6月20日(土)21時より「マイクラ実況」を配信します！2時間くらいの予定です。よろしくお願いします🎮',
  },
  {
    id: 'collab-stream',
    emoji: '📅',
    label: 'コラボ配信',
    text: '○○さんとコラボ配信やります！6月25日(水)20時スタート予定、3時間くらいの見込みです。',
  },
  {
    id: 'recording',
    emoji: '🎬',
    label: '収録予定',
    text: '6月18日(火)14時〜17時で歌ってみたの収録を入れてます。スタジオ〇〇で3時間ブース予約済み。',
  },
  {
    id: 'task-thumbnail',
    emoji: '✅',
    label: 'タスク追加',
    text: 'サムネイル作成 ◆ 締切6月19日 ◆ 次回配信用のサムネをPhotoshopで仕上げる',
  },
  {
    id: 'task-edit',
    emoji: '✅',
    label: '動画編集',
    text: '動画編集 ◆ 締切6月22日 ◆ 先日収録した30分の歌ってみた動画をカット・ミックス・書き出し',
  },
  {
    id: 'collab-request',
    emoji: '🤝',
    label: 'コラボ打診',
    text: '○○さん、コラボしませんか？候補日は6/28(土)20時、6/29(日)15時、7/1(火)21時あたりで考えています。',
  },
];

// ────────────────────────────────────────────────
// コンポーネント本体
// ────────────────────────────────────────────────
export function AIExtractModal() {
  const { extractOpen, closeExtract } = useAIStore();
  const { currentUser, currentTeamId } = useAuthStore();
  const { columns } = useTasksStore();

  const [step, setStep] = useState<'input' | 'review' | 'success'>('input');
  const [text, setText] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<ExtractType>('schedule');
  const [scheduleData, setScheduleData] = useState<ScheduleData>({
    title: '', startAt: '', endAt: '', description: '',
  });
  const [taskData, setTaskData] = useState<TaskData>({
    title: '', description: '', dueDate: '',
  });
  const [collabData, setCollabData] = useState<CollabData>({
    title: '', partnerName: '', proposedDates: [''],
  });

  // ── テンプレート選択 ────────────────────────────
  function applyTemplate(tpl: Template) {
    setText(tpl.text);
    setSelectedTemplateId(tpl.id);
  }

  // ── モーダルを閉じる ────────────────────────────
  function handleClose() {
    closeExtract();
    setTimeout(() => {
      setStep('input');
      setText('');
      setSelectedTemplateId(null);
      setError(null);
    }, 300);
  }

  // ── Claude による解析 ────────────────────────────
  async function handleExtract() {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();

      setType(data.type);
      if (data.type === 'schedule' && data.schedule) {
        setScheduleData({
          title: data.schedule.title ?? '',
          startAt: toLocalDateTimeString(data.schedule.startAt),
          endAt: toLocalDateTimeString(data.schedule.endAt),
          description: data.schedule.description ?? '',
        });
      } else if (data.type === 'task' && data.task) {
        setTaskData({
          title: data.task.title ?? '',
          description: data.task.description ?? '',
          dueDate: data.task.dueDate ? data.task.dueDate.slice(0, 10) : '',
        });
      } else if (data.type === 'collab' && data.collab) {
        setCollabData({
          title: data.collab.title ?? '',
          partnerName: data.collab.partnerName ?? '',
          proposedDates: data.collab.proposedDates?.length > 0
            ? data.collab.proposedDates.map(toLocalDateTimeString)
            : [''],
        });
      }
      setStep('review');
    } catch {
      setError('テキストの解析に失敗しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  }

  // ── Firestore 登録 ────────────────────────────
  async function handleSubmit() {
    if (!currentTeamId || !currentUser) return;
    setSubmitting(true);
    setError(null);

    try {
      if (type === 'schedule') {
        await createSchedule(currentTeamId, {
          title: scheduleData.title,
          categoryId: null,
          startAt: new Date(scheduleData.startAt),
          endAt: new Date(scheduleData.endAt),
          description: scheduleData.description,
          participantIds: [],
          collabPartnerName: null,
          linkedTaskIds: [],
          createdBy: currentUser.uid,
          allDay: false,
        });
      } else if (type === 'task') {
        const firstColumn = columns[0];
        if (!firstColumn) throw new Error('カラムが見つかりません');
        await createTask({
          teamId: currentTeamId,
          title: taskData.title,
          columnId: firstColumn.id,
          categoryId: null,
          assigneeId: null,
          dueDate: taskData.dueDate ? new Date(taskData.dueDate).toISOString() : null,
          linkedScheduleId: null,
        });
      } else if (type === 'collab') {
        const validDates = collabData.proposedDates.filter((d) => d.trim());
        await createCollabSession({
          teamId: currentTeamId,
          title: collabData.title,
          partnerName: collabData.partnerName,
          proposedDates: validDates.map((d) => new Date(d).toISOString()),
          expiresInDays: 7,
        });
      }
      setStep('success');
    } catch {
      setError('登録に失敗しました。もう一度お試しください。');
    } finally {
      setSubmitting(false);
    }
  }

  // ── キーボード送信（Ctrl/Cmd + Enter）────────────
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleExtract();
    }
  }

  return (
    <Modal
      open={extractOpen}
      onClose={handleClose}
      size={step === 'input' ? 'xl' : 'md'}
    >
      {/* ══════════════════════════════════════
          STEP: input — 検索バー風 入力 UI
      ══════════════════════════════════════ */}
      {step === 'input' && (
        <div className="flex flex-col gap-4">

          {/* ── タイトル + 説明 ── */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="material-icons text-[20px] text-purple">auto_awesome</span>
              <h2 className="text-[16px] font-bold text-text tracking-tight">AIに相談</h2>
            </div>
            <p className="text-[12px] text-muted leading-relaxed pl-[28px]">
              告知文・チャットのコピペ・メモなど、思ったままに書いてください。
              AIがスケジュール・タスク・コラボのどれかに自動で整理します。
              <br />
              テンプレを選ぶと日付や名前を書き換えるだけで使えます。
            </p>
          </div>

          {/* ── テンプレート（常時表示） ── */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold text-muted/70 uppercase tracking-wide select-none">
              テンプレート
            </span>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => applyTemplate(tpl)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all ${
                    selectedTemplateId === tpl.id
                      ? 'border-purple bg-purple/10 text-purple-l'
                      : 'border-border text-muted hover:border-purple-l hover:text-purple-l hover:bg-purple/5'
                  }`}
                >
                  <span>{tpl.emoji}</span>
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── 検索バー風テキスト入力コンテナ ── */}
          <div
            className={`flex flex-col rounded-[16px] border bg-bg transition-colors ${
              loading ? 'border-purple/50' : 'border-border focus-within:border-purple'
            }`}
          >
            <textarea
              value={text}
              onChange={(e) => { setText(e.target.value); setSelectedTemplateId(null); }}
              onKeyDown={handleKeyDown}
              placeholder="ここにテキストを入力 または テンプレを選んで編集..."
              disabled={loading}
              rows={4}
              className="w-full bg-transparent text-text text-[14px] leading-relaxed px-4 pt-4 pb-2 outline-none resize-none placeholder:text-muted/40 disabled:opacity-60"
            />

            {/* 送信バー（文字数 + ボタン） */}
            <div className="flex items-center justify-between px-3 pb-3 pt-1">
              <span className="text-[11px] text-muted/50 select-none">
                {text.length > 0 ? `${text.length} 文字` : 'Ctrl+Enter でも送信'}
              </span>
              <button
                onClick={handleExtract}
                disabled={!text.trim() || loading}
                className={`flex items-center gap-1.5 h-8 px-4 rounded-full text-[13px] font-semibold transition-all ${
                  text.trim() && !loading
                    ? 'bg-purple text-white hover:bg-purple-l shadow-sm'
                    : 'bg-border/60 text-muted cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    解析中...
                  </>
                ) : (
                  <>
                    <span className="material-icons text-[15px]">auto_awesome</span>
                    解析する
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-[12px] text-live flex items-center gap-1">
              <span className="material-icons text-[14px]">error_outline</span>
              {error}
            </p>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════
          STEP: review — 解析結果 確認フォーム
      ══════════════════════════════════════ */}
      {step === 'review' && (
        <div className="flex flex-col gap-4">
          {/* ヘッダー */}
          <div className="flex items-center gap-2">
            <span className="material-icons text-[18px] text-purple">{TYPE_ICONS[type]}</span>
            <h2 className="text-[14px] font-semibold text-text">
              AIが解析しました —{' '}
              <span className="text-purple-l">{TYPE_LABELS[type]}</span>
            </h2>
          </div>

          {/* タイプ切り替えピル */}
          <div className="flex gap-2">
            {(['schedule', 'task', 'collab'] as ExtractType[]).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors border ${
                  type === t
                    ? 'bg-purple text-white border-purple'
                    : 'border-border text-muted hover:border-purple-l hover:text-purple-l'
                }`}
              >
                <span className="material-icons text-[13px]">{TYPE_ICONS[t]}</span>
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          {/* スケジュールフォーム */}
          {type === 'schedule' && (
            <div className="flex flex-col gap-3">
              <Input
                label="タイトル *"
                value={scheduleData.title}
                onChange={(e) => setScheduleData((d) => ({ ...d, title: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-muted">開始日時</label>
                  <input
                    type="datetime-local"
                    value={scheduleData.startAt}
                    onChange={(e) => setScheduleData((d) => ({ ...d, startAt: e.target.value }))}
                    className="w-full bg-bg border border-border text-text px-3 py-2 rounded-[10px] text-[13px] outline-none transition-colors focus:border-purple"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-muted">終了日時</label>
                  <input
                    type="datetime-local"
                    value={scheduleData.endAt}
                    onChange={(e) => setScheduleData((d) => ({ ...d, endAt: e.target.value }))}
                    className="w-full bg-bg border border-border text-text px-3 py-2 rounded-[10px] text-[13px] outline-none transition-colors focus:border-purple"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-muted">説明</label>
                <textarea
                  value={scheduleData.description}
                  onChange={(e) => setScheduleData((d) => ({ ...d, description: e.target.value }))}
                  rows={2}
                  className="w-full bg-bg border border-border text-text px-3 py-2 rounded-[10px] text-[13px] outline-none transition-colors focus:border-purple resize-none"
                />
              </div>
            </div>
          )}

          {/* タスクフォーム */}
          {type === 'task' && (
            <div className="flex flex-col gap-3">
              <Input
                label="タイトル *"
                value={taskData.title}
                onChange={(e) => setTaskData((d) => ({ ...d, title: e.target.value }))}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-muted">説明</label>
                <textarea
                  value={taskData.description ?? ''}
                  onChange={(e) => setTaskData((d) => ({ ...d, description: e.target.value }))}
                  rows={2}
                  className="w-full bg-bg border border-border text-text px-3 py-2 rounded-[10px] text-[13px] outline-none transition-colors focus:border-purple resize-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-muted">締切日</label>
                <input
                  type="date"
                  value={taskData.dueDate}
                  onChange={(e) => setTaskData((d) => ({ ...d, dueDate: e.target.value }))}
                  className="w-full bg-bg border border-border text-text px-3 py-2 rounded-[10px] text-[13px] outline-none transition-colors focus:border-purple"
                />
              </div>
            </div>
          )}

          {/* コラボフォーム */}
          {type === 'collab' && (
            <div className="flex flex-col gap-3">
              <Input
                label="タイトル *"
                value={collabData.title}
                onChange={(e) => setCollabData((d) => ({ ...d, title: e.target.value }))}
              />
              <Input
                label="コラボ相手名 *"
                value={collabData.partnerName}
                onChange={(e) => setCollabData((d) => ({ ...d, partnerName: e.target.value }))}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-muted">候補日程</label>
                <div className="flex flex-col gap-2">
                  {collabData.proposedDates.map((date, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        type="datetime-local"
                        value={date}
                        onChange={(e) =>
                          setCollabData((d) => ({
                            ...d,
                            proposedDates: d.proposedDates.map((v, idx) =>
                              idx === i ? e.target.value : v
                            ),
                          }))
                        }
                        className="flex-1 bg-bg border border-border text-text px-3 py-2 rounded-[10px] text-[13px] outline-none transition-colors focus:border-purple"
                      />
                      {collabData.proposedDates.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setCollabData((d) => ({
                              ...d,
                              proposedDates: d.proposedDates.filter((_, idx) => idx !== i),
                            }))
                          }
                          className="text-muted hover:text-live transition-colors"
                        >
                          <span className="material-icons text-[18px]">close</span>
                        </button>
                      )}
                    </div>
                  ))}
                  {collabData.proposedDates.length < 5 && (
                    <button
                      type="button"
                      onClick={() =>
                        setCollabData((d) => ({
                          ...d,
                          proposedDates: [...d.proposedDates, ''],
                        }))
                      }
                      className="text-[12px] text-purple-l hover:text-purple transition-colors text-left"
                    >
                      + 候補日を追加
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="text-[12px] text-live flex items-center gap-1">
              <span className="material-icons text-[14px]">error_outline</span>
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <Button variant="ghost" onClick={() => setStep('input')}>
              ← 戻る
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              登録する
            </Button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          STEP: success — 登録完了
      ══════════════════════════════════════ */}
      {step === 'success' && (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-16 h-16 rounded-full bg-purple/10 flex items-center justify-center">
            <span className="material-icons text-[32px] text-purple">check_circle</span>
          </div>
          <p className="text-text font-semibold text-center">
            {TYPE_LABELS[type]}を登録しました！
          </p>
          <p className="text-muted text-sm text-center">
            {type === 'schedule' && 'スケジュールページで確認できます。'}
            {type === 'task' && 'タスクページで確認できます。'}
            {type === 'collab' && 'コラボページで確認できます。'}
          </p>
          <Button onClick={handleClose} className="w-full">
            閉じる
          </Button>
        </div>
      )}
    </Modal>
  );
}

/** ISO文字列 → datetime-local の input value 形式 (YYYY-MM-DDTHH:mm) */
function toLocalDateTimeString(iso: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return format(d, "yyyy-MM-dd'T'HH:mm");
  } catch {
    return '';
  }
}
