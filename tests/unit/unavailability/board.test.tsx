import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UnavailabilityBoard } from '@/components/unavailability/UnavailabilityBoard';
import { subscribeUnavailabilityMonth } from '@/lib/repositories/unavailability';

vi.mock('@/lib/repositories/unavailability', () => ({ subscribeUnavailabilityMonth: vi.fn() }));
const store = vi.hoisted(() => ({ members: [] as unknown[] }));
vi.mock('@/stores/auth', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ currentUser: { uid: 'me' }, members: store.members }),
}));

const member = (userId: string, displayName: string) => ({
  userId,
  displayName,
  avatarUrl: null,
  role: 'member',
  plan: 'light',
  joinedAt: new Date('2026-01-01T00:00:00Z'),
});

describe('UnavailabilityBoard', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-20T03:00:00Z'));
    container = document.body.appendChild(document.createElement('div'));
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    store.members = [];
    vi.mocked(subscribeUnavailabilityMonth).mockClear();
  });

  it('メンバーはアイコンと名前のボタンを押して選ぶ（UN-042）', () => {
    vi.mocked(subscribeUnavailabilityMonth).mockReturnValue(() => {});
    store.members = [member('me', '配信太郎'), member('u2', '運営花子')];

    act(() => root.render(<UnavailabilityBoard teamId="t1" />));
    act(() => container.querySelector<HTMLElement>('button[aria-controls="un-filter"]')?.click());

    const buttons = [...container.querySelectorAll<HTMLElement>('#un-filter button[aria-pressed]')];
    expect(buttons.map((button) => button.textContent)).toEqual(['配信配信太郎', '運営運営花子']);
    expect(container.querySelector('#un-filter input[type="checkbox"]')).toBeNull();

    act(() => buttons[1].click());
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'true');
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'false');

    act(() => buttons[1].click());
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'false');
  });

  it('当月だけを先に購読し、ヘッダーは折り畳んで表示する（UN-041, UN-090）', () => {
    vi.mocked(subscribeUnavailabilityMonth).mockReturnValue(() => {});

    act(() => root.render(<UnavailabilityBoard teamId="t1" />));

    expect(vi.mocked(subscribeUnavailabilityMonth).mock.calls.map((call) => call[1])).toEqual([
      '2026-11',
    ]);
    expect(container.querySelector('button[aria-controls="un-filter"]')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(container.querySelector('#un-filter')).toBeNull();
  });

  it('購読に失敗したら、一覧を出さずにエラーを表示する', () => {
    vi.mocked(subscribeUnavailabilityMonth).mockImplementation(
      (_teamId, _month, _callback, onError) => {
        onError(new Error('permission-denied'));
        return () => {};
      }
    );

    act(() => root.render(<UnavailabilityBoard teamId="t1" />));

    expect(container.querySelector('[role="alert"]')).toHaveTextContent(
      '対応不可時間を読み込めませんでした'
    );
    expect(container.querySelector('[data-testid="un-grid"]')).toBeNull();
  });
});
