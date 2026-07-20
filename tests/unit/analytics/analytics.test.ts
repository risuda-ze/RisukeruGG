import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Firebase Analytics 計測ユーティリティのユニットテスト。
 * 未初期化時（measurementId なし・エミュレータ・非対応ブラウザ）に
 * すべての計測呼び出しが安全に no-op になることを検証する。
 */

// firebase/analytics と firebase/app をモックし、実際の初期化を回避する。
const logEvent = vi.fn<(analytics: unknown, name: string, params?: Record<string, unknown>) => void>();
const getAnalytics = vi.fn<() => unknown>(() => ({ __mock: 'analytics' }));
let isSupportedResult = true;
const isSupported = vi.fn<() => Promise<boolean>>(() => Promise.resolve(isSupportedResult));

vi.mock('firebase/analytics', () => ({
  getAnalytics: () => getAnalytics(),
  isSupported: () => isSupported(),
  logEvent: (analytics: unknown, name: string, params?: Record<string, unknown>) =>
    logEvent(analytics, name, params),
}));

vi.mock('firebase/app', () => ({
  getApp: () => ({ __mock: 'app' }),
}));

/** マイクロタスク・タイマーをフラッシュして非同期の trackEvent 完了を待つ。 */
function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** テストごとにモジュールキャッシュ（initPromise）をリセットして再読込する。 */
async function loadModule() {
  vi.resetModules();
  return import('@/lib/analytics');
}

beforeEach(() => {
  logEvent.mockClear();
  getAnalytics.mockClear();
  isSupported.mockClear();
  isSupportedResult = true;
  // デフォルトは「有効」な環境にしておき、各テストで上書きする。
  process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = 'G-TESTID';
  process.env.NEXT_PUBLIC_USE_EMULATORS = 'false';
});

describe('analytics ユーティリティ', () => {
  it('measurementId 未設定時は初期化されず no-op になる', async () => {
    delete process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
    const { initAnalytics, trackEvent } = await loadModule();

    await expect(initAnalytics()).resolves.toBeNull();

    trackEvent('team_create');
    await flush();
    expect(logEvent).not.toHaveBeenCalled();
    expect(getAnalytics).not.toHaveBeenCalled();
  });

  it('エミュレータ利用時（USE_EMULATORS=true）は no-op になる', async () => {
    process.env.NEXT_PUBLIC_USE_EMULATORS = 'true';
    const { initAnalytics, trackEvent } = await loadModule();

    await expect(initAnalytics()).resolves.toBeNull();

    trackEvent('schedule_create');
    await flush();
    expect(logEvent).not.toHaveBeenCalled();
  });

  it('非対応ブラウザ（isSupported=false）では no-op になる', async () => {
    isSupportedResult = false;
    const { initAnalytics, trackEvent } = await loadModule();

    await expect(initAnalytics()).resolves.toBeNull();

    trackEvent('collab_confirm');
    await flush();
    expect(logEvent).not.toHaveBeenCalled();
    expect(getAnalytics).not.toHaveBeenCalled();
  });

  it('有効かつ対応ブラウザでは initAnalytics がインスタンスを返す', async () => {
    const { initAnalytics } = await loadModule();
    const instance = await initAnalytics();
    expect(instance).not.toBeNull();
    expect(getAnalytics).toHaveBeenCalledTimes(1);
  });

  it('有効環境では trackEvent が指定イベント名で logEvent を呼ぶ', async () => {
    const { trackEvent } = await loadModule();
    trackEvent('upgrade_cta_click', { source: 'plan_status' });
    await flush();
    expect(logEvent).toHaveBeenCalledTimes(1);
    const [, eventName, params] = logEvent.mock.calls[0];
    expect(eventName).toBe('upgrade_cta_click');
    expect(params).toEqual({ source: 'plan_status' });
  });

  it('有効環境では trackPageView が page_view を page_path 付きで送信する', async () => {
    const { trackPageView } = await loadModule();
    trackPageView('/dashboard');
    await flush();
    expect(logEvent).toHaveBeenCalledTimes(1);
    const [, eventName, params] = logEvent.mock.calls[0];
    expect(eventName).toBe('page_view');
    expect(params).toMatchObject({ page_path: '/dashboard' });
  });

  it('初期化は一度だけ行われ、複数回計測しても getAnalytics は 1 回のみ', async () => {
    const { trackEvent } = await loadModule();
    trackEvent('team_create');
    trackEvent('schedule_create');
    await flush();
    expect(getAnalytics).toHaveBeenCalledTimes(1);
    expect(logEvent).toHaveBeenCalledTimes(2);
  });
});
