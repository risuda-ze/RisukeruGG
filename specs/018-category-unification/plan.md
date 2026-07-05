# 018 カテゴリ統合（スケジュール／タスク共通化）

## 目的

これまで独立していた「スケジュールカテゴリ」と「タスクカテゴリ」を単一の共有カテゴリに統合し、
アプリ内のカテゴリ設定を1画面で行えるようにする。

## 確定した設計判断（ユーザー確認済み）

| 論点 | 決定 |
| --- | --- |
| 統合モデル | **単一の共有カテゴリ**。`teams/{teamId}/categories` を新設し、タスク・スケジュール両方で共有・選択する |
| 既存データ | **空から作り直す**。旧 `scheduleCategories` / `taskCategories` は破棄し、移行は行わない。既存の categoryId 参照は解決できなければ「未選択」表示 |
| 編集権限 | **operator のみ**（旧タスクカテゴリは member も可だったが operator に統一） |
| アイコン | **任意（未設定可 / `icon: string | null`）**。未設定時、カレンダー等は既存の条件表示にフォールバック |

## データモデル

`Category`（`src/types/entities.ts`）
```
id: string
name: string
color: string
order: number
icon: string | null   // 任意
createdAt: Date
```
旧 `TaskCategory` / `ScheduleCategory` は削除。`Task.categoryId` / `ScheduleEntry.categoryId` は不変。

## 変更点

### 新規
- `src/lib/repositories/categories.ts` — `teams/{teamId}/categories` の CRUD。
  削除時は **タスクとスケジュール両方**の参照 `categoryId` を null に一括更新（writeBatch）。
- `src/stores/categories.ts` — `useCategoryStore`（`categories` / `loading` / `subscribe`）。

### 画面
- `/settings/tasks` → **`/settings/categories`** に改称し、ページ名を **「カテゴリ設定」** に変更。
  - 統合カテゴリ管理セクション（operator のみ・アイコン任意）。
  - タスクステータス（カラム）管理セクションは他に置き場所がないため同ページ内に維持。
- 旧タブ式 `/settings/page.tsx`（ナビ未リンクの孤立ページ・旧ストア依存）を削除。
- ナビ改称: `Sidebar` / `MobileToolbar`（「タスク管理設定」→「カテゴリ設定」・href 更新）、
  `TaskControlBar` の設定ボタン遷移先を `/settings/categories` に更新。

### 参照切替（旧2ストア/型 → 統合）
- スケジュール系: `schedule/page`, `ScheduleModal`, `MonthCalendar`, `WeekCalendar`
- タスク系: `tasks/page`, `TaskCard`, `TaskControlBar`, `TaskDetailModal`, `TaskMobileBoard`, `TaskBoardPreview`
- 旧 `stores/taskCategories`・`stores/scheduleCategories`・`repositories/taskCategories`・`repositories/scheduleCategories` を削除。

### インフラ
- `firestore.rules` — 旧 `scheduleCategories` / `taskCategories` の match を単一 `categories`（read: メンバー / write: **operator のみ** = `isTeamOwner`）へ統合。
- `scripts/seed.mjs` — 旧2コレクションのシードを `categories` に統合（既存 ID `scat*` / `tcat*` を維持して参照を保つ）。
- E2E: `task-settings-icon.spec.ts`（ルート/タイトル）・`visual.spec.ts`（`/settings` → `/settings/categories`）を更新。

## 検証

- `pnpm typecheck` エラー0件
- `pnpm lint` エラー0件（既存 warning のみ）
- `pnpm test` 全パス
