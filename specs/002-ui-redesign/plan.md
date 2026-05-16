# Implementation Plan: UIリデザイン — サイドバー・ダッシュボード・通知ドロップダウン

**Branch**: `001-risukeru-gg-app` | **Date**: 2026-05-16 | **Spec**: [spec.md](../001-risukeru-gg-app/spec.md)  
**Input**: UIリデザイン要件（サイドバー・ダッシュボード・通知ダイアログ）`docs/risukeru_gg_screens.html` 参照

---

## Summary

`docs/risukeru_gg_screens.html` のモックアップを基準として、既存の `Sidebar`・`TopBar`・Dashboard ページを再設計する。Azouaoui Mohamed スタイルのアコーディオン型折りたたみサイドバー・5項目のダッシュボード統計ウィジェット・タスクカード詳細モーダル・通知ドロップダウン（インライン表示）を実装する。

---

## Technical Context

**Language/Version**: TypeScript 5 / Next.js 14 (App Router)  
**Primary Dependencies**: Tailwind CSS 4、Zustand、Material Icons（Google Fonts CDN）  
**Storage**: N/A（UIのみ; データアクセスは既存 stores/repositories 経由）  
**Testing**: Playwright E2E（既存テスト非破壊を確認）  
**Target Platform**: PC Chrome/Edge/Firefox + Android Chrome（PWA）  
**Project Type**: Web Application（配信者向け SPA）  
**Performance Goals**: LCP ≦ 3s（4G）、INP ≦ 100ms  
**Constraints**: ダークテーマ固定、Tailwind v4 `@theme` トークン厳守、`any` 禁止  
**Scale/Scope**: 変更対象 6 ファイル程度、新規 3〜4 ファイル

---

## Constitution Check

_GATE: 実装前に全項目をクリアすること_

| Principle                  | Status  | Notes                                                                                               |
| -------------------------- | ------- | --------------------------------------------------------------------------------------------------- |
| I. シンプルさ優先          | ✅ PASS | サイドバー折りたたみ状態は Zustand 1 store、アコーディオンはローカル state で管理。過度な抽象化なし |
| II. TypeScript型安全       | ✅ PASS | props は全てインライン型注釈、union 型でバリアント管理、`any` 禁止                                  |
| III. テスト方針            | ✅ PASS | UIコンポーネントテスト不要。E2E テスト（既存）が非破壊であることを確認                              |
| IV. Firebase・セキュリティ | ✅ PASS | UIのみの変更。Firebase アクセスは既存 stores/repositories を継続利用                                |
| V. 日本語コメント          | ✅ PASS | ソースコードコメントは全て日本語                                                                    |

---

## Project Structure

### Documentation (this feature)

```text
specs/002-ui-redesign/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (変更・追加対象)

```text
# 変更・追加ファイル
src/
├── app/
│   ├── layout.tsx                          # Material Icons CDN link 追加
│   └── (protected)/
│       └── dashboard/
│           └── page.tsx                    # ダッシュボード再設計（TodayTimeline/CollabRequests 除去）
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx                     # 全面リライト（アコーディオン・折りたたみ・Material Icons）
│   │   ├── AppShell.tsx                    # 変更なし（Sidebar が幅を自己管理するため不要）※確認のみ
│   │   └── TopBar.tsx                      # 通知ベルをドロップダウントリガーへ変更
│   │
│   ├── notifications/
│   │   └── NotificationDropdown.tsx        # 新規：通知ドロップダウンコンポーネント
│   │
│   └── dashboard/
│       └── TaskBoardPreview.tsx            # 新規：ダッシュボード用タスクカードグリッド
│
└── stores/
    ├── sidebar.ts                          # 新規：サイドバー折りたたみ Zustand store
    └── notifications.ts                    # 変更：markAllRead() stub 追加

# 削除ファイル（デッドコード除去）
src/
└── components/
    ├── notifications/
    │   └── NotificationBell.tsx            # 削除：どこからもインポートされていない死んだコード
    └── dashboard/
        ├── TodayTimeline.tsx               # 削除：dashboard から除去後に他に使用箇所なし
        └── CollabRequests.tsx              # 削除：dashboard から除去後に他に使用箇所なし
