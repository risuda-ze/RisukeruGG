import { describe, it, expect } from 'vitest';
import { buildResponseRows, respondentNameResolver } from '@/lib/collab/responseRows';
import type { CollabComment, CollabParticipant } from '@/types/entities';

const participants: CollabParticipant[] = [
  { id: 'uid-taro', name: '配信太郎', type: 'member' },
  { id: 'ext_1', name: 'ゲスト.A', type: 'external' },
];

/* 添字 0 のほうが遅い日時（表示は日時の昇順になる） */
const proposedDates = [new Date('2026-12-05T20:00:00+09:00'), new Date('2026-12-03T20:00:00+09:00')];

function comment(id: string, authorId: string, text: string, iso: string): CollabComment {
  return { id, authorId, authorName: authorId, text, createdAt: new Date(iso) };
}

describe('respondentNameResolver', () => {
  it('参加者の id、または名前の記号を _ に置き換えたキーを名前に解決する', () => {
    const resolve = respondentNameResolver(participants);
    expect(resolve('uid-taro')).toBe('配信太郎');
    expect(resolve('ゲスト_A')).toBe('ゲスト.A');
  });

  it('どちらにも無いキーはそのまま返す（constructor などの語も名前にしない）', () => {
    const resolve = respondentNameResolver(participants);
    expect(resolve('飛び入り')).toBe('飛び入り');
    expect(resolve('constructor')).toBe('constructor');
  });
});

describe('buildResponseRows', () => {
  it('回答者が 1 人もいなければ空（AC-10）', () => {
    expect(buildResponseRows({ participants, proposedDates, participantResponses: {}, comments: [] })).toEqual([]);
  });

  it('回答者ごとに 1 行、回答者名の昇順。候補日程は日時の昇順（AC-9）', () => {
    const rows = buildResponseRows({
      participants,
      proposedDates,
      participantResponses: {
        'ゲスト_A': { '0': 'ok', '1': 'ng' },
        'uid-taro': { '0': 'pending', '1': 'ok' },
        'あいう': { '0': 'ok', '1': 'ok' },
      },
      comments: [],
    });
    const expectedOrder = ['あいう', 'ゲスト.A', '配信太郎'].sort((a, b) => a.localeCompare(b, 'ja'));
    expect(rows.map((r) => r.name)).toEqual(expectedOrder);
    const guest = rows.find((r) => r.key === 'ゲスト_A')!;
    expect(guest.answers.map((a) => [a.dateIndex, a.mark])).toEqual([
      [1, 'ng'],
      [0, 'ok'],
    ]);
    expect(guest.answers[0].date).toEqual(proposedDates[1]);
  });

  it('回答が無い候補日程と ok / ng / pending 以外の値は null（表示は「—」。AC-35・AC-38）', () => {
    const [row] = buildResponseRows({
      participants,
      proposedDates,
      participantResponses: { 'ゲスト_A': { '0': 'maybe' } },
      comments: [],
    });
    expect(row.answers.map((a) => a.mark)).toEqual([null, null]);
  });

  it('回答コメントは authorId が回答者のキーと一致するものだけを、古い順に並べる（AC-34・AC-35）', () => {
    const comments = [
      comment('resp_2', 'ゲスト_A', '二回目', '2026-11-26T12:00:00+09:00'),
      comment('team_1', 'uid-member', 'チーム内コメント', '2026-11-26T11:00:00+09:00'),
      comment('resp_1', 'ゲスト_A', '一回目', '2026-11-26T10:00:00+09:00'),
    ];
    const rows = buildResponseRows({
      participants,
      proposedDates,
      participantResponses: { 'ゲスト_A': { '0': 'ok' }, 'uid-taro': { '0': 'ok' } },
      comments,
    });
    expect(rows.find((r) => r.key === 'ゲスト_A')!.comments.map((c) => c.text)).toEqual(['一回目', '二回目']);
    expect(rows.find((r) => r.key === 'uid-taro')!.comments).toEqual([]);
    expect(rows.flatMap((r) => r.comments).some((c) => c.id === 'team_1')).toBe(false);
    /* 入力の配列は並べ替えない */
    expect(comments.map((c) => c.id)).toEqual(['resp_2', 'team_1', 'resp_1']);
  });

  it('同じ回答者・同じ本文の回答コメント 2 件は、まとめずに 2 件とも返す（AC-38）', () => {
    const [row] = buildResponseRows({
      participants,
      proposedDates,
      participantResponses: { 'ゲスト_A': { '0': 'ok' } },
      comments: [
        comment('resp_1', 'ゲスト_A', '同じ本文', '2026-11-26T10:00:00+09:00'),
        comment('resp_2', 'ゲスト_A', '同じ本文', '2026-11-26T10:00:01+09:00'),
      ],
    });
    expect(row.comments.map((c) => c.id)).toEqual(['resp_1', 'resp_2']);
  });
});
