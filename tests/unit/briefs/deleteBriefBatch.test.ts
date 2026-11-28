// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';

/**
 * ブリーフ削除は配下（工程・工程コメント・差分）ごと 1 回の commit で行う（PD-061）。
 * 途中まで消えた状態を作らないこと、commit の失敗を握りつぶさないことを確かめる。
 * 工程の削除も、その工程の工程コメントを同じ commit で消す（TE-023）。
 */

const TEAM = 't1';
const BRIEF = `teams/${TEAM}/briefs/b1`;
const TREE = [
  `${BRIEF}/steps/s1`,
  `${BRIEF}/steps/s1/comments/c1`,
  `${BRIEF}/steps/s1/comments/c2`,
  `${BRIEF}/steps/s2`,
  `${BRIEF}/briefEvents/e1`,
];

const fs = vi.hoisted(() => ({
  docs: [] as string[],
  batches: [] as { deletes: string[]; committed: boolean }[],
  commitError: null as Error | null,
}));

/** 指定パス直下のドキュメントだけを返す */
function children(colPath: string): string[] {
  return fs.docs.filter((p) => p.startsWith(`${colPath}/`) && !p.slice(colPath.length + 1).includes('/'));
}
function newBatch() {
  const batch = { deletes: [] as string[], committed: false };
  fs.batches.push(batch);
  return {
    delete: (r: { path: string }) => batch.deletes.push(r.path),
    update: () => {},
    set: () => {},
    commit: async () => {
      if (fs.commitError) throw fs.commitError;
      batch.committed = true;
    },
  };
}

vi.mock('@/lib/firebase/client', () => ({ db: {}, requireUid: () => 'u_me' }));
vi.mock('firebase/firestore', () => {
  const join = (first: unknown, rest: string[]) =>
    [(first as { path?: string }).path, ...rest].filter(Boolean).join('/');
  return {
    serverTimestamp: () => 'SERVER_TS',
    doc: (first: unknown, ...rest: string[]) => ({ path: join(first, rest) }),
    collection: (first: unknown, ...rest: string[]) => ({ path: join(first, rest) }),
    getDocs: async (col: { path: string }) => ({
      docs: children(col.path).map((path) => ({ id: path.split('/').pop(), ref: { path } })),
    }),
    writeBatch: () => newBatch(),
  };
});

import { firestoreBriefsPort } from '@/lib/repositories/briefs';
import { AdminBriefsPort } from '@/lib/repositories/briefsAdmin';
import type { BriefTransaction } from '@/lib/briefs/operations/port';

const deleteTx = {
  briefId: 'b1',
  actor: 'u_me',
  deleteBrief: true,
  stepCreates: [],
  stepPatches: [],
  stepDeletes: [],
  events: [],
} as unknown as BriefTransaction;

/** Admin SDK の最小限の代役（doc / collection.listDocuments / batch） */
function fakeAdminDb(): Firestore {
  const doc = (path: string): unknown => ({
    path,
    collection: (name: string) => ({
      doc: (id: string) => doc(`${path}/${name}/${id}`),
      listDocuments: async () => children(`${path}/${name}`).map(doc),
    }),
  });
  return { doc, batch: newBatch } as unknown as Firestore;
}

beforeEach(() => {
  fs.docs = [...TREE];
  fs.batches = [];
  fs.commitError = null;
});

describe.each([
  ['クライアント SDK', () => firestoreBriefsPort],
  ['Admin SDK', () => new AdminBriefsPort(fakeAdminDb())],
])('削除の commit（%s）', (_name, port) => {
  it('配下とブリーフ本体を 1 回の commit で削除する', async () => {
    await port().commit(TEAM, deleteTx);
    expect(fs.batches).toHaveLength(1);
    expect(fs.batches[0]!.committed).toBe(true);
    expect([...fs.batches[0]!.deletes].sort()).toEqual([BRIEF, ...TREE].sort());
  });

  it('1 回の commit の件数を分割しない（401 件以上でも 1 バッチ）', async () => {
    fs.docs = Array.from({ length: 600 }, (_, i) => `${BRIEF}/briefEvents/e${i}`);
    await port().commit(TEAM, deleteTx);
    expect(fs.batches).toHaveLength(1);
    expect(fs.batches[0]!.deletes).toHaveLength(601);
  });

  it('工程の削除はその工程の工程コメントも同じ commit で削除し、他の工程には触れない', async () => {
    await port().commit(TEAM, { ...deleteTx, deleteBrief: false, stepDeletes: ['s1'] });
    expect(fs.batches).toHaveLength(1);
    expect([...fs.batches[0]!.deletes].sort()).toEqual(
      [`${BRIEF}/steps/s1`, `${BRIEF}/steps/s1/comments/c1`, `${BRIEF}/steps/s1/comments/c2`].sort()
    );
  });

  it('commit が失敗したらエラーをそのまま返し、別の書き込みに切り替えない', async () => {
    fs.commitError = new Error('Request payload size exceeds the limit');
    await expect(port().commit(TEAM, deleteTx)).rejects.toThrow('Request payload size exceeds the limit');
    expect(fs.batches).toHaveLength(1);
  });
});
