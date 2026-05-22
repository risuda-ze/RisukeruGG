/* アプリシェル — Sidebar/BottomNav を md: ブレークポイントで切り替え */
/* TopBar は各ページが自前でレンダリングする */

import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { AIChatWidget } from '@/components/ai/AIChatWidget';
import { AIExtractModal } from '@/components/ai/AIExtractModal';

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
      <main className="flex-1 flex flex-col overflow-hidden min-w-0 pb-16 md:pb-0">
        {children}
      </main>

      {/* ── モバイル: 下部ナビゲーション ───────────────── */}
      <BottomNav />

      {/* ── AI機能 ─────────────────────────────────────── */}
      <AIChatWidget />
      <AIExtractModal />
    </div>
  );
}
