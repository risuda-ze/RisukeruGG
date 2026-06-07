# Implementation Plan: タスク管理画面 UIリデザイン v4

**Branch**: `014-task-ui-redesign` | **Date**: 2026-06-05 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/014-task-ui-redesign/spec.md`

**Note**: v1〜v3（T001〜T050）は実装完了済み。本プランは **v4（設定画面専用ルート・アイコン対応）** を対象とする。

---

## Summary

タスク管理画面の `TaskControlBar` が遷移先として参照している `/settings/tasks` ルートを新規作成し、そのページでタスクステータスとタスクカテゴリのアイコン設定を可能にする。あわせてカンバン列ヘッダー・カテゴリバッジ・タスク詳細モーダルでアイコンを表示できるよう、データモデル（`TaskStatus.icon`、`TaskCategory.icon`）とUIコンポーネントを更新する。

---

## Technical Context

**Language/Version**: TypeScript 5 (strict: true), Node.js 22  
**Primary Dependencies**: Next.js 14 (App Router), Tailwind CSS, Zustand, Firebase Firestore  
**Storage**: Firebase Firestore（`teams/{teamId}/taskStatuses`・`teams/{teamId}/taskCategories`）  
**Testing**: Vitest（ユニット）、Playwright（E2E）  
**Target Platform**: Web（PC / タブレット / モバイル 390px）  
**Project Type**: Web application (Next.js App Router)  
**Performance Goals**: 現状維持（ページ遷移 < 200ms）  
**Constraints**: Material Icons はグローバルロード済み（追加ライブラリ不要）  
**Scale/Scope**: 1チーム最大20ステータス・20カテゴリ程度

---

## Constitution Check

| 原則 | 確認 | 備考 |
|---|---|---|
| I. シンプルさ優先 | ✅ | 既存の `ScheduleCategory` パターンを再利用。新抽象化なし |
| II. TypeScript型安全 | ✅ | `icon: string \| null` で型安全。`any` 不使用 |
| III. テスト方針 | ✅ | 設定画面 E2E のみ追加（Constitution III 必須対象）|
| IV. Firebase・セキュリティ | ✅ | 既存リポジトリパターン踏襲。Security Rules 変更なし |
| V. 日本語コメント | ✅ | 全コメント日本語で記述 |

**Complexity Tracking**: 違反なし。

---

## Project Structure

### Documentation (this feature)

```text
specs/014-task-ui-redesign/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # v4 tasks (/speckit-tasks command output)
```

### Source Code (v4 変更対象)

```text
src/
├── types/
│   └── entities.ts                          # TaskStatus / TaskCategory に icon フィールド追加
├── lib/repositories/
│   ├── taskStatuses.ts                      # toColumn() / createColumn() に icon 対応
│   └── taskCategories.ts                    # toTaskCategory() / updateTaskCategory() に icon 対応
├── app/(protected)/settings/
│   └── tasks/
│       └── page.tsx                         # 新規: タスク管理設定スタンドアロンページ
└── components/kanban/
    ├── KanbanBoard.tsx                      # 列ヘッダーにステータスアイコン追加
    ├── TaskCard.tsx                         # カテゴリチップにアイコン追加
    ├── TaskControlBar.tsx                   # カテゴリバッジにアイコン追加
    └── TaskDetailModal.tsx                  # ステータス・カテゴリ選択にアイコン追加

tests/e2e/tasks/
└── task-settings-icon.spec.ts              # 新規: v4 E2E テスト
```

**Structure Decision**: 既存 Next.js App Router 構造に従う。新規ファイルは `settings/tasks/page.tsx` のみ。

---

## Sprint Plan

### Sprint 1: データモデル + `/settings/tasks` ページ

**目標**: データモデルを更新し、アイコン設定可能な `/settings/tasks` ページを作成する

**実装ファイル**:
1. `src/types/entities.ts` — `TaskStatus` / `TaskCategory` に `icon: string | null` 追加（順次: T052 → T053）
2. `src/lib/repositories/taskStatuses.ts` — `toColumn()` に icon 読み取り + `createColumn()` の `icon` 任意型修正（既存 settings/page.tsx との後方互換を保つ）
3. `src/lib/repositories/taskCategories.ts` — `toTaskCategory()` に icon 読み取り + `createTaskCategory()` の `icon` 任意型修正
4. `src/app/(protected)/settings/tasks/page.tsx` — 新規作成（`KanbanStatusSettings` + `TaskCategorySettings` コンポーネントを含むアイコンピッカー付き設定UI）

**受け入れ基準（SC）**: SC-016, SC-020

### Sprint 2: アイコン表示 UI

**目標**: カンバン・カード・詳細モーダルでアイコンを表示する

**実装ファイル**:
1. `src/components/kanban/KanbanBoard.tsx` — 列ヘッダーにアイコン挿入
2. `src/components/kanban/TaskCard.tsx` — カテゴリチップにアイコン追加
3. `src/components/kanban/TaskControlBar.tsx` — カテゴリバッジにアイコン追加
4. `src/components/kanban/TaskDetailModal.tsx` — ステータス・カテゴリ表示にアイコン追加

**受け入れ基準（SC）**: SC-017, SC-018, SC-019

### Sprint 3: E2E テスト + 品質確認

**目標**: 受け入れ基準の E2E テストと静的解析確認

**実装ファイル**:
1. `tests/e2e/tasks/task-settings-icon.spec.ts` — 新規作成

**受け入れ基準（SC）**: SC-020, SC-021
