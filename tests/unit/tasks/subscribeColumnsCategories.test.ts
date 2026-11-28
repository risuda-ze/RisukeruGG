// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

/**
 * カンバン列・カテゴリの購読は、この端末で追加した直後（createdAt / updatedAt の serverTimestamp が未確定）の
 * スナップショットでも例外にならず、一覧に反映する。
 */

const fs = vi.hoisted(() => ({ listener: null as ((snap: unknown) => void) | null }));

vi.mock('@/lib/firebase/client', () => ({ db: {}, requireUid: () => 'u_me' }));
vi.mock('firebase/firestore', () => ({
  collection: () => ({}),
  doc: () => ({}),
  onSnapshot: (_ref: unknown, listener: (snap: unknown) => void) => {
    fs.listener = listener;
    return () => {};
  },
  serverTimestamp: () => 'SERVER_TS',
  Timestamp: class {},
}));

import { subscribeColumns } from '@/lib/repositories/taskStatuses';
import { subscribeCategories } from '@/lib/repositories/categories';

const ESTIMATE = '2026-11-28T09:00:00.000Z';

/** 追加直後のドキュメントの代役。既定の読み方では serverTimestamp の項目が null、estimate では推定値になる */
function pendingDoc(id: string, fields: Record<string, unknown>) {
  return {
    id,
    data: (options?: { serverTimestamps?: string }) => {
      const at = options?.serverTimestamps === 'estimate' ? { toDate: () => new Date(ESTIMATE) } : null;
      return { ...fields, createdBy: 'u_me', updatedBy: 'u_me', createdAt: at, updatedAt: at };
    },
  };
}

describe.each([
  { name: 'subscribeColumns', subscribe: subscribeColumns, fields: { name: '待機', order: 0, color: '#888' } },
  { name: 'subscribeCategories', subscribe: subscribeCategories, fields: { name: '雑談', order: 0, color: '#888' } },
])('$name', ({ subscribe, fields }) => {
  it('createdAt / updatedAt が未確定でも例外にならず、推定値で一覧に反映する', () => {
    const received: unknown[][] = [];
    subscribe('t1', (items: unknown[]) => received.push(items));

    expect(() => fs.listener!({ docs: [pendingDoc('new1', fields)] })).not.toThrow();
    expect(received[0]).toEqual([
      expect.objectContaining({ id: 'new1', createdAt: new Date(ESTIMATE), updatedAt: new Date(ESTIMATE) }),
    ]);
  });
});
