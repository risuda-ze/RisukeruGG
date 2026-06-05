# Research: タスク管理画面 UIリデザイン (v3 + v4)

**Branch**: `014-task-ui-redesign` | **Date**: 2026-06-04（v3: コントロールバー再設計 追記）

---

---

## v3 設計判断（2026-06-04）

### 1. TaskControlBar の実装方式

**Decision**: `src/components/kanban/TaskControlBar.tsx` を新規作成し、`tasks/page.tsx` の既存カテゴリフィルタ行・ボードヘッダー行を置換する

**Rationale**:
- 現状の `tasks/page.tsx` はカテゴリフィルタ行（〜10行）とボードヘッダー行（〜15行）が分離しており、左右レイアウトへの統合が困難
- コンポーネント分離により `tasks/page.tsx` の肥大化を防ぐ（Constitution I: 1コンポーネント1責務）
- フィルタ state（`activeCategoryIds`, `activeAssigneeId`）は `tasks/page.tsx` で管理し、TaskControlBar に prop として渡す（state lifting パターン）

**Alternatives considered**:
- `tasks/page.tsx` に直接記述 → ページコンポーネントが肥大化するため不採用
- Zustand に移動 → フィルタは UI state であり、ページローカルで十分

### 2. カテゴリフィルタ複数選択の実装

**Decision**: `activeCategoryIds: string[]`（空配列=全表示）で複数選択を管理する。OR条件でタスクをフィルタする

**Rationale**:
- `Set<string>` より `string[]` の方が React state との相性がよい（不変性管理が容易）
- OR条件は直感的：「どれかのカテゴリに属するタスクを見たい」ユーザー行動に合致
- AND条件にすると複数選択で件数が激減し UX が悪化する

**Alternatives considered**:
- AND条件 → 複数選択すると件数が急減し実用性が低い

### 3. 担当者フィルタの UI

**Decision**: HTML `<select>` + Tailwind スタイルを使用する

**Rationale**:
- メンバー数は最大10〜20名程度。カスタムドロップダウン不要（Constitution I）
- `<select>` はモバイルのネイティブピッカーと自動統合されるため UX が良い
- デザインは既存ボタン・プルダウンの CSS カスタムプロパティに合わせる

### 4. 動的列幅の実装

**Decision**: CSS `flex: 1 1 0` + `minWidth: 180px` を使用する。JavaScript や ResizeObserver は不要

**Rationale**:
- `flex: 1 1 0` は CSS だけで「利用可能な幅をアイテム数で均等分割」を実現する
- ユーザー要件「表示可能な領域をステータスの長さで割ってイチカラム当たりの幅を決める」を最小コードで満たす
- スクロールコンテナ（`overflow-x: auto`）が残るため、列が多くなっても minWidth により崩れない
- ResizeObserver + state は Constitution I 違反（過剰実装）

---

## 実機検証で確認した現状（2026-06-03）

### 検証環境
- ブラウザ: Playwright（Chromium）
- データ: Firebase Emulator + シードデータ（タスク14件）
- ビューポート: PC 1440×900・タブレット 768×1024・モバイル 390×844

### PC (1440px) — 動作状況

| 項目 | 状態 | 備考 |
|---|---|---|
| カンバン3列表示 | ✅ | 列が可変幅 (flex-1) |
| カテゴリバッジ | ✅ | 既存バッジあり（新デザインのアイコン付きチップとは異なる） |
| 担当者・期限 | ✅ | — |
| 緊急度チップ | ❌ | 未実装 |
| 列の「＋」ボタン | ❌ | 未実装 |
| ヒントバー | ❌ | 未実装 |
| ゴーストカラム | ❌ | 未実装 |

### タブレット (768px) — 障害

| 障害 | 原因推定 |
|---|---|
| TopBar subtitle が縦にはみ出す | TopBar に `flex-shrink-0` + `whitespace-nowrap` が不足している可能性 |
| 右列カードが画面端でクリップ | カンバン列が `min-w-[240px]` 固定なので合計幅 > 768px になる |

### モバイル (390px) — 深刻な障害

| 障害 | 原因（コード確認済み） |
|---|---|
| カンバンが水平スクロールのまま表示 | tasks/page.tsx の KanbanBoard コンポーネントがモバイル条件分岐なし。`flex gap-4 overflow-x-auto` で横スクロール表示される |
| ステータスピル＋縦リストが存在しない | モバイル専用コンポーネント（`task-mobile.jsx` 相当）が未実装 |
| MobileToolbar — 実際には実装済み | AppShell に `<MobileToolbar />` あり・`pb-16 md:pb-0` も設定済み。検証スクリーンショットではエミュレーターバナー（z-index高）に隠れていた可能性が高い |

