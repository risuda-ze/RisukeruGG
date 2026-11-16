'use client';

import Link from 'next/link';
import { useEffect } from 'react';

/**
 * アプリ全体の 404 フォールバック。
 *
 * ルート改称（カテゴリ統合 #77 等）や古い PWA キャッシュ・ブックマークから
 * 存在しない URL に到達したユーザーが、Next.js 既定の行き止まり 404 ではなく
 * アプリ内に復帰できるようにする安全網。
 *
 * 併せて、古い Service Worker が残っていると存在するルートでも 404 に
 * 落ちる場合があるため、この画面が表示された時点で SW の更新を促し、
 * 古いプリキャッシュを掃除する。
 */
export default function NotFound() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    // 登録済み SW に更新チェックを走らせ、待機中の新 SW を前倒しで反映させる。
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => regs.forEach((reg) => reg.update().catch(() => {})))
      .catch(() => {});
  }, []);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-canvas overflow-hidden px-4">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 40%, color-mix(in oklab, var(--primary) 18%, transparent) 0%, transparent 70%)',
        }}
      />
      <div className="relative z-10 w-full max-w-sm text-center">
        <div className="rounded-[16px] bg-surface border border-border p-8 shadow-lg">
          <p className="text-5xl font-bold text-brand-2 tracking-tight">404</p>
          <h1 className="mt-4 text-lg font-bold text-text">ページが見つかりません</h1>
          <p className="mt-2 text-sm text-text-muted">
            お探しのページは移動または削除された可能性があります。
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href="/dashboard"
              className="w-full rounded-[10px] bg-primary/35 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary"
            >
              ダッシュボードへ戻る
            </Link>
            <Link
              href="/"
              className="w-full rounded-[10px] border border-border px-4 py-3 text-sm text-text-muted transition-colors hover:text-text"
            >
              トップページへ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