```

**Structure Decision**: Next.js App Router の既存構造を維持したまま、変更対象ファイルを最小限に絞る。新規ファイルは既存の命名規則・ディレクトリ規則に従う。

---

## Phase 0: Research

### R-001: Material Icons 統合方法

**Decision**: Google Fonts CDN リンクを `src/app/layout.tsx` の JSX 内 `<head>` 相当部分に直接追加する

**Rationale**:

- `next/font/google` は Material Icons アイコンフォントに非対応（テキストフォント専用 API）
- `@material-icons/font` npm パッケージはバンドルサイズが ~3MB と過大
- CDN リンク1行で導入でき、パフォーマンスへの影響を最小化できる
- Next.js App Router では `<link>` を `layout.tsx` の JSX に直接記述することで `<head>` に挿入される

**実装**:

```tsx
// src/app/layout.tsx
<link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />
```

**Alternatives considered**:

- `@material-ui/icons` — MUI 依存でバンドルが重すぎる（却下）
- Lucide Icons — 要件に Material Icons 指定あり（却下）

---

### R-002: Azouaoui Mohamed サイドバーパターン分析

**Decision**: 以下の構造で Sidebar をリライトする

```
Sidebar (260px ↔ 72px 折りたたみ)
├── Header
│   ├── ロゴアイコン（クリック → /dashboard）
│   ├── アプリ名「リスケるGG」（折りたたみ時は非表示）
│   └── トグルボタン（menu / menu_open アイコン）
│
├── Nav (overflow-y: auto)
│   ├── Section: メイン（アコーディオン）
│   │   ├── スケジュール → /schedule
│   │   ├── タスク管理   → /tasks
│   │   └── コラボ調整   → /collabs（未読バッジ付き）
│   │
│   ├── Section: チーム管理（アコーディオン）
│   │   ├── メンバー       → /team
│   │   ├── 通知設定       → /notifications
│   │   └── チャンネル設定 → /settings
│   │
│   └── Section: 各種連携（アコーディオン）
│       ├── Googleカレンダー（将来実装・現状 disabled）
│       ├── Discord（将来実装・現状 disabled）
│       ├── YouTube（将来実装・現状 disabled）
│       └── X (Twitter)（将来実装・現状 disabled）
│
└── Footer
    ├── ユーザーアバター・名前・プランバッジ
    └── サインアウトボタン
```

**折りたたみ挙動**:

- 幅: `w-[260px]`（展開）↔ `w-[72px]`（折りたたみ）、`transition-[width]` でアニメーション
- 折りたたみ時: アイコンのみ表示。テキスト・バッジ・矢印は `opacity-0 w-0 overflow-hidden` で非表示
- アコーディオン: セクションヘッダークリックで詳細項目を展開/収納（`openSections` state 管理）
- 折りたたみ時はアコーディオンを全て閉じた外観に（子アイテムはアイコンのみでも表示しない → ツールチップ方式は採用しない）
- `collapsed` 状態は Zustand persist で localStorage に永続化

---

### R-003: 通知ドロップダウン実装方針

**Decision**: TopBar の通知ベルをクリックすると `position: absolute` のドロップダウンパネルを表示する

**実装詳細**:

- TopBar の `position: relative` コンテナ内に `position: absolute top-full right-0` のドロップダウン
- `useEffect` で `document` の click イベントをリッスン、ドロップダウン外クリックで閉じる
- 最大4件の通知を一覧表示（未読ドット・通知本文・日時）
- 「すべて見る →」リンクで `/notifications` へ遷移
- 「既読にする」ボタンで全通知を既読化

**Rationale**:

- `docs/risukeru_gg_screens.html` の `.notif-popup` 実装に準拠
- `/notifications` ページへの遷移なしにインラインで確認できる UX

---

### R-004: ダッシュボード統計ウィジェット5種

**Decision**: StatCard を `grid-cols-2 md:grid-cols-5` で配置（既存4枚→5枚に拡張）

| ウィジェット     | データソース                                             | 備考                |
| ---------------- | -------------------------------------------------------- | ------------------- |
| 今月の配信枠数   | `schedules`（当月フィルタ）                              | 既存ロジック流用    |
| 今月の動画投稿数 | `tasks.filter(t => t.category === 'editing').length`     | フェーズ1プロキシ値 |
| 今月のタスク数   | `tasks.length`                                           | 全タスク件数        |
| コラボ調整中     | `collabSessions.filter(s => s.status === 'open').length` | 既存ロジック流用    |
| タスク完了率     | `doneTasks / tasks * 100`                                | 既存ロジック流用    |

**Note**: 「動画投稿数」は ScheduleEntry に `type` フィールドがないため `editing` カテゴリタスク数で代替。ラベルを「今月の編集タスク数」と表示して誤解を防ぐことも検討する。

---

### R-005: タスクカード詳細モーダル

**Decision**: ダッシュボードのタスクカードクリック → 既存 `Modal` コンポーネントを使用して詳細表示

- 表示項目: タスク名・カテゴリバッジ・期限・担当者アバター+名前・カラム（進捗状態）
- 編集は `/tasks` ページへのリンクのみ（モーダル内での編集は不要）
- `TaskBoardPreview` コンポーネント内に `selectedTask: Task | null` state を持つ

---

## Phase 1: Design & Contracts

### データモデル差分（UIステート）

```typescript
// src/stores/sidebar.ts — 新規
interface SidebarState {
  collapsed: boolean;
  openSections: string[]; // 展開中のセクションラベル配列
  toggleCollapsed: () => void;
  toggleSection: (label: string) => void;
  openSection: (label: string) => void;
}

