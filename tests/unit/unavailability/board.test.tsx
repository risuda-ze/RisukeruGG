import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UnavailabilityBoard } from '@/components/unavailability/UnavailabilityBoard';
import { subscribeUnavailabilityMonth } from '@/lib/repositories/unavailability';

vi.mock('@/lib/repositories/unavailability', () => ({ subscribeUnavailabilityMonth: vi.fn() }));
vi.mock('@/stores/auth', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ currentUser: { uid: 'me' }, members: [] }),
}));

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
