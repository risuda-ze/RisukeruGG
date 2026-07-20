/* アプリシェル — Sidebar/MobileToolbar を md ブレークポイントで切り替え */
/* TopBar は各ページが自前でレンダリングする */

import { Sidebar } from './Sidebar';
import { MobileToolbar } from './MobileToolbar';
import { AIFab } from './AIFab';

export interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* ── デスクトップ: 固定サイドバー ─────────────────── */}
      <Sidebar />

      {/* ── メインコンテンツエリア ──────────────────────── */}
      {/* 各ページが TopBar + スクロール可能コンテンツを管理する */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0 pb-[calc(66px+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </main>

      {/* ── モバイル: 下部ツールバー ────────────────────── */}
      <MobileToolbar />

      {/* ── 全画面右下: AIフローティングボタン ──────────── */}
      <AIFab />
    </div>
  );
}
