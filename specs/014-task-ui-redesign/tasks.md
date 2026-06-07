# Tasks: タスク管理画面 UIリデザイン (v3 + v4)

**Input**: Design documents from `/specs/014-task-ui-redesign/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

> **注記**: v1〜v2 実装（T001〜T037）は全て完了済み。v3 実装（T038〜T050）は全て完了済み（T051 は E2E 環境依存のため保留中）。
> **v4 タスク（T052〜T065）は本 tasks.md の下部に追記済み**。

**Organization**: v3 修正は User Story 7（フィルタリング）が中心。v4 は User Story 8〜10（設定ルート・アイコン対応）。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 他タスクと並列実行可能（異なるファイル・依存なし）
- **[Story]**: 対応する User Story（US7 = v3のフィルタリングストーリー）

---

## Phase 3: User Story 7 — タスクフィルタリング (P1) 🎯

**Goal**: カテゴリ複数選択バッジ＋担当者プルダウンの `TaskControlBar` を新規作成し、既存の2行 UI を置き換える

**Independent Test**: `pnpm dev` → localhost:3000/tasks を開き、TaskControlBar が TopBar 直下に表示される。カテゴリバッジを複数クリックで OR フィルタが機能し、担当者プルダウンで絞り込みが動作する。CSV ボタンが存在しない

- [X] T038 [US7] `src/components/kanban/TaskControlBar.tsx` を新規作成する。Props: `categories: TaskCategory[], members: TeamMember[], activeCategoryIds: string[], activeAssigneeId: string | null, taskCount: number, canEdit: boolean, isLightPlanFull: boolean, onCategoryToggle: (id: string) => void, onClearCategories: () => void, onAssigneeChange: (id: string | null) => void, onAddTask: () => void, onShowHint: () => void`。左エリア（`flex-1 overflow-x-auto scrollbar-none`）に「すべて」バッジ＋カテゴリバッジ（`activeCategoryIds` 含まれる場合は `bg-purple-d text-purple-l`）＋担当者 `<select>`（全メンバー + 「すべて」）を配置。右エリア（`shrink-0`）に件数テキスト＋タスク追加 Button（`variant="amber"`・`isLightPlanFull` 時 disabled）＋設定 Button（`/settings/tasks` 遷移）＋? button を配置。モバイル (390px) でも同一1行レイアウトを維持する
- [X] T039 [US7] `src/app/(protected)/tasks/page.tsx` の状態管理を変更する。`activeFilter: string` を `activeCategoryIds: string[]` と `activeAssigneeId: string | null` に置き換える。`toggleCategory(catId)` と `clearCategories()` と `changeAssignee(id)` ハンドラを実装する。`filteredTasks` を `activeCategoryIds.length === 0 || activeCategoryIds.includes(t.categoryId ?? '')` (OR条件) と `activeAssigneeId === null || t.assigneeId === activeAssigneeId` (AND条件) の複合フィルタに変更する
- [X] T040 [P] [US7] `src/app/(protected)/tasks/page.tsx` の既存カテゴリフィルタ行（`<div className="flex gap-2 px-4 py-3 ...">すべて + カテゴリバッジ</div>`）を削除する
- [X] T041 [P] [US7] `src/app/(protected)/tasks/page.tsx` の既存ボードヘッダー行（`<div className="hidden md:flex items-center gap-2 px-7 pb-2 ...">件数 + 設定ボタン + ?ボタン</div>`）を削除する
- [X] T042 [US7] `src/app/(protected)/tasks/page.tsx` に `TaskControlBar` を import し、TopBar 直下（ライトプラン警告より上）に配置する。TopBar の `children` を空にする（既存の CSV ボタン・タスク追加 Button を削除）。TaskControlBar に T039 の state とハンドラを接続する

**Checkpoint**: localhost:3000/tasks で TaskControlBar が表示され、カテゴリ複数選択・担当者プルダウン・タスク追加ボタンが機能することを確認する

---

## Phase 4: CSV出力廃止 (FR-019)

**Goal**: CSV 出力機能をコードベースから完全に排除する

**Independent Test**: localhost:3000/tasks に「CSVエクスポート」ボタンが存在しない（SC-013）

- [X] T043 [P] `src/app/(protected)/tasks/page.tsx` から `import { exportTasksCsv } from '@/lib/utils/exportTasksCsv'` 行を削除する（T042 で既に Button 削除済みのため import のみ残る場合の対処）
- [X] T044 [P] `src/lib/utils/exportTasksCsv.ts` ファイルを削除する

**Checkpoint**: `pnpm typecheck` でエラーなし。ブラウザで CSV ボタンが存在しないことを確認する

---

## Phase 5: KanbanBoard レイアウト変更 (FR-002, FR-004)

**Goal**: ゴーストカラム削除・カンバン列幅を動的均等分割に変更する

**Independent Test**: localhost:3000/tasks (PC 1440px) でカンバン末尾に「ステータス列を追加」ゴーストカラムが存在しない（SC-014）。列幅が均等に広がりステータス数に応じて自動調整される（SC-001）

- [X] T045 `src/components/kanban/KanbanBoard.tsx` からゴーストカラムブロック（`{/* ゴーストカラム: ＋ ステータス列を追加 */}` から `</div>` まで）を削除する
- [X] T046 [P] `src/components/kanban/KanbanBoard.tsx` の `TaskStatusPanel` コンポーネントで列の幅スタイルを変更する。`className` から `flex-none` を削除し、`style` の `width: '304px'` を削除して `flex: '1 1 0'` と `minWidth: '180px'` を追加する。`data-model.md` の変更仕様を参照すること

**Checkpoint**: PC 1440px でカンバン列が画面幅を均等に埋め、ゴーストカラムが存在しないことを確認する。D&D（ドラッグ&ドロップ）が引き続き動作することを確認する（SC-010 回帰なし）

---

## Phase 6: TaskCard フッター再構成 (FR-022)

**Goal**: カードフッターの表示順を「締め切り日時 → 担当者 → 緊急度バッジ」に変更する

**Independent Test**: 期限付きタスクのカードフッター最初の要素に `M/d HH:mm` 形式の日時が表示される（SC-015）

- [X] T047 `src/components/kanban/TaskCard.tsx` のフッター `<div className="flex items-center gap-1.5 flex-wrap">` 内の要素順序を変更する。①`task.dueDate` の日付表示を先頭に移動し `format(task.dueDate, 'M/d HH:mm', { locale: ja })` 形式に変更する。②担当者アバター+名前ブロックを2番目に移動する。③`<UrgencyChip>` を末尾に維持する

**Checkpoint**: タスクカードのフッターに「M/d HH:mm」が最初に表示され、次に担当者アバター、最後に緊急度バッジが並ぶことを確認する（SC-015）

---

## Phase 7: Polish & 品質確認

**Purpose**: TypeScript/ESLint クリーンアップ・E2E テスト追加・v3 回帰なし確認

⚠️ **Constitution III 必須**: タスク管理の主要ユーザージャーニー（フィルタリング）の E2E テストは必須

- [X] T048 [P] `pnpm typecheck` を実行してコンパイルエラーが 0 件であることを確認する。エラーがあれば修正する（SC-009）
- [X] T049 [P] `pnpm lint` を実行して ESLint エラーが 0 件であることを確認する。エラーがあれば `pnpm lint:fix` で修正する（SC-009）
- [X] T050 [P] `tests/e2e/tasks/task-control-bar.spec.ts` を新規作成する。以下のシナリオを実装する: ①SC-011: カテゴリバッジを複数クリックし OR 条件でタスクがフィルタされる。②SC-012: 担当者プルダウンで選択した担当者のタスクのみ表示される。③SC-013: CSV出力ボタンが存在しない。④SC-014: 「ステータス列を追加」ゴーストカラムが存在しない。⑤SC-015: 期限付きタスクカードフッターの先頭要素に `M/d HH:mm` 形式の日時が表示される
- [ ] T051 `pnpm test:e2e` を実行して全 E2E テスト（v2 分含む）がグリーンであることを確認する（SC-010 回帰なし）<!-- 要: .env.local + Firebase Emulator 起動済み環境 -->

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 3 (US7)**: v2 完了が前提 — T038 と T039 を先に完了してから T042 へ進む
- **Phase 4 (CSV廃止)**: Phase 3 と並列実行可能（別ファイル）
- **Phase 5 (KanbanBoard)**: Phase 3 と並列実行可能（別ファイル）
- **Phase 6 (TaskCard)**: Phase 3〜5 と並列実行可能（別ファイル）
- **Phase 7 (Polish)**: 全実装フェーズ完了後

### User Story 7 内の依存関係

- T038 → T042 に必要（コンポーネント作成後に import）
- T039 → T042 に必要（state 変更後に TaskControlBar へ接続）
- T040・T041 → T042 の前に削除を完了しておく（同ファイルなので順序が重要）
- T043・T044 → T042 完了後に CSV import が残っている場合のクリーンアップ

### Parallel Opportunities

- T038・T039 は Tasks/page.tsx と TaskControlBar.tsx で異なるファイルのため並列実行可能
- T040・T041・T043 は削除のみで軽量、T038 と並列実施可能
- T044・T045・T046・T047 は全て異なるファイルのため完全並列可能
- T048・T049・T050 は並列実行可能

---

## Parallel Example: Phase 3 (US7)

```bash
# 並列実行:
Agent A: T038 (TaskControlBar.tsx 新規作成)
Agent B: T039 (tasks/page.tsx state 変更)
Agent C: T040 + T041 (旧 UI 行削除)

