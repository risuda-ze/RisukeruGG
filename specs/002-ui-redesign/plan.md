# Implementation Plan: タスク管理画面 リデザイン（一覧フル幅 + 詳細モーダル + 設定画面）

**Branch**: `002-002-redesign` | **Date**: 2026-05-17 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-ui-redesign/spec.md` + ユーザー追加要件

## Summary

タスク管理画面を `docs/risukeru_gg_screens.html` のモックに合わせて改修する。主な変更は3点：
（1）カンバンボードを画面幅いっぱいに表示するレイアウト変更、（2）ステータス・カテゴリ・担当者・期限・タスク説明・コメントをインライン編集できるタスク詳細モーダル（`TaskDetailModal`）の新規作成、（3）設定画面の「タスク管理」タブに列の管理・カテゴリの管理・ステータスの管理の 3 セクションを追加。

カテゴリ管理を Firestore バック方式にするため、`Task.category`（enum）→ `Task.categoryId`（Firestore ID）への型変更を含む。これが本計画の最も影響範囲の大きい変更となる。

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: Next.js 14 (App Router), React, Tailwind CSS 4, Zustand, @hello-pangea/dnd, React Hook Form, Zod, date-fns, Firebase Firestore
**Storage**: Cloud Firestore — `teams/{teamId}/tasks/`、`teams/{teamId}/taskCategories/`（新規）コレクション
**Testing**: Vitest (unit), Playwright (E2E)
**Target Platform**: Web (Desktop — md ブレークポイント以上が主対象)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: UI インタラクション 60fps、Firestore 書き込み < 500ms
**Constraints**: TypeScript strict、`any` 禁止、日本語コメント、既存デザイントークン使用
**Scale/Scope**: チーム単位のタスク管理、1チームあたりカラム 10 個・タスク 100 件以下を想定

## Constitution Check

| Principle               | Status | Notes                                                                               |
| ----------------------- | ------ | ----------------------------------------------------------------------------------- |
| I. シンプルさ優先       | ✅     | TaskDetailModal は既存パターン踏襲。TaskCategory は ScheduleCategory と同パターン    |
| II. TypeScript型安全    | ✅     | Task.categoryId: string \| null に変更。既存 toTask() にフォールバック追加           |
| III. テスト方針         | ✅     | E2E テスト（Playwright）で設定画面・詳細モーダルの UI 一致を確認                     |
| IV. Firebase・セキュリティ | ✅  | taskCategories サブコレクションに Security Rules 追加。チームスコープで保護            |
| V. 日本語コメント       | ✅     | 全コメントを日本語で記述                                                               |

_GATE: 違反なし。Complexity Tracking 不要。_

## Project Structure

### Documentation (this feature)

```text
specs/002-ui-redesign/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (affected files)

```text
src/
├── types/
│   └── entities.ts                               # TaskCategory インターフェース追加、Task.categoryId 変更
├── lib/
│   ├── repositories/
│   │   ├── tasks.ts                              # toTask() 更新（categoryId、description）
│   │   ├── kanbanColumns.ts                      # toColumn() に role フィールド追加
│   │   └── taskCategories.ts                     # 【新規】TaskCategory CRUD
│   └── validations/
│       └── tasks.ts                              # taskSchema 更新（categoryId、description）
├── stores/
│   └── taskCategories.ts                         # 【新規】TaskCategory Zustand ストア
├── components/
│   └── kanban/
│       ├── KanbanBoard.tsx                       # 列幅をフレックス均等に変更
│       ├── TaskCard.tsx                          # categoryId 対応・カード全体クリック
│       ├── TaskDetailModal.tsx                   # 【新規】タスク詳細モーダル
│       └── TaskForm.tsx                          # categoryId 対応
└── app/
    └── (protected)/
        ├── tasks/
        │   └── page.tsx                          # TaskDetailModal 状態管理
        └── settings/
            └── page.tsx                          # タブ名変更・3セクション追加

firestore.rules                                   # taskCategories ルール追加
scripts/seed.mjs                                  # taskCategories シードデータ追加

tests/
└── e2e/
    └── tasks.spec.ts                             # カンバン・詳細モーダル・設定画面テスト
```

**Structure Decision**: 既存 Next.js App Router 構成に準拠。`taskCategories.ts` は `scheduleCategories.ts` と同パターン。

## Complexity Tracking

> _Constitution Check に違反なし — このセクションは空欄。_
