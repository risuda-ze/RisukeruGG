import { describe, it, expect } from 'vitest';

type Response = 'ok' | 'ng' | 'maybe' | 'pending';

interface TallyResult {
  ok: number;
  maybe: number;
  ng: number;
  pending: number;
  total: number;
}

/**
 * 候補日時ごとの回答集計
 * @param participantResponses - 参加者UID → 日付インデックス → 回答のネストマップ
 * @param dateIndex - 集計対象の日付インデックス（文字列キー）
 * @param participantCount - 参加者総数（未回答の pending 数を算出に使用）
 */
function tallyForDate(
  participantResponses: Record<string, Record<string, Response>>,
  dateIndex: string,
  participantCount: number
): TallyResult {
  let ok = 0, maybe = 0, ng = 0, responded = 0;

  for (const responses of Object.values(participantResponses)) {
    const r = responses[dateIndex];
    if (!r || r === 'pending') continue;
    responded++;
    if (r === 'ok') ok++;
    else if (r === 'maybe') maybe++;
    else if (r === 'ng') ng++;
  }

  const pending = participantCount - responded;
  return { ok, maybe, ng, pending, total: participantCount };
}

/**
 * 最適日時を選出: ok + maybe が最も多い日付
 * 同点の場合は ok 数が多い方、さらに同点なら pending が少ない方を優先
 */
function findBestDate(
  participantResponses: Record<string, Record<string, Response>>,
  dateCount: number,
  participantCount: number
): number | null {
  if (dateCount === 0) return null;

  let best: number | null = null;
  let bestScore = -1;
  let bestOk = -1;
  let bestPending = Infinity;

  for (let i = 0; i < dateCount; i++) {
    const t = tallyForDate(participantResponses, i.toString(), participantCount);
    const score = t.ok + t.maybe;
    if (
      score > bestScore ||
      (score === bestScore && t.ok > bestOk) ||
      (score === bestScore && t.ok === bestOk && t.pending < bestPending)
    ) {
      best = i;
      bestScore = score;
      bestOk = t.ok;
      bestPending = t.pending;
    }
  }
  return best;
}

describe('候補日時集計ロジック', () => {
  describe('tallyForDate', () => {
    it('全員 ok の場合', () => {
      const responses = {
        user1: { '0': 'ok' as Response },
        user2: { '0': 'ok' as Response },
      };
      expect(tallyForDate(responses, '0', 2)).toEqual({ ok: 2, maybe: 0, ng: 0, pending: 0, total: 2 });
    });

    it('混合回答の場合', () => {
      const responses = {
        user1: { '0': 'ok' as Response },
        user2: { '0': 'maybe' as Response },
        user3: { '0': 'ng' as Response },
      };
      expect(tallyForDate(responses, '0', 3)).toEqual({ ok: 1, maybe: 1, ng: 1, pending: 0, total: 3 });
    });

    it('未回答者がいる場合 pending に計上される', () => {
      const responses = {
        user1: { '0': 'ok' as Response },
      };
      expect(tallyForDate(responses, '0', 3)).toEqual({ ok: 1, maybe: 0, ng: 0, pending: 2, total: 3 });
    });

    it('参加者がいない候補日（空レスポンス）', () => {
      expect(tallyForDate({}, '0', 0)).toEqual({ ok: 0, maybe: 0, ng: 0, pending: 0, total: 0 });
    });

    it('対象日付インデックスが存在しない参加者はスキップ', () => {
      const responses = {
        user1: { '1': 'ok' as Response },  // 日付 '0' へは未回答
      };
      expect(tallyForDate(responses, '0', 1)).toEqual({ ok: 0, maybe: 0, ng: 0, pending: 1, total: 1 });
    });
  });

  describe('findBestDate', () => {
    it('ok が最多の日付を選出する', () => {
      const responses = {
        user1: { '0': 'ng' as Response,  '1': 'ok' as Response },
        user2: { '0': 'ng' as Response,  '1': 'ok' as Response },
      };
      expect(findBestDate(responses, 2, 2)).toBe(1);
    });

    it('ok + maybe の合計で評価する', () => {
      const responses = {
        user1: { '0': 'ok' as Response,   '1': 'maybe' as Response },
        user2: { '0': 'maybe' as Response, '1': 'ng' as Response },
      };
      // 日付0: ok=1 maybe=1 → score=2
      // 日付1: ok=1 ng=1  → score=1
      expect(findBestDate(responses, 2, 2)).toBe(0);
    });

    it('スコアが同点の場合 ok 数が多い方を選出する', () => {
      const responses = {
        user1: { '0': 'ok' as Response,   '1': 'maybe' as Response },
        user2: { '0': 'maybe' as Response, '1': 'ok' as Response },
      };
      // 日付0: ok=1 maybe=1 score=2
      // 日付1: ok=1 maybe=1 score=2 (同点)
      // → ok 数が同じ、pending も同じ → 先に評価した 0 を返す
      expect(findBestDate(responses, 2, 2)).toBe(0);
    });

    it('候補日なしの場合 null を返す', () => {
      expect(findBestDate({}, 0, 2)).toBeNull();
    });

    it('全員 ng の場合でも候補日を返す（最大スコア日）', () => {
      const responses = {
        user1: { '0': 'ng' as Response, '1': 'ng' as Response },
      };
      expect(findBestDate(responses, 2, 1)).toBe(0);
    });
  });
});
