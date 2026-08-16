import { describe, it, expect } from 'vitest';
import {
  extractProposals,
  hasProposal,
  parseProposalDateTime,
  type ScheduleProposal,
  type TaskUpdateProposal,
} from '@/lib/ai/parseProposal';

/** %%PROPOSAL%% ブロックを組み立てるヘルパー */
function wrap(json: string): string {
  return `じゃあこれでどう？\n\n%%PROPOSAL%%\n${json}\n%%/PROPOSAL%%\n\nこれで登録OK？`;
}

describe('extractProposals - スケジュール', () => {
  it('タイムゾーン無しのローカル日時（AIの実出力形式）を検証成功として抽出する', () => {
    // 実際にバグを踏んだ会話ログの JSON
    const text = wrap(
      '{"type":"schedule","title":"ショート撮影","startAt":"2026-07-11T00:00:00","endAt":"2026-07-12T00:00:00","description":"終日"}'
    );
    expect(hasProposal(text)).toBe(true);
    const proposals = extractProposals(text);
    expect(proposals).toHaveLength(1);
    expect(proposals[0]!.type).toBe('schedule');
    expect((proposals[0] as ScheduleProposal).title).toBe('ショート撮影');
  });

  it('Z 付き・オフセット付きの日時も受け付ける', () => {
    expect(
      extractProposals(
        wrap('{"type":"schedule","title":"A","startAt":"2026-07-11T00:00:00Z","endAt":"2026-07-11T01:00:00Z"}')
      )
    ).toHaveLength(1);
    expect(
      extractProposals(
        wrap(
          '{"type":"schedule","title":"B","startAt":"2026-07-11T09:00:00+09:00","endAt":"2026-07-11T10:00:00+09:00"}'
        )
      )
    ).toHaveLength(1);
  });

  it('allDay フラグを保持する', () => {
    const proposals = extractProposals(
      wrap(
        '{"type":"schedule","title":"終日イベント","startAt":"2026-07-11T00:00:00","endAt":"2026-07-12T00:00:00","allDay":true}'
      )
    );
    expect((proposals[0] as ScheduleProposal).allDay).toBe(true);
  });

  it('不正な日時（日付のみ）は検証失敗としてスキップする', () => {
    const proposals = extractProposals(
      wrap('{"type":"schedule","title":"X","startAt":"2026-07-11","endAt":"2026-07-12"}')
    );
    expect(proposals).toHaveLength(0);
  });
});

describe('extractProposals - タスク更新（task_update）', () => {
  it('taskId と changes を持つ更新提案を抽出する', () => {
    const proposals = extractProposals(
      wrap(
        '{"type":"task_update","taskId":"abc123","changes":{"description":"新しい詳細文","dueDate":"2026-08-25"}}'
      )
    );
    expect(proposals).toHaveLength(1);
    const p = proposals[0] as TaskUpdateProposal;
    expect(p.type).toBe('task_update');
    expect(p.taskId).toBe('abc123');
    expect(p.changes.description).toBe('新しい詳細文');
    expect(p.changes.dueDate).toBe('2026-08-25');
    expect(p.changes.title).toBeUndefined();
  });

  it('changes が空の場合は検証失敗としてスキップする', () => {
    expect(
      extractProposals(wrap('{"type":"task_update","taskId":"abc123","changes":{}}'))
    ).toHaveLength(0);
  });

  it('taskId が無い場合は検証失敗としてスキップする', () => {
    expect(
      extractProposals(wrap('{"type":"task_update","changes":{"title":"X"}}'))
    ).toHaveLength(0);
  });

  it('dueDate が日付形式でない場合は検証失敗としてスキップする', () => {
    expect(
      extractProposals(
        wrap('{"type":"task_update","taskId":"abc123","changes":{"dueDate":"来週"}}')
      )
    ).toHaveLength(0);
  });

  it('新規タスクと更新提案が混在するブロックを両方抽出する', () => {
    const text = [
      '%%PROPOSAL%%',
      '{"type":"task","title":"サムネ作成"}',
      '%%/PROPOSAL%%',
      '%%PROPOSAL%%',
      '{"type":"task_update","taskId":"abc123","changes":{"columnName":"完了"}}',
      '%%/PROPOSAL%%',
    ].join('\n');
    const proposals = extractProposals(text);
    expect(proposals).toHaveLength(2);
    expect(proposals[0]!.type).toBe('task');
    expect(proposals[1]!.type).toBe('task_update');
  });
});

describe('parseProposalDateTime - JST 解釈', () => {
  it('タイムゾーン無しは日本時間(+09:00)として解釈する', () => {
    // 7/11 00:00 JST = 7/10 15:00 UTC
    expect(parseProposalDateTime('2026-07-11T00:00:00').toISOString()).toBe(
      '2026-07-10T15:00:00.000Z'
    );
  });

  it('Z 指定はそのまま UTC として解釈する', () => {
    expect(parseProposalDateTime('2026-07-11T00:00:00Z').toISOString()).toBe(
      '2026-07-11T00:00:00.000Z'
    );
  });

  it('オフセット指定を尊重する', () => {
    expect(parseProposalDateTime('2026-07-11T09:00:00+09:00').toISOString()).toBe(
      '2026-07-11T00:00:00.000Z'
    );
  });

  it('終日予定の排他的終了（翌日00:00 JST）を正しく変換する', () => {
    // 7/12 00:00 JST = 7/11 15:00 UTC
    expect(parseProposalDateTime('2026-07-12T00:00:00').toISOString()).toBe(
      '2026-07-11T15:00:00.000Z'
    );
  });
});
