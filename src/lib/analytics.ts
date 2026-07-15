// Firebase Analytics（GA4）計測ユーティリティ。
//
// 有効化条件（すべて満たす場合のみ計測する）:
//   - ブラウザ環境であること
//   - NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID が設定されていること
//   - エミュレータ利用（NEXT_PUBLIC_USE_EMULATORS=true）ではないこと
//   - ブラウザが Analytics に対応していること（isSupported() が true）
//
// 上記を満たさない場合、すべての計測呼び出しは安全に no-op となる。
import { getApp } from 'firebase/app';
import { getAnalytics, isSupported, logEvent, type Analytics } from 'firebase/analytics';

/** 主要イベント名（snake_case で統一）。 */
export type AnalyticsEventName =
  | 'team_create'
  | 'schedule_create'
  | 'collab_confirm'
  | 'upgrade_cta_click';

let analyticsInstance: Analytics | null = null;
let initPromise: Promise<Analytics | null> | null = null;

/** 環境変数・実行環境の観点で計測が有効かどうかを判定する。 */
function isAnalyticsEnabled(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID &&
    process.env.NEXT_PUBLIC_USE_EMULATORS !== 'true'
  );
}

/**
 * Analytics インスタンスを遅延初期化する。
 * 無効な環境・非対応ブラウザ・初期化失敗時は null を返す。
 * 初期化は一度だけ行い、以降は同じ Promise を再利用する。
 */
export async function initAnalytics(): Promise<Analytics | null> {
  if (!isAnalyticsEnabled()) return null;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const supported = await isSupported();
      if (!supported) return null;
      analyticsInstance = getAnalytics(getApp());
      return analyticsInstance;
    } catch {
      // 初期化失敗はアプリ動作に影響させない。
      return null;
    }
  })();

  return initPromise;
}

/**
 * 主要イベントを計測する。未初期化・無効環境ではすべて no-op。
 * 計測失敗はアプリ動作に影響を与えない（例外を握りつぶす）。
 */
export function trackEvent(name: AnalyticsEventName, params?: Record<string, unknown>): void {
  if (!isAnalyticsEnabled()) return;
  void initAnalytics().then((analytics) => {
    if (!analytics) return;
    try {
      logEvent(analytics, name, params);
    } catch {
      // 計測失敗は無視する。
    }
  });
}

/**
 * ページビューを計測する。未初期化・無効環境では no-op。
 * App Router のルート遷移検知に合わせて呼び出す。
 */
export function trackPageView(pagePath: string): void {
  if (!isAnalyticsEnabled()) return;
  void initAnalytics().then((analytics) => {
    if (!analytics) return;
    try {
      logEvent(analytics, 'page_view', {
        page_path: pagePath,
        page_location: typeof window !== 'undefined' ? window.location.href : undefined,
      });
    } catch {
      // 計測失敗は無視する。
    }
  });
}
