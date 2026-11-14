import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FirestoreError } from 'firebase/firestore';

type OnError = (err: FirestoreError) => void;
const handlers: { briefs?: OnError; steps?: OnError; playbooks?: OnError } = {};

vi.mock('@/lib/repositories/briefs', () => ({
  subscribeBriefs: (_teamId: string, _cb: unknown, onError: OnError) => {
    handlers.briefs = onError;
    return () => {};
  },
  subscribeTeamSteps: (_teamId: string, _cb: unknown, onError: OnError) => {
    handlers.steps = onError;
    return () => {};
  },
}));
vi.mock('@/lib/repositories/playbooks', () => ({
  subscribePlaybooks: (_teamId: string, _cb: unknown, onError: OnError) => {
    handlers.playbooks = onError;
    return () => {};
  },
}));

const { useBriefsStore, briefsLoadErrorMessage } = await import('@/stores/briefs');

function firestoreError(code: string): FirestoreError {
  return { code, message: code, name: 'FirebaseError' } as FirestoreError;
}

describe('useBriefsStore.subscribe', () => {
  beforeEach(() => {
    useBriefsStore.setState({ briefs: [], steps: [], playbooks: [], loading: true, error: null });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('購読が permission-denied で失敗したら loading を止めてエラーを出す（Issue #202）', () => {
    useBriefsStore.getState().subscribe('team-1');
    expect(useBriefsStore.getState().loading).toBe(true);

    handlers.briefs?.(firestoreError('permission-denied'));

    const state = useBriefsStore.getState();
    expect(state.loading).toBe(false);
    expect(state.error).toContain('権限');
  });

  it('工程の collectionGroup がインデックス未作成でも loading を止める', () => {
    useBriefsStore.getState().subscribe('team-1');
    handlers.steps?.(firestoreError('failed-precondition'));
    expect(useBriefsStore.getState().loading).toBe(false);
    expect(useBriefsStore.getState().error).toContain('インデックス');
  });

  it('再購読でエラーをリセットする', () => {
    useBriefsStore.getState().subscribe('team-1');
    handlers.playbooks?.(firestoreError('unavailable'));
    expect(useBriefsStore.getState().error).toContain('unavailable');
    useBriefsStore.getState().subscribe('team-2');
    expect(useBriefsStore.getState().error).toBeNull();
    expect(useBriefsStore.getState().loading).toBe(true);
  });
});

describe('briefsLoadErrorMessage', () => {
  it('未知のコードはコードを含めて返す', () => {
    expect(briefsLoadErrorMessage({ code: 'unavailable' })).toContain('unavailable');
  });
});
