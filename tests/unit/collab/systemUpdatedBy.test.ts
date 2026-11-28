// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 操作者がいないコラボの更新（定期実行の期限切れ・未認証の外部参加者の回答）は、
 * 最終更新者を 'system' として記録する（TE-018）。
 */

const state = vi.hoisted(() => ({
  updates: [] as { path: string; data: Record<string, unknown> }[],
}));

vi.mock('../../../functions/src/discord/notifyDiscord', () => ({ notifyDiscord: vi.fn(async () => {}) }));
vi.mock('../../../functions/src/lib/admin', () => {
  const record = (path: string) => (data: Record<string, unknown>) => {
    state.updates.push({ path, data });
  };
  const sessionPath = 'teams/t1/collabSessions/s1';
  return {
    db: {
      doc: (path: string) => ({
        get: async () => ({
          exists: true,
          data: () => ({
            status: 'open',
            title: 'コラボ',
            expiresAt: { toDate: () => new Date(Date.now() + 86_400_000) },
          }),
        }),
        update: async (data: Record<string, unknown>) => record(path)(data),
      }),
      collection: (path: string) =>
        path === 'teams'
          ? { get: async () => ({ docs: [{ id: 't1' }] }) }
          : {
              where: () => ({
                where: () => ({
                  get: async () => ({ empty: false, docs: [{ ref: { path: sessionPath } }] }),
                }),
              }),
            },
      batch: () => ({
        update: (ref: { path: string }, data: Record<string, unknown>) => record(ref.path)(data),
        commit: async () => {},
      }),
    },
  };
});

import { expireCollabSessions } from '../../../functions/src/collab/expireCollabSessions';
import { respondToCollab } from '../../../functions/src/collab/respondToCollab';

const SYSTEM = { updatedBy: 'system', updatedAt: expect.anything() };

beforeEach(() => {
  state.updates = [];
});

describe('操作者がいないコラボの更新', () => {
  it('期限切れの定期実行は updatedBy を system にする', async () => {
    await expireCollabSessions.run({} as never);
    expect(state.updates).toEqual([
      { path: 'teams/t1/collabSessions/s1', data: { status: 'expired', ...SYSTEM } },
    ]);
  });

  it('外部参加者の回答は updatedBy を system にする', async () => {
    const request = { data: { teamId: 't1', sessionId: 's1', respondentName: 'ゲスト', dates: { d1: 'ok' } } };
    await respondToCollab.run(request as never);
    expect(state.updates).toHaveLength(1);
    expect(state.updates[0]!.data).toMatchObject(SYSTEM);
  });
});
