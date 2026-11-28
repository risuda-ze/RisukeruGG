import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * leaveTeam / leaveSpecificTeam のトランザクションが、読み取りを書き込みより前に行うことの回帰テスト。
 * Admin SDK は書き込みの後の tx.get を
 * 「Firestore transactions require all reads to be executed before all writes.」で拒否する。
 * その制約を再現した tx を渡し、関数が最後まで通ることを確かめる。
 */

const UID = 'u1';
const TEAM = 'teamAlpha';

const state = vi.hoisted(() => ({
  role: 'staff',
  user: {} as Record<string, unknown>,
  members: [] as { id: string; role: string }[],
  updates: [] as { path: string; data: Record<string, unknown> }[],
}));

vi.mock('../../../functions/src/unavailability/cleanup', () => ({
  deleteUserUnavailability: vi.fn(async () => {}),
}));

vi.mock('../../../functions/src/lib/validateAuth', () => {
  const doc = (path: string) => ({
    path,
    get: async () => ({
      exists: true,
      data: () =>
        path.includes('/members/') ? { role: state.role } : { teamCode: 'CODE0001' },
    }),
  });
  const db = {
    doc,
    collection: (path: string) => ({
      path,
      doc: () => ({ id: 'newSoloTeam', path: `${path}/newSoloTeam` }),
      where: () => ({ query: path }),
      get: async () => ({
        size: state.members.length,
        docs: state.members.map((m) => ({ id: m.id, data: () => ({ role: m.role }) })),
      }),
    }),
    runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      let wrote = false;
      const write = () => {
        wrote = true;
      };
      return fn({
        get: async () => {
          if (wrote) {
            throw new Error(
              'Firestore transactions require all reads to be executed before all writes.'
            );
          }
          return { docs: [{ ref: { path: `teams/${TEAM}/tasks/task1` } }] };
        },
        set: write,
        delete: write,
        update: (ref: { path: string }, data: Record<string, unknown>) => {
          write();
          state.updates.push({ path: ref.path, data });
        },
      });
    },
  };
  return {
    db,
    requireAuth: () => UID,
    getUserDoc: async () => state.user,
    getAuthContext: async () => ({ uid: UID, role: state.role }),
  };
});

import { leaveTeam } from '../../../functions/src/teams/leaveTeam';
import { leaveSpecificTeam } from '../../../functions/src/teams/leaveSpecificTeam';

// 担当外しは退出した本人による最終更新として記録する（TE-018）
const TASK_UNASSIGNED = {
  path: `teams/${TEAM}/tasks/task1`,
  data: { assigneeId: null, updatedBy: UID, updatedAt: expect.anything() },
};
// onCall の run は CallableRequest 全体を要求するが、関数が読むのは data だけ（認証はモック済み）
const request = (data: unknown) => ({ data }) as never;

beforeEach(() => {
  state.updates = [];
  state.user = {
    displayName: 'テスト',
    plan: 'light',
    currentTeamId: TEAM,
    teamIds: [TEAM, 'teamBeta'],
  };
  state.members = [
    { id: UID, role: 'member' },
    { id: 'u2', role: 'member' },
  ];
});

describe('退出トランザクションの読み取り順', () => {
  it('leaveTeam: スタッフが退出でき、担当タスクの担当者が外れる', async () => {
    state.role = 'staff';
    await expect(leaveTeam.run(request({}))).resolves.toMatchObject({ success: true });
    expect(state.updates).toContainEqual(TASK_UNASSIGNED);
  });

  it('leaveSpecificTeam: 他にメンバーがいるチームからメンバーが退出できる', async () => {
    state.role = 'member';
    await expect(leaveSpecificTeam.run(request({ teamId: TEAM }))).resolves.toEqual({
      success: true,
      newActiveTeamId: 'teamBeta',
    });
    expect(state.updates).toContainEqual(TASK_UNASSIGNED);
  });

  it('leaveSpecificTeam: スタッフが退出できる', async () => {
    state.role = 'staff';
    await expect(leaveSpecificTeam.run(request({ teamId: TEAM }))).resolves.toEqual({
      success: true,
      newActiveTeamId: 'teamBeta',
    });
    expect(state.updates).toContainEqual(TASK_UNASSIGNED);
  });
});