// 初期値: collapsed=false, openSections=['メイン']（メインを最初から展開）
// persist: localStorage key='risukeru-sidebar'
```

---

### コンポーネント契約

#### `Sidebar` (リライト)

```typescript
// props なし（Zustand から全状態を取得）
// src/components/layout/Sidebar.tsx
export function Sidebar(): JSX.Element;
```

**Material Icons 使用一覧**:

| セクション         | アイテム           | Material Icon                    |
| ------------------ | ------------------ | -------------------------------- |
| ヘッダー           | トグルボタン       | `menu` / `menu_open`             |
| メイン             | セクションヘッダー | `dashboard`                      |
| メイン             | スケジュール       | `calendar_month`                 |
| メイン             | タスク管理         | `task_alt`                       |
| メイン             | コラボ調整         | `handshake`                      |
| チーム管理         | セクションヘッダー | `groups`                         |
| チーム管理         | メンバー           | `person`                         |
| チーム管理         | 通知設定           | `notifications`                  |
| チーム管理         | チャンネル設定     | `settings`                       |
| 各種連携           | セクションヘッダー | `integration_instructions`       |
| 各種連携           | Googleカレンダー   | `event`                          |
| 各種連携           | Discord            | `forum`                          |
| 各種連携           | YouTube            | `smart_display`                  |
| 各種連携           | X (Twitter)        | `tag`                            |
| セクション展開矢印 | -                  | `chevron_right`（rotate で開閉） |

---

#### `NotificationDropdown` (新規)

```typescript
// src/components/notifications/NotificationDropdown.tsx
interface NotificationDropdownProps {
  open: boolean;
  onClose: () => void;
}
export function NotificationDropdown({
  open,
  onClose,
}: NotificationDropdownProps): JSX.Element | null;
```

**動作仕様**:

- `open=false` → `null` を返す（DOM から除去）
- `open=true` → ドロップダウンパネルを absolute 配置で表示
- `useNotificationsStore()` から通知リストを取得
- 外部クリック検知: `useEffect` + `ref` + `document.addEventListener('mousedown', ...)`

---

#### `TaskBoardPreview` (新規)

```typescript
// src/components/dashboard/TaskBoardPreview.tsx
interface TaskBoardPreviewProps {
  tasks: Task[];
  columns: KanbanColumn[];
  members: TeamMember[];
}
export function TaskBoardPreview({ tasks, columns, members }: TaskBoardPreviewProps): JSX.Element;
```

**カードレイアウト**:

- グリッド: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3`
- カード表示: タスク名（bold）・カテゴリバッジ・期限・担当者アバター
- クリック: `selectedTask` state → Modal 表示
- 空状態: 「タスクはありません」メッセージ

---

### TopBar 変更仕様

```typescript
// 通知ベル部分の変更
// 変更前: <Link href="/notifications">ベルアイコン</Link>
// 変更後: <button onClick={() => setDropdownOpen(o => !o)}>ベルアイコン</button>
//         <NotificationDropdown open={dropdownOpen} onClose={() => setDropdownOpen(false)} />
```

TopBar コンポーネントに `dropdownOpen: boolean` state を追加。`position: relative` の wrapper 要素内に NotificationDropdown を配置。

---

### AppShell — 変更不要（確認のみ）

**Decision**: AppShell.tsx はコード変更不要。

