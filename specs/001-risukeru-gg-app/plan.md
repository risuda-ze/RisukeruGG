# Implementation Plan: リスケるGG — 全画面UIデザイン刷新

**Branch**: `001-risukeru-gg-app` | **Date**: 2026-05-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-risukeru-gg-app/spec.md`

## Summary

既存のリスケるGGアプリ（Next.js 14 / App Router / Tailwind CSS / Firebase）の全画面UIを刷新する。
参照デザイン（`docs/risukeru_gg_dashboard.html`・`docs/risukeru_gg_mobile.html`・`docs/risukeru_gg_lp.html`）と
デザインシステム仕様（`docs/DESIGN.md`）をベースに、ダークテーマ・パープル/アンバーアクセントの
共有デザイントークンを構築し、全10画面をレスポンシブで実装する。

## Technical Context

**Language/Version**: TypeScript 5.x / Next.js 14 (App Router)  
**Primary Dependencies**: Tailwind CSS 4.x、Google Fonts (Zen Kaku Gothic New, Space Grotesk)  
**Storage**: N/A（UIのみ、データ取得ロジックは既存のFirestore リポジトリを継続使用）  
**Testing**: Vitest（ユニット）/ Playwright（E2E）— UI コンポーネントテストは原則不要（Principle III）  
**Target Platform**: PC Web（Chrome/Edge/Firefox最新2版）+ Android PWA (Chrome最新2版)  
**Project Type**: Web application — モバイルファースト・レスポンシブ  
**Performance Goals**: LCP < 3s (4G モバイル)、INP < 100ms (NFR-001, NFR-002)  
**Constraints**: WCAG 2.1 AA、ダークテーマ固定（フェーズ1）、JST表示、日本語UI  
**Scale/Scope**: 10画面、共有UIコンポーネント約20種

## Constitution Check

*GATE: Phase 0 開始前に全項目を確認。Phase 1 設計後に再確認。*

| 原則 | 評価 | 根拠 |
|------|------|------|
| I. シンプルさ優先 | ✅ PASS | CSSカスタムプロパティ + Tailwind で1デザインシステム。新しい抽象化は3箇所以上で使われるコンポーネントのみ。 |
| II. TypeScript型安全 | ✅ PASS | 全コンポーネントにProps型注釈。`any`不使用。コンポーネントバリアントはunion型で表現。 |
| III. テスト方針 | ✅ PASS | UIコンポーネントテストは追加しない（任意扱い）。既存のE2Eテスト（login・schedule・tasks）はデザイン刷新後も動作確認を行う。 |
| IV. Firebase・セキュリティ | ✅ PASS | UIのみの変更のため、Security RulesおよびCloud Functionsに影響なし。 |
| V. 日本語コメント | ✅ PASS | 全コメントを日本語で記述。変数名・コンポーネント名は英語命名規則に従う。 |

**Complexity Tracking**: なし（全ての変更はUI層に閉じており、Constitution違反なし）

## Project Structure

### Documentation (this feature)

```text
specs/001-risukeru-gg-app/
├── plan.md              # このファイル（/speckit-plan コマンド出力）
├── research.md          # Phase 0: デザイントークン・レイアウト調査結果
├── data-model.md        # Phase 1: UIコンポーネント構造
├── quickstart.md        # Phase 1: ローカル開発手順
├── contracts/
│   └── ui-components.md # Phase 1: コンポーネントAPI仕様
└── tasks.md             # Phase 2: 実装タスク（/speckit-tasks で生成）
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── globals.css               # ← デザイントークン（CSS変数）+ ベーススタイル 刷新
│   ├── layout.tsx                # ← フォント（Zen Kaku Gothic New）設定 更新
│   ├── page.tsx                  # LP（トップページ）← 新規作成
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx          # ← ダークテーマ Login画面 刷新
│   └── (protected)/
│       ├── layout.tsx            # ← デスクトップSidebar + モバイルBottomNav 刷新
│       ├── dashboard/
│       │   └── page.tsx          # ← Stats + Timeline + Kanban preview + Collab 刷新
│       ├── schedule/
│       │   ├── page.tsx          # ← カレンダー（週/月ビュー）刷新
│       │   └── [id]/
│       │       └── page.tsx      # ← スケジュール詳細 刷新
│       ├── tasks/
│       │   └── page.tsx          # ← Kanbanボード 刷新
│       ├── collabs/
│       │   ├── page.tsx          # ← コラボ一覧 刷新
│       │   └── [id]/
│       │       └── page.tsx      # ← コラボ詳細 刷新
│       ├── notifications/
│       │   └── page.tsx          # ← 通知一覧 刷新
│       ├── team/
│       │   └── page.tsx          # ← チームメンバー管理 刷新
│       └── settings/
│           └── page.tsx          # ← 設定 刷新
│
├── components/
│   ├── ui/                       # ← プリミティブUIコンポーネント 全刷新
│   │   ├── Button.tsx            # ← primary/secondary/danger/ghost + amber variant
│   │   ├── Badge.tsx             # ← purple/amber/live/green/muted variants
│   │   ├── Input.tsx             # ← ダークテーマ
│   │   ├── Modal.tsx             # ← ダークテーマ
│   │   ├── Spinner.tsx           # ← ダークテーマ
│   │   ├── Card.tsx              # ← 新規: section-card スタイル
│   │   ├── StatCard.tsx          # ← 新規: 統計カード
│   │   └── Avatar.tsx            # ← 新規: アバター（イニシャル）
│   │
│   ├── layout/
│   │   ├── Sidebar.tsx           # ← 新規: デスクトップサイドバー（220px）
│   │   ├── TopBar.tsx            # ← デスクトップ用トップバー 刷新
│   │   ├── BottomNav.tsx         # ← モバイル用ボトムナビ 刷新
│   │   └── AppShell.tsx          # ← 新規: Sidebar + main の切り替えシェル
│   │
│   ├── dashboard/
│   │   ├── TodayTimeline.tsx     # ← 新規: 本日タイムライン
│   │   └── CollabRequests.tsx    # ← 新規: コラボ打診一覧（ダッシュボード用）
│   │
│   ├── calendar/                 # ← 既存コンポーネントを新テーマで刷新
│   ├── kanban/                   # ← 既存コンポーネントを新テーマで刷新
│   ├── collab/                   # ← 既存コンポーネントを新テーマで刷新
│   ├── notifications/            # ← 既存コンポーネントを新テーマで刷新
│   ├── team/                     # ← 既存コンポーネントを新テーマで刷新
│   └── plan/                     # ← 既存コンポーネントを新テーマで刷新
│
└── public/
    └── manifest.json             # ← themeColor更新（#534AB7）
