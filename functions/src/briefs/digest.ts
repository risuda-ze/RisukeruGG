import { diffCalendarDaysJst, formatDateJst, type SummaryBrief, type SummaryStep } from './summary';

/**
 * 朝ダイジェストとリマインドの本文生成（純粋関数。I/O なし・ユニットテスト対象）。
 */

export interface DigestEvent {
  type: string;
  briefId: string;
  stepKey: string | null;
  before: unknown;
  after: unknown;
  createdAt: Date;
}

export interface DigestInput {
  briefs: SummaryBrief[];
  /** 未完了・未アーカイブのブリーフに属する全工程 */
  steps: Array<SummaryStep & { briefId: string }>;
  /** 直近 24 時間の差分 */
  events: DigestEvent[];
  memberLabel: (uid: string | null) => string;
  briefUrl: (briefId: string) => string;
  now: Date;
}

export interface DigestSection {
  title: string;
  lines: string[];
}

function briefTitle(briefs: SummaryBrief[], briefId: string): string {
  return briefs.find((b) => b.id === briefId)?.title ?? 'ブリーフ';
}

function isOpen(s: SummaryStep): boolean {
  return s.status === 'ready' || s.status === 'in_progress';
}

/** ダイジェストの各節を組み立てる。該当なしの節は含めない */
export function buildDigestSections(input: DigestInput): DigestSection[] {
  const { briefs, steps, events, memberLabel, now } = input;
  const line = (s: SummaryStep & { briefId: string }, extra = '') =>
    `・${briefTitle(briefs, s.briefId)} › ${s.title} — ${s.assigneeId ? memberLabel(s.assigneeId) : '担当未定'}${extra}`;

  const today = steps.filter((s) => isOpen(s) && s.dueDate && diffCalendarDaysJst(now, s.dueDate) === 0);
  const overdue = steps
    .filter((s) => isOpen(s) && s.dueDate && diffCalendarDaysJst(now, s.dueDate) < 0)
    .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime());
  const unassigned = steps.filter((s) => isOpen(s) && !s.assigneeId);
  const blocked = steps.filter((s) => isOpen(s) && s.missingLabels.length > 0);

  const sections: DigestSection[] = [];
  if (today.length > 0) sections.push({ title: '📅 今日が締切', lines: today.map((s) => line(s)) });
  if (overdue.length > 0) {
    sections.push({
      title: '⚠️ 締切を過ぎています',
      lines: overdue.map((s) => line(s, `（${-diffCalendarDaysJst(now, s.dueDate!)}日超過）`)),
    });
  }
  if (unassigned.length > 0) sections.push({ title: '👤 担当が決まっていません', lines: unassigned.map((s) => line(s)) });
  if (blocked.length > 0) {
    sections.push({
      title: '✍️ 入力待ち',
      lines: blocked.map((s) => line(s, `（${s.missingLabels.join('、')}）`)),
    });
  }

  const changes = summarizeEvents(events, briefs);
  if (changes.length > 0) sections.push({ title: '🕘 昨日からの変更', lines: changes });

  return sections;
}

/** 直近の差分を人が読める行にまとめる（多すぎる場合は件数に丸める） */
export function summarizeEvents(events: DigestEvent[], briefs: SummaryBrief[]): string[] {
  const lines: string[] = [];
  const done = events.filter((e) => e.type === 'step.status_changed' && e.after === 'done');
  const publishMoved = events.filter((e) => e.type === 'brief.publishAt_changed');
  const assigned = events.filter((e) => e.type === 'step.assignee_changed');
  const created = events.filter((e) => e.type === 'brief.created');

  for (const e of created) lines.push(`・新しいブリーフ「${briefTitle(briefs, e.briefId)}」`);
  for (const e of publishMoved) {
    const after = e.after instanceof Date ? formatDateJst(e.after) : '未設定';
    lines.push(`・「${briefTitle(briefs, e.briefId)}」の公開予定日が ${after} に変更`);
  }
  if (done.length > 0) {
    const byBrief = new Map<string, number>();
    for (const e of done) byBrief.set(e.briefId, (byBrief.get(e.briefId) ?? 0) + 1);
    for (const [briefId, n] of byBrief) lines.push(`・「${briefTitle(briefs, briefId)}」で ${n} 工程が完了`);
  }
  if (assigned.length > 0) lines.push(`・担当の変更 ${assigned.length} 件`);
  return lines;
}

/** ダイジェスト本文。該当なしなら null（投稿しない） */
export function buildDigestMessage(input: DigestInput): string | null {
  const sections = buildDigestSections(input);
  if (sections.length === 0) return null;
  const header = `☀️ **今日のブリーフ**（${formatDateJst(input.now)}）`;
  const body = sections.map((s) => [`**${s.title}**`, ...s.lines].join('\n')).join('\n\n');
  const text = `${header}\n\n${body}`;
  return text.length > 1990 ? `${text.slice(0, 1987)}…` : text;
}

/** 締切 N 日前のリマインド対象（reminderDaysBefore と一致する工程） */
export function selectReminderTargets<T extends SummaryStep & { reminderDaysBefore: number }>(
  steps: T[],
  now: Date
): T[] {
  return steps.filter(
    (s) => isOpen(s) && s.dueDate !== null && diffCalendarDaysJst(now, s.dueDate) === s.reminderDaysBefore
  );
}

/** リマインド本文 */
export function buildReminderMessage(step: SummaryStep, assigneeMention: string, briefUrl: string, daysBefore: number): string {
  const when = daysBefore === 0 ? '今日' : `${daysBefore}日後`;
  return `⏰ ${assigneeMention} **【${step.title}】** の締切は ${formatDateJst(step.dueDate)}（${when}）です\n🔗 ${briefUrl}?step=${step.id}`;
}
