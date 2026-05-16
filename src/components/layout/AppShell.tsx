/* アプリシェル — Sidebar/BottomNav を md: ブレークポイントで切り替え */

import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';

export interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-bg">
      {/* ── デスクトップ: 220px固定サイドバー ─────────── */}
      <Sidebar />

      {/* ── メインコンテンツエリア ──────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />

        {/* モバイル: TopBar(56px) + BottomNav(64px) 分のパディング */}
        {/* デスクトップ: TopBar分のみ（Sidebarがスクロール制御） */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>
      </div>

      {/* ── モバイル: 下部ナビゲーション ───────────────── */}
      <BottomNav />
    </div>
  );
}