`Sidebar` コンポーネント自体が `w-[260px]` / `w-[72px]` を `transition-[width]` とともに自己管理する。`AppShell` が `<Sidebar />` を `flex` 子要素として配置している現行レイアウトは自動的に伸縮するため、AppShell 側の幅指定変更は不要。実装後の目視確認のみ行う（T010）。

---

### Notifications Store 追加: `markAllRead()` stub

**Decision**: フェーズ1では Firestore 書き込みなしのローカル state 更新のみ実装する。

```typescript
// src/stores/notifications.ts に追加
markAllRead: () => {
  // フェーズ1: Firestore 書き込みなしのローカル state 更新のみ
  // 本実装（Firestore write）は将来の通知機能チケットで行う
  set((s) => ({
    unreadCount: 0,
    notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
  }));
},
```

**Rationale**: UI ドロップダウンの「既読にする」ボタンを機能させる最小実装。Firestore write は通知専用チケットで実装し、このチケットのスコープを UI のみに限定する（Constitution I: シンプルさ優先）。

---

### デッドコード削除方針

実装後に以下のファイルを削除する。削除前に `grep` で残存インポートがないことを必ず確認する。

| ファイル                                            | 削除理由                                        |
| --------------------------------------------------- | ----------------------------------------------- |
| `src/components/notifications/NotificationBell.tsx` | 現時点で既にどこからもインポートされていない    |
| `src/components/dashboard/TodayTimeline.tsx`        | dashboard/page.tsx から除去後、他に使用箇所なし |
| `src/components/dashboard/CollabRequests.tsx`       | dashboard/page.tsx から除去後、他に使用箇所なし |

---

## Complexity Tracking

| 要素                      | 理由                                                   | シンプルな代替が不十分な理由                             |
| ------------------------- | ------------------------------------------------------ | -------------------------------------------------------- |
| Zustand persist (sidebar) | サイドバー折りたたみ状態をリロード後も維持する UX 要件 | セッション state のみではリロードのたびにリセットされる  |
| Material Icons CDN        | 要件で Google Material Icons が明示指定                | 代替アイコンセットでは要件を満たせない                   |
| markAllRead stub          | NotificationDropdown の「既読にする」ボタンに必要      | UI を作るためだけに Firestore write まで実装するのは過剰 |

---

## 実装ステップ概要（tasks.md を参照）

| #   | タスク | 作業                                          | ファイル                                                |
| --- | ------ | --------------------------------------------- | ------------------------------------------------------- |
| 1   | T001   | Material Icons CDN 追加                       | `src/app/layout.tsx`                                    |
| 2   | T002   | Sidebar Zustand store 作成                    | `src/stores/sidebar.ts`                                 |
| 2a  | T002a  | markAllRead stub 追加                         | `src/stores/notifications.ts`                           |
| 3   | T003   | Sidebar 全面リライト                          | `src/components/layout/Sidebar.tsx`                     |
| 4   | T004   | TaskBoardPreview 新規作成                     | `src/components/dashboard/TaskBoardPreview.tsx`         |
| 5   | T005   | Dashboard ページ再設計 + 旧コンポーネント除去 | `src/app/(protected)/dashboard/page.tsx`                |
| 6   | T006   | NotificationDropdown 新規作成                 | `src/components/notifications/NotificationDropdown.tsx` |
| 7   | T007   | TopBar 通知ベル → ドロップダウン変更          | `src/components/layout/TopBar.tsx`                      |
| 8   | T008   | 型チェック                                    | `pnpm typecheck`                                        |
| 9   | T009   | デッドコード削除                              | 3ファイル削除                                           |
| 10  | T010   | AppShell 確認                                 | `src/components/layout/AppShell.tsx`（確認のみ）        |
| 11  | T011   | lint                                          | `pnpm lint`                                             |
| 12  | T012   | format                                        | `pnpm format`                                           |
| 13  | T013   | 目視確認                                      | `pnpm dev`                                              |

---

## 非対象（今回スコープ外）

- スケジュール・タスク管理・コラボ・チーム管理画面 自体の UI 変更
- 各種連携の実機能実装（Googleカレンダー/Discord/YouTube/X）
- モバイル向け BottomNav の変更
- 「動画投稿数」の正確なデータモデル拡張（フェーズ2）
- PWA 対応・オフライン機能
- `markAllRead` の Firestore 書き込み本実装（将来の通知機能チケット）
