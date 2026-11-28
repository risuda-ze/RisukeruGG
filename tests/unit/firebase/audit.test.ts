// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 共通フィールド（TE-018）のヘルパーと、それを通すクライアント側リポジトリの回帰テスト。
 * 列の並び替え・列やカテゴリの削除に伴う更新でも、最終更新者と最終更新日時が入ることを確かめる。
 */

const fs = vi.hoisted(() => ({
  updates: [] as { path: string; data: Record<string, unknown> }[],
  deletes: [] as string[],
  commits: 0,
  found: [] as string[],
}));

vi.mock('@/lib/firebase/client', () => ({ db: {}, functions: {}, requireUid: () => 'u_me' }));
vi.mock('firebase/functions', () => ({ httpsCallable: () => vi.fn(), getFunctions: () => ({}) }));
vi.mock('firebase/firestore', () => {
  const ref = (...segments: string[]) => ({ path: segments.join('/') });
  return {
    serverTimestamp: () => 'SERVER_TS',
    doc: (_db: unknown, ...segments: string[]) => ref(...segments),
    collection: (_db: unknown, ...segments: string[]) => ref(...segments),
    query: (col: { path: string }) => col,
    where: () => ({}),
    getDocs: async (col: { path: string }) => ({
      docs: fs.found.filter((p) => p.startsWith(`${col.path}/`)).map((path) => ({ ref: { path } })),
    }),
    writeBatch: () => ({
      update: (r: { path: string }, data: Record<string, unknown>) => fs.updates.push({ path: r.path, data }),
      delete: (r: { path: string }) => fs.deletes.push(r.path),
      commit: async () => {
        fs.commits += 1;
      },
    }),
    addDoc: vi.fn(),
    updateDoc: vi.fn(),
    onSnapshot: vi.fn(),
    Timestamp: class {},
  };
});

import { createdFields, updatedFields } from '@/lib/firebase/audit';
import * as adminAudit from '@/lib/firebase/auditAdmin';
import * as functionsAudit from '../../../functions/src/lib/audit';
import { deleteColumn, reorderColumns } from '@/lib/repositories/taskStatuses';
import { deleteCategory } from '@/lib/repositories/categories';
import type { TaskStatus } from '@/types/entities';

const UPDATED = { updatedBy: 'u_me', updatedAt: 'SERVER_TS' };

beforeEach(() => {
  fs.updates = [];
  fs.deletes = [];
  fs.commits = 0;
  fs.found = [];
});

describe('共通フィールドのヘルパー', () => {
  it('クライアント: 省略時はログイン中のユーザーを最終更新者にする', () => {
    expect(updatedFields()).toEqual(UPDATED);
    expect(createdFields()).toEqual({ createdBy: 'u_me', createdAt: 'SERVER_TS', ...UPDATED });
  });

  it('クライアント: 主体を渡すとその値を使う', () => {
    expect(createdFields('discord-bot')).toMatchObject({ createdBy: 'discord-bot', updatedBy: 'discord-bot' });
  });

  it.each([
    ['Admin SDK', adminAudit],
    ['Functions', functionsAudit],
  ])('%s: 作成時は 4 項目、更新時は 2 項目を返す', (_name, helper) => {
    expect(Object.keys(helper.updatedFields('u_a')).sort()).toEqual(['updatedAt', 'updatedBy']);
    expect(helper.updatedFields('u_a').updatedBy).toBe('u_a');
    const created = helper.createdFields('u_a');
    expect(Object.keys(created).sort()).toEqual(['createdAt', 'createdBy', 'updatedAt', 'updatedBy']);
    expect(created).toMatchObject({ createdBy: 'u_a', updatedBy: 'u_a' });
  });

  it('操作者がいない更新の主体は system、Discord 上の操作は discord-bot', () => {
    expect(functionsAudit.SYSTEM_ACTOR).toBe('system');
    expect(adminAudit.DISCORD_ACTOR).toBe('discord-bot');
  });
});

describe('付随する更新にも最終更新者を付ける', () => {
  it('reorderColumns: 並び替えた列に updatedBy / updatedAt が入る', async () => {
    await reorderColumns('t1', [
      { id: 'c1', order: 1 },
      { id: 'c2', order: 0 },
    ]);
    expect(fs.updates).toEqual([
      { path: 'teams/t1/taskStatuses/c1', data: { order: 1, ...UPDATED } },
      { path: 'teams/t1/taskStatuses/c2', data: { order: 0, ...UPDATED } },
    ]);
  });

  it('deleteColumn: 移行したタスクに updatedBy / updatedAt が入る', async () => {
    const columns = [{ id: 'c1' }, { id: 'c2' }] as TaskStatus[];
    await deleteColumn('t1', 'c1', columns, ['task1']);
    expect(fs.updates).toEqual([{ path: 'teams/t1/tasks/task1', data: { columnId: 'c2', ...UPDATED } }]);
    expect(fs.deletes).toEqual(['teams/t1/taskStatuses/c1']);
  });

  it('deleteCategory: カテゴリを外したタスクとスケジュールに updatedBy / updatedAt が入る', async () => {
    fs.found = ['teams/t1/tasks/task1', 'teams/t1/schedules/s1'];
    await deleteCategory('t1', 'cat1');
    expect(fs.updates).toEqual([
      { path: 'teams/t1/tasks/task1', data: { categoryId: null, ...UPDATED } },
      { path: 'teams/t1/schedules/s1', data: { categoryId: null, ...UPDATED } },
    ]);
  });
});
