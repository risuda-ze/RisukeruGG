# 廃止・移行ファイル記録

このファイルはフィーチャー `013-ui-schedule-redesign` で削除・移行されたファイルの記録です。

## 削除済みファイル

### src/components/layout/BottomNav.tsx
- **理由**: MobileToolbar.tsx（5項目・右スライドドロワー）に置き換えられた
- **移行先**: src/components/layout/MobileToolbar.tsx

### src/components/ai/AIChatWidget.tsx
- **理由**: AIFab.tsx にリデザインして移行。glow-pulse アニメーション・ホバーエフェクト・tooltip を追加
- **移行先**: src/components/layout/AIFab.tsx

### src/app/(protected)/schedule/[id]/page.tsx
- **理由**: スケジュール詳細画面がモーダル（FR-014, 870px幅）に統一された。直接 URL アクセス（/schedule/:id）は /schedule へリダイレクト
- **対処**: src/app/(protected)/schedule/[id]/route.ts にリダイレクト処理を追加

## 将来対応（スコープ外）

### 広告バナー（AdBanner）
- 現時点では未実装
- PC 下部・モバイル上部にプレースホルダーバナーを表示する予定
