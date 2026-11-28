// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

/**
 * タスクの購読は、この端末の書き込み直後（updatedAt の serverTimestamp が未確定）のスナップショットでも
 * 例外にならず、確定までは直前の確定値を、確定後は確定値を返す。
 * 列・カテゴリの削除に伴う付け替えや、ロックなしのタスク更新の直後に起きる。
 */

const fs = vi.hoisted(() => ({ listener: null as ((snap: unknown) => void) | null }));

vi.mock('@/lib/firebase/client', () => ({ db: {}, requireUid: () => 'u_me' }));
vi.mock('firebase/functions', () => ({ httpsCallable: () => vi.fn(), getFunctions: () => ({}) }));
vi.mock('firebase/firestore', () => ({
  collection: () => ({}),
  doc: () => ({}),
  onSnapshot: (_ref: unknown, listener: (snap: unknown) => void) => {
    fs.listener = listener;
    return () => {};
  },
  serverTimestamp: () => 'SERVER_TS',
  updateDoc: vi.fn(),
  runTransaction: vi.fn(),
  Timestamp: class {},
}));

import { subscribeTasksByTeam } from '@/lib/repositories/tasks';
import type { Task } from '@/types/entities';

const ts = (iso: string) => ({ toDate: () => new Date(iso) });
const CONFIRMED = '2026-11-01T00:00:00.000Z';
const RESOLVED = '2026-11-28T09:00:00.000Z';

/** Firestore のドキュメントの代役。pending は確定前で、既定の読み方では updatedAt が null になる */
function taskDoc(columnId: string, updatedAt: { pending: true } | { at: string }) {
  return {
    id: 'task1',
    data: (options?: { serverTimestamps?: string }) => ({
      title: 'タスク',
      columnId,
      createdBy: 'u_creator',
      createdAt: ts(CONFIRMED),
      updatedAt:
        'at' in updatedAt ? ts(updatedAt.at) : options?.serverTimestamps === 'previous' ? ts(CONFIRMED) : null,
    }),
  };
}
const snapshot = (doc: ReturnType<typeof taskDoc>, type: 'added' | 'modified') => ({
  docs: [doc],
  docChanges: () => [{ type, doc }],
});

describe('subscribeTasksByTeam', () => {
  it('updatedAt が未確定のスナップショットでも例外にならず、確定までは直前の確定値を返す', () => {
    const received: Task[][] = [];
    subscribeTasksByTeam('t1', (tasks) => received.push(tasks));

    fs.listener!(snapshot(taskDoc('c1', { at: CONFIRMED }), 'added'));
    // 列の削除に伴う付け替え直後: columnId は変わり、updatedAt はまだ確定していない
    expect(() => fs.listener!(snapshot(taskDoc('c2', { pending: true }), 'modified'))).not.toThrow();
    expect(received[1]![0]).toMatchObject({ columnId: 'c2', updatedAt: new Date(CONFIRMED) });

    // サーバーで確定すると確定値に置き換わる（楽観的ロックの比較に使う値）
    fs.listener!(snapshot(taskDoc('c2', { at: RESOLVED }), 'modified'));
    expect(received[2]![0]!.updatedAt).toEqual(new Date(RESOLVED));
  });
});