# 合流後:
T042 (TaskControlBar 挿入・接続) — A・B・C 完了後

# その後、完全並列:
Agent D: T044 (exportTasksCsv.ts 削除)
Agent E: T045 + T046 (KanbanBoard 変更)
Agent F: T047 (TaskCard フッター変更)
```

---

## Implementation Strategy

### MVP First (US7 のみ)

1. Phase 3: TaskControlBar 完成（T038 → T039 → T040 → T041 → T042）
2. **STOP & VALIDATE**: TaskControlBar 表示確認・複数選択フィルタ・担当者フィルタ動作確認
3. Phase 4〜6: 独立した変更を順次実施
4. Phase 7: 品質確認

### Incremental Delivery

1. T038 + T039 → TaskControlBar の骨格完成
2. T040 + T041 → 旧 UI 削除
3. T042 → 統合・接続
4. T043 + T044 → CSV 廃止
5. T045 + T046 → KanbanBoard 変更
6. T047 → TaskCard 変更
7. T048〜T051 → 品質確認

---

## Notes (v3)

- [P] = 異なるファイルで依存なし、並列実行可能
- v2 の T001〜T037 は全て完了済み（`pnpm test` グリーン・D&D 動作確認済み）
- T042 は T038・T039・T040・T041 の全てが完了してから着手する
- `exportTasksCsv` の import は TypeScript で未使用 import としてエラーになる可能性があるため T048 で必ず確認する
- TaskControlBar の担当者 `<select>` は既存の `members` prop をそのまま渡す（全メンバー表示・追加 API 呼び出し不要）
- カテゴリなしのタスク（`categoryId === null/undefined`）は `activeCategoryIds.length === 0` の時のみ表示（フィルタ選択中は除外される）

---

---

## Phase 8: User Story 8 — `/settings/tasks` ルート + データモデル (P1) ★ v4

**Goal**: データモデル（`TaskStatus.icon`・`TaskCategory.icon`）を追加し、設定ボタンの遷移先 `/settings/tasks` ページを新規作成する

**Independent Test**: `pnpm dev` → localhost:3000/tasks の設定ボタンをクリックして `/settings/tasks` に遷移できる。ページにはステータス管理とカテゴリ管理のセクションが表示される（SC-016）。`pnpm typecheck` がエラー0件

- [X] T052 [P] [US8] `src/types/entities.ts` の `TaskStatus` インターフェースに `icon: string | null;` フィールドを追加する（`role` フィールドの直後に挿入。JSDoc コメントで「Material Icons 名。未設定は null」と説明する）。※ T053 とは独立した変更だが同一ファイルのため T052 完了後に T053 を実行すること
- [X] T053 [US8] `src/types/entities.ts` の `TaskCategory` インターフェースに `icon: string | null;` フィールドを追加する（`order` フィールドの直後に挿入。JSDoc コメントで「Material Icons 名。未設定は null」と説明する）。**T052 完了後に実施**（同一ファイル競合回避）
- [X] T054 [US8] `src/lib/repositories/taskStatuses.ts` を2箇所変更する。①`toColumn()` 関数に `icon: (data.icon as string | null) ?? null,` を追加する（`role` フィールドの直後）。②`createColumn()` の引数型を変更し、`icon` を任意フィールドにする: `Omit<TaskStatus, 'id' | 'role' | 'createdAt'> & { icon?: string | null }` — これにより既存の `settings/page.tsx` の `createColumn()` 呼び出しが TypeScript エラーなしで動作する（既存呼び出しには `icon` が未指定だが `undefined` は Firestore で無視されるため後方互換）
- [X] T055 [US8] `src/lib/repositories/taskCategories.ts` を2箇所変更する。①`toTaskCategory()` 関数に `icon: (data.icon as string | null) ?? null,` を追加する（`order` フィールドの直後）。②`createTaskCategory()` の引数型を変更し、`icon` を任意フィールドにする: `Omit<TaskCategory, 'id' | 'createdAt'> & { icon?: string | null }` — これにより既存の `settings/page.tsx` の `createTaskCategory()` 呼び出しが TypeScript エラーなしで動作する。③`updateTaskCategory()` の `Pick` 型に `'icon'` を追加する（`Partial<Pick<TaskCategory, 'name' | 'color' | 'order' | 'icon'>>`）
- [X] T056 [US8] `src/app/(protected)/settings/tasks/page.tsx` を新規作成する。内容: `'use client'` 宣言・`TopBar title="タスク管理設定"` ・`KanbanStatusSettings` コンポーネント（ステータス管理 with アイコンピッカー）と `TaskCategorySettings` コンポーネント（カテゴリ管理 with アイコンピッカー）を順に配置する。これらは `settings/page.tsx` の同名コンポーネントとは**別定義**（コピーベースで icon 対応を追加）。アイコン候補定数 `TASK_ICON_OPTIONS = ['pending','check_circle','cancel','hourglass_empty','rocket_launch','flag','event','sports_esports','video_library','live_tv','mic','movie','music_note','star','campaign','group','school','build']` をファイル内に定義する。`createColumn()`・`updateColumn()` 呼び出し時に `icon` フィールドを含める。`createTaskCategory()`・`updateTaskCategory()` 呼び出し時に `icon` フィールドを含める。既存の `DEFAULT_COLORS` は `settings/page.tsx` と同じ配列をローカルに定義する

**Checkpoint**: `/settings/tasks` にアクセスできる。ステータス追加フォームとカテゴリ追加フォームにアイコンピッカーが表示される（SC-016）

---

## Phase 9: User Story 9〜10 — アイコン表示 UI (P1) ★ v4

**Goal**: カンバン列ヘッダー・カテゴリバッジ・カテゴリチップ・タスク詳細モーダルでアイコンを表示する

**Independent Test**: `/settings/tasks` でステータスにアイコンを設定 → カンバン列ヘッダーにアイコンが表示される（SC-017）。カテゴリにアイコンを設定 → TaskControlBar バッジと TaskCard チップにアイコンが表示される（SC-018）。タスク詳細モーダルでアイコンが表示される（SC-019）

- [X] T057 [P] [US9] `src/components/kanban/KanbanBoard.tsx` の `TaskStatusPanel` 内カラムヘッダー部分（`{/* カラムヘッダー */}` ブロック）を変更する。カラーバー `<span className="w-1 h-[17px] rounded-full shrink-0" .../>` の直後に、`{column.icon && (<span className="material-icons text-[15px] shrink-0" style={{ color: column.color }}>{column.icon}</span>)}` を追加する
- [X] T058 [P] [US10] `src/components/kanban/TaskControlBar.tsx` のカテゴリバッジ `<button>` 要素内を変更する。`{cat.name}` の前に `{cat.icon && (<span className="material-icons text-[11px]">{cat.icon}</span>)}` を追加し、`gap-1.5` の button className に `gap-1` を加える（アイコン + テキスト間隔）
- [X] T059 [P] [US10] `src/components/kanban/TaskCard.tsx` のカテゴリチップ `<span className="inline-flex items-center self-start ...">` 内を変更する。`{category.name}` の前に `{category.icon && (<span className="material-icons text-[10px]">{category.icon}</span>)}` を追加する（`gap-1` は既存の `items-center` で対応）
- [X] T060 [US9] [US10] `src/components/kanban/TaskDetailModal.tsx` を変更する。`currentColumn` と `currentCategory` はすでにファイル内で定義済み（`const currentCategory = categories.find(...)` / `const currentColumn = columns.find(...)` の行）。①`columnId` を選択する `<Dropdown value={columnId} ...>` の直前の行に、選択中ステータスのアイコンプレビューを追加する。`<Dropdown>` を `<div className="flex items-center gap-2">` で包み、その先頭に `{currentColumn?.icon && (<span className="material-icons text-[16px]" style={{ color: currentColumn?.color }}>{currentColumn.icon}</span>)}` を挿入する。②`categoryId` を選択する `<Dropdown value={categoryId} ...>` に対して同様に処理する: `{currentCategory?.icon && (<span className="material-icons text-[16px]" style={{ color: currentCategory?.color }}>{currentCategory.icon}</span>)}`

**Checkpoint**: アイコン付きステータス/カテゴリを設定してカンバン・詳細モーダルで確認（SC-017, SC-018, SC-019）

---

## Phase 10: Polish & 品質確認 (v4)

**Purpose**: TypeScript / ESLint クリーンアップ・回帰なし確認

⚠️ **Constitution III 必須**: 設定画面の主要ユーザージャーニー（設定ページ遷移・アイコン表示）の E2E テストは必須

- [X] T061 [P] `pnpm typecheck` を実行してコンパイルエラーが 0 件であることを確認する。エラーがあれば修正する（SC-020）
- [X] T062 [P] `pnpm lint` を実行して ESLint エラーが 0 件であることを確認する。エラーがあれば `pnpm lint:fix` で修正する（SC-020）
- [X] T063 `tests/e2e/tasks/task-settings-icon.spec.ts` を新規作成する。以下のシナリオを実装する: ①SC-016: タスク管理画面の設定ボタンをクリックすると `/settings/tasks` に遷移し、ページタイトルに「タスク管理設定」が表示される。②SC-017: `/settings/tasks` でステータス一覧が表示され、カラムヘッダーの構造が存在することを確認する（アイコン設定は Firestore 依存のため smoke test のみ）。③SC-018: `/settings/tasks` でカテゴリ一覧が表示されることを確認する。④SC-019: タスクカードクリックで詳細モーダルが開き、ステータス・カテゴリの表示エリアが存在することを確認する。⑤SC-021: v3 の主要機能（カンバン表示・カテゴリバッジ・担当者フィルタ）が引き続き動作することを確認する（回帰なし）
- [ ] T064 `pnpm test:e2e` を実行して全 E2E テスト（v3 分含む）がグリーンであることを確認する（SC-021 回帰なし）<!-- 要: .env.local + Firebase Emulator 起動済み環境 -->

---

## Dependencies & Execution Order (v4)

### Phase Dependencies (v4)

- **Phase 8 (US8)**: T052 → T053（同一ファイルのため順次。並列不可）→ T054 + T055（並列可）→ T056 の順
- **Phase 9 (US9/US10)**: Phase 8 の T052〜T055 完了が前提（型変更後でないと型エラーが出る）
- **Phase 10 (Polish)**: 全実装フェーズ完了後

### User Story Dependencies (v4)

- **US8**: T052・T053（型）→ T054・T055（リポジトリ）→ T056（ページ）の順
- **US9/US10**: Phase 8 完了後に並列実行可能（T057・T058・T059 は異なるファイル）。T060 のみ T057〜T059 完了後に確認
- **US9 と US10**: 同一フェーズで並列実行可能

### Parallel Opportunities (v4)

- T052・T053: 異なる型変更（同一ファイルだが互いに独立した行）— 順次実行を推奨
- T054・T055: 異なるファイルのリポジトリ更新 — **並列実行可能** [P]
- T057・T058・T059: 異なるファイルの UI 変更 — **並列実行可能** [P]
- T061・T062: 独立した静的解析 — **並列実行可能** [P]

---

## Parallel Example: Phase 9 (US9/US10)

```bash
# Phase 8 完了後に並列実行:
Agent A: T057 (KanbanBoard.tsx — 列ヘッダーにアイコン追加)
Agent B: T058 (TaskControlBar.tsx — カテゴリバッジにアイコン追加)
Agent C: T059 (TaskCard.tsx — カテゴリチップにアイコン追加)

