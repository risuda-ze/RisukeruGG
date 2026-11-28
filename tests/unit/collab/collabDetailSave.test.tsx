import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CollabSession } from '@/types/entities';

/* CO-031・CO-032: コラボ詳細の保存・調整を確定・削除の失敗表示と、保存の楽観的ロック */

const repo = vi.hoisted(() => ({
  update: vi.fn(),
  updateIfUnchanged: vi.fn(),
  confirm: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ currentUser: { uid: 'me' }, currentTeam: { id: 't1' }, members: [] }),
}));
vi.mock('@/lib/repositories/collabs', () => ({
  updateCollabSession: repo.update,
  updateCollabSessionIfUnchanged: repo.updateIfUnchanged,
  confirmCollabDate: repo.confirm,
  cancelCollabSession: repo.cancel,
  reopenCollabSession: vi.fn(),
  createCollabSessionDraft: vi.fn(),
}));
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));

import { CollabDetailModal } from '@/components/collab/CollabDetailModal';

const OPENED = new Date('2026-11-28T10:00:00.000Z');
const session: CollabSession = {
  id: 's1',
  title: 'コラボ配信',
  partnerName: '',
  createdBy: 'me',
  teamId: 't1',
  proposedDates: [new Date('2026-12-01T10:00:00Z'), new Date('2026-12-02T10:00:00Z')],
  responses: null,
  expiresAt: new Date('2026-12-31T00:00:00Z'),
  status: 'open',
  confirmedDate: null,
  linkedScheduleId: null,
  createdAt: new Date('2026-11-01T00:00:00Z'),
  updatedAt: OPENED,
  icon: 'mic',
  content: '',
  participants: [{ id: 'ext_b', name: 'B', type: 'external' }],
  participantResponses: { ext_b: { '0': 'ok', '1': 'ng' } },
  comments: [],
};

describe('CollabDetailModal の保存と失敗表示', () => {
  let container: HTMLDivElement;
  let root: Root;
  const onClose = vi.fn();

  const buttonByText = (text: string) =>
    [...container.ownerDocument.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent?.includes(text)
    )!;
  const dateDeleteButtons = () =>
    [...container.ownerDocument.querySelectorAll<HTMLButtonElement>('button[title="削除"]')];
  const alertText = () => container.ownerDocument.querySelector('[role="alert"]')?.textContent ?? '';

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('confirm', () => true);
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }));
    container = document.body.appendChild(document.createElement('div'));
    root = createRoot(container);
    act(() =>
      root.render(<CollabDetailModal session={session} canEdit onClose={onClose} onDeleted={vi.fn()} />)
    );
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    Object.values(repo).forEach((fn) => fn.mockReset());
    onClose.mockReset();
  });

  it('候補日程を削除した保存は、開いた時点の updatedAt で楽観的ロックをかけて書く', async () => {
    repo.updateIfUnchanged.mockResolvedValue(undefined);
    act(() => dateDeleteButtons()[0]!.click());
    await act(async () => buttonByText('保存').click());
    expect(repo.updateIfUnchanged).toHaveBeenCalledWith(
      't1',
      's1',
      expect.objectContaining({
        proposedDates: [session.proposedDates[1]],
        participantResponses: { ext_b: { '0': 'ng' } },
      }),
      OPENED,
      'me'
    );
    expect(repo.update).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('開いた後に回答が届いていれば保存されず、開き直すよう出て、閉じない', async () => {
    repo.updateIfUnchanged.mockRejectedValue(new Error('CONFLICT'));
    act(() => dateDeleteButtons()[0]!.click());
    await act(async () => buttonByText('保存').click());
    expect(alertText()).toContain('開き直してから編集してください');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('候補日程を変えていない保存はロックなしで書き、候補日程・回答を含めない', async () => {
    repo.update.mockResolvedValue(undefined);
    await act(async () => buttonByText('保存').click());
    expect(repo.updateIfUnchanged).not.toHaveBeenCalled();
    const payload = repo.update.mock.calls[0]![2];
    expect(payload).not.toHaveProperty('proposedDates');
    expect(payload).not.toHaveProperty('participantResponses');
  });

  it('競合以外の保存の失敗は決まった文言を出す', async () => {
    repo.update.mockRejectedValue(new Error('Missing or insufficient permissions.'));
    await act(async () => buttonByText('保存').click());
    expect(alertText()).toBe('保存に失敗しました。時間をおいて再度お試しください');
  });

  it('保存が済んで確定だけ失敗したら、保存済みと出して保存・確定を押せなくする', async () => {
    repo.update.mockResolvedValue(undefined);
    repo.confirm.mockRejectedValue({ code: 'functions/internal', message: 'internal' });
    act(() => buttonByText('承諾').click());
    await act(async () => buttonByText('調整を確定').click());
    expect(alertText()).toContain('変更は保存しました');
    expect(alertText()).toContain('開き直してから確定してください');
    expect(buttonByText('調整を確定').disabled).toBe(true);
    expect(buttonByText('保存').disabled).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('確定の前の保存が競合したら確定しない', async () => {
    repo.updateIfUnchanged.mockRejectedValue(new Error('CONFLICT'));
    act(() => dateDeleteButtons()[1]!.click());
    act(() => buttonByText('承諾').click());
    await act(async () => buttonByText('調整を確定').click());
    expect(repo.confirm).not.toHaveBeenCalled();
    expect(alertText()).toContain('開き直してから編集してください');
  });

  it('削除が失敗したら理由を出して閉じない', async () => {
    repo.cancel.mockRejectedValue({ code: 'functions/permission-denied', message: 'メンバー権限が必要です' });
    await act(async () => buttonByText('削除').click());
    expect(alertText()).toBe('この操作を行う権限がありません');
  });
});

describe('CollabDetailModal の再調整の失敗表示', () => {
  it('再調整が失敗したら理由を出して閉じない（CO-031）', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }));
    const reopen = vi.mocked((await import('@/lib/repositories/collabs')).reopenCollabSession);
    reopen.mockRejectedValue({ code: 'functions/failed-precondition', message: '確定済みのコラボだけ再調整できます' });
    const onClose = vi.fn();
    const container = document.body.appendChild(document.createElement('div'));
    const root = createRoot(container);
    act(() =>
      root.render(
        <CollabDetailModal
          session={{ ...session, status: 'confirmed', confirmedDate: session.proposedDates[0]! }}
          canEdit
          onClose={onClose}
          onDeleted={vi.fn()}
        />
      )
    );
    const reopenButtons = () =>
      [...document.querySelectorAll<HTMLButtonElement>('button')].filter((b) => b.textContent?.includes('再調整する'));
    // フッターの「再調整する」で確認を開き、確認の「再調整する」で実行する
    act(() => reopenButtons()[0]!.click());
    expect(reopenButtons()).toHaveLength(2);
    const footer = reopenButtons().find((b) => b.querySelector('svg'));
    await act(async () => reopenButtons().find((b) => b !== footer)!.click());
    expect(document.querySelector('[role="alert"]')?.textContent).toBe('確定済みのコラボだけ再調整できます');
    expect(onClose).not.toHaveBeenCalled();
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });
});