### 詳細モーダル (PC) — デザイン差分

| 項目 | 現状 | 仕様 |
|---|---|---|
| モーダル幅 | `min(850px, ...)` | `960px` |
| コメント入力 | `<textarea rows={2}>` | 丸型一行フィールド (`border-radius: full`) + 送信ボタン |
| フッターボタン | 削除 / 閉じる | 削除（編集時のみ） / キャンセル / **保存** |
| 自分/相手バブル区別 | なし（全て同スタイル） | 自分=右揃え・相手=左揃え |
| リプライ機能 | あり | なし（フラットチャットのみ） |

---

## 設計判断（v2 更新 + /speckit-clarify 2026-06-03 確定事項）

### 0. /speckit-clarify で確定した事項

| 質問 | 決定 | 影響箇所 |
|-----|------|---------|
| モバイル正規ブレークポイント | **390px**（iPhone 14 標準幅） | メディアクエリ・テストビューポート |
| 緊急度チップ「soon」閾値 | **期限2日以内（today 除く）** | `src/lib/urgency.ts` |
| MobileToolbar 配置方針 | **AppShell を修正**して tasks ページを内包 | AppShell.tsx 調査・修正 |
| モバイル詳細フォーム表示方式 | **フルスクリーンオーバーレイ**（URL変更なし） | TaskDetailModal.tsx |
| D&D のスコープ | **PC（カンバン）のみ有効** | KanbanBoard.tsx |

### 1. モバイルレイアウトの実装方式

**Decision**: tasks/page.tsx に `md:hidden` / `hidden md:block` でモバイル専用 UI をコンポーネント分離して実装する

**Rationale**:
- デザイン仕様（task-mobile.jsx）ではステータスピル＋縦リストで全く異なるレイアウト
- KanbanBoard は DnD ライブラリを使用しており、モバイルにそのまま使うのは UX が悪い
- `useMediaQuery` フックや `useState` でスクリーン幅を分岐するより、Tailwind の responsive prefix で CSS 制御する方がシンプル（Constitution I）

**Alternatives considered**:
- KanbanBoard のカラムを縦積みに変更 → 列が縦に長くなりすぎて UX 悪化
- react-responsive 等を追加 → 依存関係の追加が不要

**実装方針**:
```tsx
// tasks/page.tsx
<div className="hidden md:block"> {/* PC: カンバン */}
  <KanbanBoard ... />
</div>
<div className="md:hidden"> {/* モバイル: ステータスピル + リスト */}
  <TaskMobileBoard ... />
</div>
```

### 2. TaskMobileBoard コンポーネント

**Decision**: `src/components/kanban/TaskMobileBoard.tsx` を新規作成する

**Rationale**:
- ステータスピル切替・縦リスト・固定「＋」ボタンというモバイル専用ロジックは KanbanBoard と全く別
- 1ファイル = 1責務（Constitution I）

### 3. TaskDetailModal の統合（追加+編集）

**Decision**: `task: Task | null`（null = 新規）で統合する

**Rationale**: スケジュール画面の ScheduleModal と同じパターン。TaskForm は削除。

### 4. コメント機能のシンプル化

**Decision**: リプライ（parentId）機能を削除し、フラットチャット形式のみ実装する

**Rationale**: デザイン仕様（task-pc.jsx）はリプライなし。Constitution I（シンプルさ優先）に準拠。

### 5. TopBar の tablet 対応

**Decision**: TopBar の subtitle に `hidden lg:block` または `truncate` を追加する

**Rationale**: 768px ではサイドバー（250px幅）＋ main の残りが約520pxしかなく、subtitle が折り返す。`hidden lg:block` で tablet では非表示にするか、`truncate` で1行に収める。

---

## CSS 変数の対応表

| デザイン変数 | globals.css 変数 | 備考 |
|---|---|---|
| `var(--surface)` | `var(--surface)` | 一致 |
| `var(--card)` | `var(--card)` | 一致 |
| `var(--card-border)` | `var(--card-border)` | 013 で追加済み |
| `var(--primary-950)` | `var(--primary-950)` | 一致 |
| `var(--primary-800)` | `var(--primary-800)` | 一致 |
| `var(--danger-dim)` | 未定義 → 追加 | `rgba(240,80,110,0.15)` |
| `var(--success-dim)` | 未定義 → 追加 | `rgba(61,214,140,0.15)` |
| `var(--warning-dim)` | 未定義 → 追加 | `rgba(239,159,39,0.15)` |
| `var(--glow-primary)` | `var(--glow-primary)` | 013 で追加済み |
| `var(--font-head)` | `var(--font-head)` | 013 で追加済み |

---

---

