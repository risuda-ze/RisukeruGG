import { describe, expect, it } from 'vitest';
import {
  buildBriefSummary,
  buildStepClosedMessage,
  buildStepReadyMessage,
  diffCalendarDaysJst,
  type SummaryStep,
} from '../../../functions/src/briefs/summary';
import {
  buildDigestMessage,
  buildDigestSections,
  selectReminderTargets,
  summarizeEvents,
} from '../../../functions/src/briefs/digest';

/**
 * Discord 表示の純粋関数（functions/src/briefs/summary.ts, digest.ts）のテスト。
 * 日付は JST の暦日で判定する。
 */

const now = new Date('2026-09-06T00:00:00+09:00');

function step(
  overrides: Partial<SummaryStep> & { id: string; title: string; reminderDaysBefore?: number }
): SummaryStep & { briefId: string; reminderDaysBefore: number } {
  return {
    key: overrides.id,
    order: 0,
    status: 'ready',
    assigneeId: null,
    dueDate: null,
    missingLabels: [],
    optional: false,
    briefId: 'b1',
    reminderDaysBefore: 1,
    ...overrides,
  };
}

const memberLabel = (uid: string | null) => (uid === 'u1' ? '<@111>' : uid === 'u2' ? 'さとう' : '担当未定');

describe('diffCalendarDaysJst', () => {
  it('JST の暦日で差を取る（UTC 日付境界をまたいでも正しい）', () => {
    // 2026-09-06 23:30 JST と 2026-09-07 00:30 JST は 1 日差
    expect(diffCalendarDaysJst(new Date('2026-09-06T23:30:00+09:00'), new Date('2026-09-07T00:30:00+09:00'))).toBe(1);
    expect(diffCalendarDaysJst(now, new Date('2026-09-04T12:00:00+09:00'))).toBe(-2);
  });
});

describe('buildBriefSummary', () => {
  it('タイトル・公開日・進捗・工程行・URL を含み、超過と入力待ちを示す', () => {
    const text = buildBriefSummary({
      brief: { id: 'b1', title: '第10回', publishAt: new Date('2026-09-20T00:00:00+09:00'), status: 'in_progress' },
      steps: [
        step({ id: 's1', title: '構成確認', status: 'done', assigneeId: 'u1', order: 0 }),
        step({ id: 's2', title: '編集', status: 'ready', assigneeId: 'u2', dueDate: new Date('2026-09-04T00:00:00+09:00'), missingLabels: ['素材の場所'], order: 1 }),
        step({ id: 's3', title: 'サムネ', status: 'waiting', order: 2 }),
      ],
      memberLabel,
      briefUrl: 'https://app/briefs/b1',
      now,
    });
    expect(text).toContain('📋 **第10回**（進行中）');
    expect(text).toContain('進捗 1/3');
    expect(text).toContain('✅ 構成確認 — <@111>');
    expect(text).toContain('🟦 編集 — さとう');
    expect(text).toContain('2日超過');
    expect(text).toContain('入力待ち（素材の場所）');
    expect(text).toContain('⬜ サムネ — 担当未定');
    expect(text).toContain('https://app/briefs/b1');
    expect(text.length).toBeLessThanOrEqual(2000);
  });
});

describe('buildStepReadyMessage / buildStepClosedMessage', () => {
  it('完了・着手・Web のボタンを持ち、custom_id にチーム・ブリーフ・工程 ID を含む', () => {
    const msg = buildStepReadyMessage({
      teamId: 't1',
      briefId: 'b1',
      step: step({ id: 's2', title: '編集', dueDate: new Date('2026-09-17T00:00:00+09:00'), missingLabels: ['素材の場所'] }),
      assigneeMention: '<@111>',
      briefUrl: 'https://app/briefs/b1',
      unresolvedHint: false,
    });
    expect(msg.content).toContain('【編集】** <@111> 着手できます');
    expect(msg.content).toContain('素材の場所（未入力）');
    const buttons = msg.components[0]!.components;
    expect(buttons.map((b) => b.custom_id ?? b.url)).toEqual([
      'step_done:t1:b1:s2',
      'step_start:t1:b1:s2',
      'https://app/briefs/b1?step=s2',
    ]);
  });

  it('未解決メンションには案内を一度添える。閉じたメッセージはボタンなし', () => {
    const msg = buildStepReadyMessage({
      teamId: 't1',
      briefId: 'b1',
      step: step({ id: 's2', title: '編集' }),
      assigneeMention: 'さとう',
      briefUrl: 'https://app/briefs/b1',
      unresolvedHint: true,
    });
    expect(msg.content).toContain('Discord ユーザー名を登録');
    const closed = buildStepClosedMessage(step({ id: 's2', title: '編集', status: 'done' }));
    expect(closed.content).toContain('完了しました');
    expect(closed.components).toEqual([]);
  });
});

describe('ダイジェスト', () => {
  const briefs = [{ id: 'b1', title: '第10回', publishAt: null, status: 'in_progress' as const }];
  const steps = [
    step({ id: 's1', title: '今日の工程', dueDate: new Date('2026-09-06T00:00:00+09:00'), assigneeId: 'u1' }),
    step({ id: 's2', title: '遅れた工程', dueDate: new Date('2026-09-03T00:00:00+09:00'), assigneeId: 'u2' }),
    step({ id: 's3', title: '担当未定の工程' }),
    step({ id: 's4', title: '入力待ちの工程', assigneeId: 'u1', missingLabels: ['文言案'] }),
    step({ id: 's5', title: '待機中', status: 'waiting', dueDate: new Date('2026-09-03T00:00:00+09:00') }),
    step({ id: 's6', title: '完了済み', status: 'done', dueDate: new Date('2026-09-03T00:00:00+09:00') }),
    step({ id: 's7', title: '明日リマインド', dueDate: new Date('2026-09-07T00:00:00+09:00'), assigneeId: 'u1', reminderDaysBefore: 1 }),
  ];

  it('今日締切・超過・担当未定・入力待ち・昨日からの変更の節を作る（待機・完了は対象外）', () => {
    const sections = buildDigestSections({
      briefs,
      steps,
      events: [
        { type: 'step.status_changed', briefId: 'b1', stepKey: 's1', before: 'ready', after: 'done', createdAt: now },
        { type: 'brief.publishAt_changed', briefId: 'b1', stepKey: null, before: null, after: new Date('2026-09-20T00:00:00+09:00'), createdAt: now },
      ],
      memberLabel,
      briefUrl: (id) => `https://app/briefs/${id}`,
      now,
    });
    expect(sections.map((s) => s.title)).toEqual([
      '📅 今日が締切',
      '⚠️ 締切を過ぎています',
      '👤 担当が決まっていません',
      '✍️ 入力待ち',
      '🕘 昨日からの変更',
    ]);
    expect(sections[1]!.lines[0]).toContain('3日超過');
    expect(sections[1]!.lines.some((l) => l.includes('待機中'))).toBe(false);
    expect(sections[4]!.lines).toContain('・「第10回」で 1 工程が完了');
  });

  it('該当なしなら本文は null', () => {
    expect(
      buildDigestMessage({ briefs, steps: [], events: [], memberLabel, briefUrl: (id) => id, now })
    ).toBeNull();
    expect(summarizeEvents([], briefs)).toEqual([]);
  });

  it('リマインド対象は締切の reminderDaysBefore 日前の未完了工程だけ', () => {
    expect(selectReminderTargets(steps, now).map((s) => s.id)).toEqual(['s7']);
  });
});
