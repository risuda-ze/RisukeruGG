/**
 * ブリーフの Discord 表示（純粋関数。I/O なし・ユニットテスト対象）。
 *
 * - 要約メッセージ: スレッド先頭に置き、状態が変わるたびに編集する「1枚紙の生きた写し」
 * - 着手可能通知: 工程が ready になったときに担当者へメンション付きで投稿し、ボタンで完了できる
 */

export type StepStatus = 'waiting' | 'ready' | 'in_progress' | 'done' | 'skipped';

/** 要約・通知の生成に必要な工程情報（Firestore の Step から必要分だけ） */
export interface SummaryStep {
  id: string;
  key: string;
  title: string;
  order: number;
  status: StepStatus;
  assigneeId: string | null;
  dueDate: Date | null;
  /** 必須項目のうち未入力のラベル */
  missingLabels: string[];
  optional: boolean;
}

export interface SummaryBrief {
  id: string;
  title: string;
  publishAt: Date | null;
  status: 'planning' | 'in_progress' | 'published' | 'archived';
}

export interface SummaryInput {
  brief: SummaryBrief;
  steps: SummaryStep[];
  /** UID → 表示名またはメンション文字列 */
  memberLabel: (uid: string | null) => string;
  briefUrl: string;
  now: Date;
}

const STATUS_ICON: Record<StepStatus, string> = {
  waiting: '⬜',
  ready: '🟦',
  in_progress: '🟨',
  done: '✅',
  skipped: '⏭️',
};

const STATUS_LABEL: Record<StepStatus, string> = {
  waiting: '待機',
  ready: '着手可能',
  in_progress: '作業中',
  done: '完了',
  skipped: 'スキップ',
};

const BRIEF_STATUS_LABEL = {
  planning: '準備中',
  in_progress: '進行中',
  published: '公開済み',
  archived: 'アーカイブ',
} as const;

/** JST の日付表示（M/D（曜）） */
export function formatDateJst(d: Date | null): string {
  if (!d) return '未設定';
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('month')}/${get('day')}（${get('weekday')}）`;
}

/** JST の暦日で日数差（b − a） */
export function diffCalendarDaysJst(a: Date, b: Date): number {
  const toJstDay = (d: Date) => Math.floor((d.getTime() + 9 * 60 * 60 * 1000) / 86_400_000);
  return toJstDay(b) - toJstDay(a);
}

function dueNote(step: SummaryStep, now: Date): string {
  if (!step.dueDate || step.status === 'done' || step.status === 'skipped') return '';
  const days = diffCalendarDaysJst(now, step.dueDate);
  if (days < 0) return ` ⚠️${-days}日超過`;
  if (days === 0) return ' ⚠️今日';
  return '';
}

/** 要約メッセージ本文（Discord の 2,000 文字制限内に収める） */
export function buildBriefSummary(input: SummaryInput): string {
  const { brief, steps, memberLabel, briefUrl, now } = input;
  const closed = steps.filter((s) => s.status === 'done' || s.status === 'skipped').length;
  const lines: string[] = [];
  lines.push(`📋 **${brief.title}**（${BRIEF_STATUS_LABEL[brief.status]}）`);
  lines.push(`公開予定: ${formatDateJst(brief.publishAt)} ・ 進捗 ${closed}/${steps.length}`);
  lines.push('');
  for (const s of [...steps].sort((a, b) => a.order - b.order)) {
    const who = s.assigneeId ? memberLabel(s.assigneeId) : '担当未定';
    const blocked = s.missingLabels.length > 0 && (s.status === 'ready' || s.status === 'in_progress');
    lines.push(
      `${STATUS_ICON[s.status]} ${s.title} — ${who} ・ ${formatDateJst(s.dueDate)}${dueNote(s, now)}${blocked ? ` ・ ✍️入力待ち（${s.missingLabels.join('、')}）` : ''}`
    );
  }
  lines.push('');
  lines.push(`🔗 ${briefUrl}`);
  const text = lines.join('\n');
  return text.length > 1990 ? `${text.slice(0, 1987)}…` : text;
}

export interface ReadyMessage {
  content: string;
  components: Array<{
    type: 1;
    components: Array<{
      type: 2;
      style: 1 | 2 | 3 | 4 | 5;
      label: string;
      custom_id?: string;
      url?: string;
      disabled?: boolean;
    }>;
  }>;
}

/** 着手可能通知（ボタン付き） */
export function buildStepReadyMessage(args: {
  teamId: string;
  briefId: string;
  step: SummaryStep;
  assigneeMention: string;
  briefUrl: string;
  /** メンション未解決のメンバーに一度だけ添える案内 */
  unresolvedHint: boolean;
}): ReadyMessage {
  const { teamId, briefId, step, assigneeMention, briefUrl, unresolvedHint } = args;
  const lines = [
    `🟦 **【${step.title}】** ${assigneeMention} 着手できます。締切 ${formatDateJst(step.dueDate)}`,
  ];
  if (step.missingLabels.length > 0) {
    lines.push(`✍️ 必要な情報: ${step.missingLabels.map((l) => `${l}（未入力）`).join('、')}`);
  }
  if (unresolvedHint) {
    lines.push('（個人設定で Discord ユーザー名を登録するとメンションで届きます）');
  }
  const id = `${teamId}:${briefId}:${step.id}`;
  return {
    content: lines.join('\n'),
    components: [
      {
        type: 1,
        components: [
          { type: 2, style: 3, label: '完了', custom_id: `step_done:${id}` },
          { type: 2, style: 2, label: '着手', custom_id: `step_start:${id}` },
          { type: 2, style: 5, label: 'Web で開く', url: `${briefUrl}?step=${step.id}` },
        ],
      },
    ],
  };
}

/** 完了・スキップ後に通知メッセージを書き換える（ボタンを外す） */
export function buildStepClosedMessage(step: SummaryStep): ReadyMessage {
  const label = step.status === 'skipped' ? '⏭️ スキップしました' : '✅ 完了しました';
  return {
    content: `${STATUS_ICON[step.status]} **【${step.title}】** ${label}（${STATUS_LABEL[step.status]}）`,
    components: [],
  };
}

/** 着手（作業中）に変わったときの表示（完了ボタンだけ残す） */
export function buildStepInProgressMessage(args: {
  teamId: string;
  briefId: string;
  step: SummaryStep;
  briefUrl: string;
}): ReadyMessage {
  const { teamId, briefId, step, briefUrl } = args;
  const id = `${teamId}:${briefId}:${step.id}`;
  return {
    content: `🟨 **【${step.title}】** 作業中。締切 ${formatDateJst(step.dueDate)}`,
    components: [
      {
        type: 1,
        components: [
          { type: 2, style: 3, label: '完了', custom_id: `step_done:${id}` },
          { type: 2, style: 5, label: 'Web で開く', url: `${briefUrl}?step=${step.id}` },
        ],
      },
    ],
  };
}
