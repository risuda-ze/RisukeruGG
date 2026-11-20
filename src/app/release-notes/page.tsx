// リリースノートページ（公開・認証不要）
// 原稿は src/lib/releaseNotes.ts に持ち、ビルド時に静的生成する

import type { Metadata } from 'next';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Icon } from '@/components/ui/Icon';
import { RELEASE_NOTES } from '@/lib/releaseNotes';

export const metadata: Metadata = {
  title: 'リリースノート',
  description: 'リスケるGGのリリースノートです。これまでの更新内容を掲載しています。',
  alternates: { canonical: '/release-notes' },
};

// 原稿（Markdown）の描画スタイル。生の HTML は react-markdown の既定で描画されない
const markdownComponents: Components = {
  h3: ({ children }) => <h3 className="text-sm font-semibold text-text mt-6 mb-2">{children}</h3>,
  p: ({ children }) => <p className="text-sm text-text-muted leading-relaxed mb-3">{children}</p>,
  ul: ({ children }) => (
    <ul className="list-disc list-outside text-sm text-text-muted space-y-2 ml-5">{children}</ul>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-brand-2 underline hover:opacity-80"
    >
      {children}
    </a>
  ),
};

export default function ReleaseNotesPage() {
  return (
    /* ── 外枠は法務ページ（利用規約など）と統一 ────── */
    <div className="min-h-screen bg-canvas">
      {/* ── ページヘッダー ───────────────────────────────── */}
      <header className="border-b border-border bg-surface">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* ロゴ + アプリ名 */}
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 56 56" fill="none" className="h-8 w-8 shrink-0">
              <rect width="56" height="56" rx="14" fill="color-mix(in oklab, var(--primary) 35%, transparent)" />
              <path
                d="M14 28c0-7.7 6.3-14 14-14s14 6.3 14 14-6.3 14-14 14-14-6.3-14-14Z"
                fill="var(--primary)"
                opacity=".3"
              />
              <rect x="22.5" y="20" width="3" height="10" rx="1.5" fill="var(--brand-2)" />
              <rect x="19" y="24" width="10" height="3" rx="1.5" fill="var(--brand-2)" />
              <circle cx="38" cy="23" r="2.5" fill="var(--warning)" />
              <circle cx="33" cy="31" r="2.5" fill="var(--warning)" />
            </svg>
            <span className="text-text font-semibold">リスケるGG</span>
          </div>
          {/* ログインに戻るリンク */}
          <Link
            href="/login"
            className="text-sm text-text-muted hover:text-brand-2 transition-colors flex items-center gap-1"
          >
            <Icon name="chevron_right" size={16} className="rotate-180" />
            ログインに戻る
          </Link>
        </div>
      </header>

      {/* ── メインコンテンツ ─────────────────────────────── */}
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-text mb-2">リリースノート</h1>
        <p className="text-xs text-text-muted mb-10">リスケるGG のこれまでの更新内容です。</p>

        {/* 新しい順に全バージョンを並べる。#v{version} で各バージョンへ直接飛べる */}
        {RELEASE_NOTES.map((note) => (
          <section key={note.version} id={`v${note.version}`} className="mb-10 scroll-mt-6">
            <div className="flex items-baseline justify-between gap-4 mt-8 mb-4 border-b border-border pb-2">
              <h2 className="text-lg font-semibold text-text">v{note.version}</h2>
              <time dateTime={note.date} className="text-xs text-text-muted">
                {note.date}
              </time>
            </div>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {note.body}
            </ReactMarkdown>
          </section>
        ))}
      </main>

      {/* ── フッター ─────────────────────────────────────── */}
      <footer className="border-t border-border mt-10">
        <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-text-muted">
            © {new Date().getFullYear()} リスケるGG. All rights reserved.
          </p>
          <Link href="/login" className="text-xs text-text-muted hover:text-brand-2 transition-colors">
            ← ログインに戻る
          </Link>
        </div>
      </footer>
    </div>
  );
}