```

**Structure Decision**: モノリポ構成（Option 1）を継続。UIの関心事はコンポーネント層に閉じており、既存のサービス層・リポジトリ層・Firebase設定には変更不要。

## Screen Inventory

| # | 画面 | パス | 優先度 | 参照デザイン |
|---|------|------|--------|-------------|
| 1 | ログイン | `/login` | P1 | LP ヒーロービジュアル参照 |
| 2 | ダッシュボード | `/dashboard` | P1 | dashboard.html 全体 |
| 3 | スケジュール | `/schedule` | P1 | LP Feature 01 カレンダーモック |
| 4 | スケジュール詳細 | `/schedule/[id]` | P1 | 機能から逆算 |
| 5 | タスクボード | `/tasks` | P1 | mobile.html Screen 2 + dashboard.html Kanban |
| 6 | コラボ一覧 | `/collabs` | P1 | mobile.html Screen 3 + LP Feature 02 |
| 7 | コラボ詳細 | `/collabs/[id]` | P1 | 機能から逆算 |
| 8 | コラボ返答（外部） | `/collab/[token]` | P1 | LP Feature 02 参照 |
| 9 | 通知一覧 | `/notifications` | P2 | LP Feature 04 通知モック |
| 10 | チーム管理 | `/team` | P1 | dashboard.html チームメンバー + 機能から逆算 |
| 11 | 設定 | `/settings` | P2 | 機能から逆算 |

## Design Token Overview

参照: `research.md` に詳細を記載。主要トークン:

```css
/* カラー */
--bg:        #08081a;   /* ページ背景 */
--surface:   #10102a;   /* サーフェス（サイドバー・トップバー） */
--card:      #16163a;   /* カードコンポーネント */
--border:    #28285a;   /* ボーダー */
--purple:    #7F77DD;   /* プライマリアクセント */
--purple-l:  #a0a0ff;   /* プライマリ（ライト） */
--purple-d:  #534AB7;   /* プライマリ（ダーク） */
--amber:     #EF9F27;   /* セカンダリアクセント */
--amber-l:   #FAC775;   /* セカンダリ（ライト） */
--amber-d:   #BA7517;   /* セカンダリ（ダーク） */
--text:      #eeeeff;   /* テキスト */
--muted:     #6666aa;   /* ミュートテキスト */
--live:      #ff4d6d;   /* LIVE状態 */
--green:     #3fcf7f;   /* 完了・成功 */

