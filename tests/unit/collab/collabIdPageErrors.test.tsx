import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CollabSession } from '@/types/entities';

/* CO-031: コラボ詳細ページの確定・キャンセルの失敗を画面に出す */

const mocks = vi.hoisted(() => ({ confirm: vi.fn(), cancel: vi.fn(), push: vi.fn() }));

vi.mock('next/navigation', () => ({ useParams: () => ({ id: 's1' }), useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/stores/auth', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({
      currentUser: { uid: 'me' },
      currentTeam: { id: 't1' },
      members: [{ userId: 'me', displayName: '自分', avatarUrl: null, role: 'member' }],
    }),
}));
vi.mock('@/lib/repositories/collabs', () => ({
  subscribeCollabSessions: (_teamId: string, cb: (s: CollabSession[]) => void) => {
    cb([session]);
    return () => {};
  },
  confirmCollabDate: mocks.confirm,
  cancelCollabSession: mocks.cancel,
}));
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));

const session: CollabSession = {
  id: 's1',
  title: 'コラボ配信',
  partnerName: '相手',
  createdBy: 'me',
  teamId: 't1',
  proposedDates: [new Date('2026-12-01T10:00:00Z')],
  responses: null,
  expiresAt: new Date('2026-12-31T00:00:00Z'),
  status: 'open',
  confirmedDate: null,
  linkedScheduleId: null,
  createdAt: new Date('2026-11-01T00:00:00Z'),
};

import CollabDetailPage from '@/app/(protected)/collabs/[id]/page';

describe('コラボ詳細ページの失敗表示', () => {
  let container: HTMLDivElement;
  let root: Root;
  const button = (text: string) =>
    [...container.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes(text))!;
  const alertText = () => container.querySelector('[role="alert"]')?.textContent;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('confirm', () => true);
    container = document.body.appendChild(document.createElement('div'));
    root = createRoot(container);
    act(() => root.render(<CollabDetailPage />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    Object.values(mocks).forEach((fn) => fn.mockReset());
  });

  it('確定が失敗したら理由を出す', async () => {
    mocks.confirm.mockRejectedValue({ code: 'functions/internal', message: 'internal' });
    act(() => container.querySelector<HTMLElement>('.cursor-pointer.p-3')!.click());
    await act(async () => button('選択した日程で確定する').click());
    expect(alertText()).toBe('サーバーで問題が発生しました。時間をおいて再試行してください');
  });

  it('キャンセルが失敗したら理由を出し、一覧へ移らない', async () => {
    mocks.cancel.mockRejectedValue({ code: 'functions/permission-denied', message: 'メンバー権限が必要です' });
    await act(async () => button('キャンセル').click());
    expect(alertText()).toBe('この操作を行う権限がありません');
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
