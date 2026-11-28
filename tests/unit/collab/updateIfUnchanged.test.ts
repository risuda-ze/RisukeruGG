// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/* CO-032: 候補日程・回答を書く保存は、updatedAt が開いた時点と同じときだけ書く */

const fs = vi.hoisted(() => ({
  current: undefined as { updatedAt?: { toDate: () => Date } } | undefined,
  update: vi.fn(),
}));

vi.mock('@/lib/firebase/client', () => ({ db: {}, functions: {}, requireUid: () => 'u_me' }));
vi.mock('firebase/functions', () => ({ httpsCallable: () => vi.fn() }));
vi.mock('firebase/firestore', () => ({
  doc: () => ({}),
  collection: () => ({}),
  addDoc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  onSnapshot: vi.fn(),
  serverTimestamp: () => 'SERVER_TS',
  Timestamp: class {},
  runTransaction: async (_db: unknown, fn: (tx: unknown) => Promise<void>) =>
    fn({
      get: async () => ({ exists: () => fs.current !== undefined, data: () => fs.current }),
      update: fs.update,
    }),
}));

import { updateCollabSessionIfUnchanged } from '@/lib/repositories/collabs';

const OPENED = new Date('2026-11-28T10:00:00.000Z');
const ts = (d: Date) => ({ toDate: () => d });

describe('updateCollabSessionIfUnchanged', () => {
  beforeEach(() => fs.update.mockClear());

  it('開いた時点から更新されていなければ書く', async () => {
    fs.current = { updatedAt: ts(OPENED) };
    await updateCollabSessionIfUnchanged('t1', 's1', { proposedDates: [] }, OPENED, 'u_me');
    expect(fs.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ proposedDates: [], updatedBy: 'u_me', updatedAt: 'SERVER_TS' })
    );
  });

  it('開いた後に回答が届いて updatedAt が変わっていれば書かずに CONFLICT', async () => {
    fs.current = { updatedAt: ts(new Date('2026-11-28T10:05:00.000Z')) };
    await expect(
      updateCollabSessionIfUnchanged('t1', 's1', { proposedDates: [] }, OPENED, 'u_me')
    ).rejects.toThrow('CONFLICT');
    expect(fs.update).not.toHaveBeenCalled();
  });

  it('updatedAt の無い古い文書は、開いた時点にも無ければ書く', async () => {
    fs.current = {};
    await updateCollabSessionIfUnchanged('t1', 's1', { proposedDates: [] }, undefined, 'u_me');
    expect(fs.update).toHaveBeenCalled();
  });

  it('開いた時点に updatedAt が無く、今はあれば CONFLICT', async () => {
    fs.current = { updatedAt: ts(OPENED) };
    await expect(
      updateCollabSessionIfUnchanged('t1', 's1', { proposedDates: [] }, undefined, 'u_me')
    ).rejects.toThrow('CONFLICT');
  });

  it('文書が無ければ書かない', async () => {
    fs.current = undefined;
    await expect(
      updateCollabSessionIfUnchanged('t1', 's1', { proposedDates: [] }, OPENED, 'u_me')
    ).rejects.toThrow('コラボが見つかりません');
    expect(fs.update).not.toHaveBeenCalled();
  });
});
