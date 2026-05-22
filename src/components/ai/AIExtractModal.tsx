'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { useAIStore } from '@/stores/ai';
import { useAuthStore } from '@/stores/auth';
import { useTasksStore } from '@/stores/tasks';
import { createSchedule } from '@/lib/repositories/schedules';
import { createTask } from '@/lib/repositories/tasks';
import { createCollabSession } from '@/lib/repositories/collabs';

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

export function AIExtractModal() {
  const { extractOpen, closeExtract } = useAIStore();
  const { currentUser, currentTeamId } = useAuthStore();
  const { columns } = useTasksStore();

  const [step, setStep] = useState<'input' | 'review' | 'success'>('input');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<ExtractType>('schedule');
  const [scheduleData, setScheduleData] = useState<ScheduleData>({
    title: '',
    startAt: '',
    endAt: '',
    description: '',
  });
  const [taskData, setTaskData] = useState<TaskData>({
    title: '',
    description: '',
    dueDate: '',
  });
  const [collabData, setCollabData] = useState<CollabData>({
    title: '',
    partnerName: '',
    proposedDates: [''],
  });

  function handleClose() {
    closeExtract();
    setTimeout(() => {
      setStep('input');
      setText('');
      setError(null);
    }, 300);
  }

  async function handleExtract() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error('解析に失敗しました');

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
          proposedDates:
            data.collab.proposedDates?.length > 0
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

  return (
    <Modal
      open={extractOpen}
      onClose={handleClose}
      title={
        step === 'success'
          ? '登録完了！'
          : step === 'review'
            ? `AIが解析しました — ${TYPE_LABELS[type]}`
            : 'AIでテキストから登録'
      }
    >
      {step === 'input' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            チャットのコピペ・告知文・メモなど、何でも貼り付けてください。
            <br />
            AIがスケジュール・タスク・コラボのどれかに自動解析します。
          </p>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="例: 「6/20の20時から歌ってみたコラボやりたい。○○さんと調整中」"
            rows={7}
            className="w-full bg-bg border border-border text-text px-3.5 py-2.5 rounded-[12px] text-[14px] outline-none transition-colors focus:border-purple resize-none placeholder:text-muted/50"
          />

          {error && <p className="text-sm text-live">{error}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <Button variant="ghost" onClick={handleClose}>
              キャンセル
            </Button>
            <Button
              onClick={handleExtract}
              disabled={!text.trim() || loading}
              loading={loading}
            >
              <span className="material-icons text-[16px] mr-1">auto_awesome</span>
              解析する
            </Button>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="flex flex-col gap-4">
          {/* タイプ切り替え */}
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
                <span className="material-icons text-[14px]">{TYPE_ICONS[t]}</span>
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
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-muted">開始日時</label>
                <input
                  type="datetime-local"
                  value={scheduleData.startAt}
                  onChange={(e) => setScheduleData((d) => ({ ...d, startAt: e.target.value }))}
                  className="w-full bg-bg border border-border text-text px-3.5 py-2.5 rounded-[12px] text-[14px] outline-none transition-colors focus:border-purple"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-muted">終了日時</label>
                <input
                  type="datetime-local"
                  value={scheduleData.endAt}
                  onChange={(e) => setScheduleData((d) => ({ ...d, endAt: e.target.value }))}
                  className="w-full bg-bg border border-border text-text px-3.5 py-2.5 rounded-[12px] text-[14px] outline-none transition-colors focus:border-purple"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-muted">説明</label>
                <textarea
                  value={scheduleData.description}
                  onChange={(e) => setScheduleData((d) => ({ ...d, description: e.target.value }))}
                  rows={3}
                  className="w-full bg-bg border border-border text-text px-3.5 py-2.5 rounded-[12px] text-[14px] outline-none transition-colors focus:border-purple resize-none"
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
                  rows={3}
                  className="w-full bg-bg border border-border text-text px-3.5 py-2.5 rounded-[12px] text-[14px] outline-none transition-colors focus:border-purple resize-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-muted">締切日</label>
                <input
                  type="date"
                  value={taskData.dueDate}
                  onChange={(e) => setTaskData((d) => ({ ...d, dueDate: e.target.value }))}
                  className="w-full bg-bg border border-border text-text px-3.5 py-2.5 rounded-[12px] text-[14px] outline-none transition-colors focus:border-purple"
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
                        className="flex-1 bg-bg border border-border text-text px-3.5 py-2.5 rounded-[12px] text-[14px] outline-none transition-colors focus:border-purple"
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
                          className="text-muted hover:text-live text-sm px-1"
                        >
                          ✕
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
                      className="text-sm text-purple-l hover:text-purple transition-colors text-left"
                    >
                      + 候補日を追加
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-live">{error}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <Button variant="ghost" onClick={() => setStep('input')}>
              戻る
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              登録する
            </Button>
          </div>
        </div>
      )}

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