/* タイポグラフィ */
--font-ja:   'Zen Kaku Gothic New', sans-serif;
--font-num:  'Space Grotesk', sans-serif;
```

## Implementation Phases

### フェーズ A: デザイン基盤（先行）

1. `globals.css` にCSSカスタムプロパティ定義（デザイントークン）
2. `layout.tsx` でGoogle Fonts（Zen Kaku Gothic New + Space Grotesk）設定
3. Tailwind の `tailwind.config.ts` にカスタムカラーを追加
4. プリミティブUIコンポーネント全刷新（Button, Badge, Input, Modal, Spinner, Card, StatCard, Avatar）
5. レイアウトコンポーネント刷新（Sidebar, TopBar, BottomNav, AppShell）

### フェーズ B: 主要画面（P1）

6. Login ページ刷新
7. Dashboard ページ刷新（Stats + Timeline + Kanban preview + Collab requests + Notifications）
8. Schedule ページ刷新（CalendarView コンポーネント再スタイリング）
9. Tasks ページ刷新（KanbanBoard コンポーネント再スタイリング）
10. Collabs ページ刷新
11. Team ページ刷新

### フェーズ C: サブ画面（P2）

12. Notifications ページ刷新
13. Settings ページ刷新
14. Collab 返答ページ（外部公開）刷新
15. Schedule 詳細・Collab 詳細ページ刷新

### フェーズ D: 品質確認

16. レスポンシブ動作確認（PC 1280px / タブレット 768px / モバイル 375px）
17. WCAG 2.1 AA コントラスト比確認（4.5:1以上）
18. 既存E2Eテスト（login, schedule, tasks）の動作確認・必要に応じてセレクタ修正
19. PWA manifest themeColor 更新

## Responsive Layout Strategy

```
PC (md: 768px 以上):
  +--Sidebar (220px)--+--------- Main ----------+
  |  Logo             |  TopBar                 |
  |  Navigation       |  Content (scrollable)   |
  |  Team             |                         |
  |  Integrations     |                         |
  |  Footer           |                         |
  +-------------------+-------------------------+

Mobile (768px 未満):
  +-------- TopBar ----------+
  |  Logo | LiveBadge | 通知  |
  +------ Content -----------+
  | (scrollable)             |
  +--------------------------+
  +-------- BottomNav -------+
  | ホーム | スケジュール | ＋ | タスク | チーム |
  +--------------------------+
```

**ブレークポイント**:
- `md` (768px): Sidebar表示 / BottomNav非表示
- `sm` (640px): 統計カード 2列 → 1列
- デフォルト: モバイルファースト

## Complexity Tracking

> Constitution Check で違反なし。Complexity Trackingへの記録項目なし。