## v4 設計判断（2026-06-05）

### 1. `/settings/tasks` ルート設計

**Decision**: `src/app/(protected)/settings/tasks/page.tsx` を新規作成する

**Rationale**:
- `TaskControlBar` はすでに `router.push('/settings/tasks')` で遷移しているが、このルートが存在しない（404）
- `/settings` の `tasks` タブと同内容のスタンドアロンページとして作成するのが最小変更
- `/settings` の `tasks` タブも独立して維持する（既存ユーザーへの影響なし）

**Alternatives considered**:
- `/settings?tab=tasks` 形式 → `TaskControlBar` のソース変更が不要になるが URL 可読性が低く、将来の直リンクに不便
- `/settings` の `tasks` タブを `/settings/tasks` へリダイレクト → バックナビゲーション UX が複雑になるため却下

### 2. `TaskStatus.icon` フィールド設計

**Decision**: `icon: string | null` を `TaskStatus` に追加（後方互換 Firestore フィールド）

**Rationale**:
- `ScheduleCategory` と同一の `icon: string` パターンを採用
- 既存ドキュメントは `icon` フィールドなし → `toColumn()` の `data.icon as string | null ?? null` でフォールバック
- Material Icons 名前文字列（`pending`, `check_circle`, etc.）を格納

**実装変更点**:
- `src/types/entities.ts`: `TaskStatus` に `icon: string | null` 追加
- `src/lib/repositories/taskStatuses.ts`: `toColumn()` に `icon` 読み取り追加、`createColumn()` の型修正

### 3. `TaskCategory.icon` フィールド設計

**Decision**: `icon: string | null` を `TaskCategory` に追加（後方互換）

**Rationale**: `ScheduleCategory` / `TaskStatus` と完全に同一パターン

**実装変更点**:
- `src/types/entities.ts`: `TaskCategory` に `icon: string | null` 追加
- `src/lib/repositories/taskCategories.ts`: `toTaskCategory()` に `icon` 読み取り追加、`updateTaskCategory()` の `Pick` 型に `icon` 追加

### 4. 設定UIのアイコン選択ピッカー

**Decision**: 既存 `ICON_OPTIONS` を拡張し、タスクステータス・タスクカテゴリ共通で使用する

**ステータス用追加アイコン**:
```
'pending', 'check_circle', 'cancel', 'hourglass_empty', 'rocket_launch', 'flag'
```

**実装**: `settings/page.tsx` の `TaskManagementSettings` → `KanbanSettings` と `TaskCategorySettings` に `ScheduleCategorySettings` と同一のアイコンピッカー UI を追加する

### 5. カンバン列ヘッダーのアイコン表示

**Decision**: カラーバー（`<span className="w-1 h-[17px] rounded-full">`) の直後にアイコンを挿入

```tsx
{column.icon && (
  <span className="material-icons text-[15px] shrink-0" style={{ color: column.color }}>
    {column.icon}
  </span>
)}
```

### 6. カテゴリバッジのアイコン表示

**Decision**: `TaskControlBar` のカテゴリバッジと `TaskCard` のカテゴリチップに Material Icons を追加

```tsx
// TaskControlBar
{cat.icon && <span className="material-icons text-[11px]">{cat.icon}</span>}
{cat.name}

// TaskCard
{category.icon && <span className="material-icons text-[10px]">{category.icon}</span>}
{category.name}
```

### 7. TaskDetailModal のアイコン表示

**Decision**: `Dropdown` コンポーネントを拡張せず、選択中の値を示すカスタム表示部分にアイコンを追加する

**実装方針**:
- `TaskDetailModal` では現在 `Dropdown` コンポーネントを使ってステータス・カテゴリを選択している
- 選択中の値の表示エリア（ドロップダウン上部のラベル表示）にアイコンを追加する
- `<select>` の `<option>` 内部にはアイコンを入れられないため、選択されたアイテムのプレビューとして `icon + name` を表示する
- 具体的には、Dropdown の上に選択中アイテムのアイコンを表示するカスタムプレフィックスを追加する

---

## 実装リスク

| リスク | 影響度 | 対策 |
|---|---|---|
| TaskForm 削除による import エラー | 中 | tasks/page.tsx から TaskForm import を削除 |
| TaskMobileBoard と KanbanBoard の重複 state | 低 | 両者とも `useTasksStore` を参照するだけなので状態共有は不要 |
| 詳細モーダル：新規追加の Zod バリデーション | 中 | 既存 taskSchema を流用。`react-hook-form` は使わず controlled state で実装（既存 TaskDetailModal パターンに合わせる） |
| リプライデータの削除 | 低 | 既存の parentId コメントは Firestore に残るが UI に表示しないだけ |
