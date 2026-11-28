import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CollabSession } from '@/types/entities';

/* CO-031: 一覧の削除ボタンはメンバーだけ。削除の失敗はトーストで出す */

const mocks = vi.hoisted(() => ({
  role: 'member' as 'member' | 'staff',
  cancel: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({
      currentUser: { uid: 'me' },
      currentTeam: { id: 't1' },
      members: [{ userId: 'me', displayName: '自分', avatarUrl: null, role: mocks.role }],
    }),
}));
vi.mock('@/lib/repositories/collabs', () => ({
  subscribeCollabSessions: (_teamId: string, cb: (s: CollabSession[]) => void) => {
    cb([session]);
    return () => {};
  },
  cancelCollabSession: mocks.cancel,
}));
vi.mock('sonner', () => ({ toast: { error: mocks.toastError } }));
vi.mock('@/components/layout/TopBar', () => ({ TopBar: () => null }));
vi.mock('@/components/collab/CollabDetailModal', () => ({ CollabDetailModal: () => null }));

const session: CollabSession = {
  id: 's1',
  title: 'コラボ配信',
  partnerName: '',
  createdBy: 'me',
  teamId: 't1',
  proposedDates: [new Date('2026-12-01T10:00:00Z')],
  responses: null,
  expiresAt: new Date('2026-12-31T00:00:00Z'),
  status: 'open',
  confirmedDate: null,
  linkedScheduleId: null,
  createdAt: new Date('2026-11-01T00:00:00Z'),
  participants: [{ id: 'ext_1', name: '相手', type: 'external' }],
  participantResponses: {},
};

import CollabsPage from '@/app/(protected)/collabs/page';

describe('コラボ一覧の削除（CO-031）', () => {
  let container: HTMLDivElement;
  let root: Root;
  const deleteButtons = () => container.querySelectorAll<HTMLElement>('[title="削除"]');

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('confirm', () => true);
    container = document.body.appendChild(document.createElement('div'));
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    mocks.cancel.mockReset();
    mocks.toastError.mockReset();
  });

  for (const mobile of [false, true]) {
    const label = mobile ? 'モバイル' : 'PC';
    it(`${label}: スタッフには削除ボタンを出さない`, () => {
      vi.stubGlobal('matchMedia', () => ({ matches: mobile, addEventListener: () => {}, removeEventListener: () => {} }));
      mocks.role = 'staff';
      act(() => root.render(<CollabsPage />));
      expect(container.textContent).toContain('コラボ配信');
      expect(deleteButtons()).toHaveLength(0);
    });

    it(`${label}: メンバーには削除ボタンを出す`, () => {
      vi.stubGlobal('matchMedia', () => ({ matches: mobile, addEventListener: () => {}, removeEventListener: () => {} }));
      mocks.role = 'member';
      act(() => root.render(<CollabsPage />));
      expect(deleteButtons()).toHaveLength(1);
    });
  }

  it('削除が失敗したらトーストで理由を出し、一覧に残す', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }));
    mocks.role = 'member';
    mocks.cancel.mockRejectedValue({ code: 'functions/permission-denied', message: 'メンバー権限が必要です' });
    act(() => root.render(<CollabsPage />));
    await act(async () => deleteButtons()[0]!.click());
    expect(mocks.cancel).toHaveBeenCalledWith({ teamId: 't1', sessionId: 's1' });
    expect(mocks.toastError).toHaveBeenCalledWith('この操作を行う権限がありません');
    expect(container.textContent).toContain('コラボ配信');
  });
});