# 合流後:
T060 (TaskDetailModal.tsx — ステータス・カテゴリ表示にアイコン追加)
```

---

## Implementation Strategy (v4)

### MVP First (US8)

1. T052 + T053 → 型定義更新
2. T054 + T055 → リポジトリ更新
3. T056 → `/settings/tasks` ページ作成
4. **STOP & VALIDATE**: `/settings/tasks` アクセス確認・アイコン設定 UI 動作確認

### Incremental Delivery

1. Phase 8 完了（データモデル + 設定ページ）
2. Phase 9 実施（アイコン表示 UI）— Phase 8 がブロッカー
3. Phase 10 品質確認

---

## Notes (v4)

- T052・T053 は同一ファイル（`entities.ts`）の変更のため順次実行する（競合回避）
- T056 は `settings/page.tsx` の `KanbanSettings` / `TaskCategorySettings` コンポーネントをベースにして、アイコンピッカーを追加する。ただし `settings/page.tsx` 本体は変更しない（既存 UI を壊さないため）
- `material-icons` は既にグローバルロード済みのため追加 import 不要
- T060 での `Dropdown` コンポーネントは HTML `<select>` ラッパーのためオプション内のアイコン表示は不可。選択中の値の表示エリア（Dropdown の外側）にアイコンを表示する方式で実装する
- T063 の E2E は Firestore Emulator なしでも動作するよう、アイコン設定値の変化より「ページ・UI 要素の存在確認」を中心に実装する
