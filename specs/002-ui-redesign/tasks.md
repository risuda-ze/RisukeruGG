# Tasks: タスク管理画面 リデザイン（一覧フル幅 + 詳細モーダル + 設定画面）

**Input**: Design documents from `/specs/002-ui-redesign/`
**Prerequisites**: plan.md ✅ spec.md ✅ data-model.md ✅ research.md ✅ quickstart.md ✅

**スプリント**: スプリント2（スプリント1のサイドバー・ダッシュボード・通知は実装済み）
**対応FR**: FR-TASK-001〜FR-TASK-011（spec.md スプリント2セクション参照）
**Organization**: 「基盤（破壊的変更）→ US4（カンバン全幅）→ US5（詳細モーダル）→ US6（設定画面）」の順。基盤フェーズが完了するまでUS4〜US6は開始できない。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並行実行可能（別ファイル、未完了タスクへの依存なし）
- **[Story]**: 対応するユーザーストーリー（US4, US5, US6）
- 各タスクに正確なファイルパスを記載

---

## Phase 1: Setup（確認のみ）

**Purpose**: 既存プロジェクトのため初期設定は不要。作業前提条件を確認する。

- [X] T001 Firebase エミュレーター起動確認（`docker-compose up -d`）・開発サーバー動作確認（`pnpm dev`）・シード実行（`node scripts/seed.mjs`）して動作を確認する

---

## Phase 2: Foundational（破壊的変更 — 全ユーザーストーリーの前提）

**Purpose**: `Task.category`（enum）→ `Task.categoryId`（Firestore ID）への型変更（FR-TASK-007）と、新規エンティティの基盤整備。**このフェーズが完了するまで US4〜US6 は開始できない。**

**⚠️ CRITICAL**: T003〜T009 は T002 完了後に全て並行実行可能。T009 のみ T005 完了後に実施。

- [X] T002 `src/types/entities.ts` を更新（FR-TASK-007・FR-TASK-008）: ①deprecated `TaskCategoryKey = 'shooting' | 'editing' | 'thumbnail' | 'announcement' | 'other'` を追加し `@deprecated` JSDoc を付与、②新規 `TaskCategory` インターフェース（id: string・name: string・color: string・order: number・createdAt: Date）を追加、③`Task` 型から `category: TaskCategory` フィールドを削除し `categoryId: string | null` と `description: string | null` を追加、④`KanbanColumn` 型に `role: 'done' | null` フィールドを追加
- [X] T003 [P] `src/lib/repositories/tasks.ts` の `toTask()` を更新（FR-TASK-007）: `categoryId: (data.categoryId as string | null) ?? null` と `description: (data.description as string | null) ?? null` を追加。`category` フィールドのマッピングを削除（T002 完了後に実施）
- [X] T004 [P] `src/lib/repositories/kanbanColumns.ts` の `toColumn()` を更新（FR-TASK-008）: `role: (data.role as 'done' | null) ?? null` を追加（T002 完了後に実施）
- [X] T005 [P] `src/lib/repositories/taskCategories.ts` を新規作成（FR-TASK-005・FR-TASK-006）: `scheduleCategories.ts` と同パターンで `createTaskCategory(teamId, data)`・`updateTaskCategory(teamId, categoryId, data)`・`deleteTaskCategory(teamId, categoryId)`（削除時は `tasks` コレクション内の `categoryId === 削除対象ID` を `null` に一括 Firestore 更新）・`subscribeTaskCategories(teamId, callback)` を実装（T002 完了後に実施）
- [X] T006 [P] `src/lib/validations/tasks.ts` の `taskSchema` を更新（FR-TASK-007）: `category` フィールドを削除し `categoryId: z.string().nullable().default(null)` を追加・`description: z.string().max(2000).nullable().default(null)` を追加（T002 完了後に実施）
- [X] T007 [P] `src/lib/utils/exportTasksCsv.ts` を更新（FR-TASK-011）: ①関数シグネチャに `categories: TaskCategory[]` パラメーターを追加、②`CATEGORY_LABELS` 定数（`Record<Task['category'], string>`）を削除、③カテゴリ表示を `categories.find(c => c.id === task.categoryId)?.name ?? ''` に変更（T002 完了後に実施）
- [X] T008 [P] `src/stores/taskCategories.ts` を新規作成（FR-TASK-005）: `scheduleCategories.ts` と同パターンで `taskCategories: TaskCategory[]`・`loading: boolean`・`subscribe(teamId)` を持つ Zustand ストアを実装（T005 完了後に実施）
- [X] T009 [P] `firestore.rules` を更新（FR-TASK-005、Constitution IV）: `teams/{teamId}/taskCategories/{categoryId}` コレクションに、チームメンバーのみ読み書き可能なセキュリティルールを追加（`scheduleCategories` ルールと同パターン）
- [X] T010 [P] `scripts/seed.mjs` を更新: `taskCategories` シードデータ追加（編集・企画・台本・動画編集の 4 カテゴリ、各カテゴリに `color`・`order` を設定）・既存タスクシードの `category` フィールドを `categoryId`（追加したカテゴリのIDを参照）に変更

**Checkpoint**: 基盤完了 — `pnpm typecheck` でエラーゼロを確認し、`exportTasksCsv.ts` に `Task['category']` 参照が残っていないことを確認してから US4〜US6 を開始

---

## Phase 3: User Story 4 — カンバンボード フル幅レイアウト (Priority: P1) 🎯 MVP

**Goal**: カンバンボードを画面幅いっぱいに表示し（FR-TASK-001）、`Task.categoryId` 対応とカード全体クリックで詳細モーダルを開く準備をする（FR-TASK-002・FR-TASK-005）。

**Independent Test**: `/tasks` を開くとカンバンが画面幅いっぱいに表示され（列が均等に画面を分割）、カード上にカテゴリ名が `taskCategories` ストアから取得されて正しく表示される。

### Implementation for User Story 4

- [X] T011 [US4] `src/components/kanban/KanbanBoard.tsx` を更新（FR-TASK-001）: `KanbanColumnPanel` コンポーネントの幅クラスを `flex-shrink-0 w-[272px]` から `flex-1 min-w-[240px]` に変更してフル幅レイアウトを実現（research.md R-006 参照）
- [X] T012 [P] [US4] `src/components/kanban/TaskCard.tsx` を更新（FR-TASK-002・FR-TASK-005）: ①`task.category` 参照を `task.categoryId` に変更・カテゴリ名は `taskCategories` ストアから `categories.find(c => c.id === task.categoryId)?.name` で取得・②カードのルート要素（`編集ボタン`・`削除ボタン` 以外の全領域）に `onClick={() => onEdit(task)}` を追加（編集ボタン自体も `onEdit(task)` を呼び出す — TaskForm ではなく TaskDetailModal に遷移する、research.md R-010 参照）
- [X] T013 [P] [US4] `src/components/kanban/TaskForm.tsx` を更新（FR-TASK-005）: `category` フィールドを削除し `categoryId: string | null` フィールドを追加・`taskCategories` ストアから取得したカテゴリ一覧で `<select>` を描画（新規作成専用フォームとして機能、既存の TaskForm ベースの編集フローは削除）

**Checkpoint**: フル幅レイアウトが動作し、カテゴリ名がストア連携で表示されることを確認

---

## Phase 4: User Story 5 — タスク詳細モーダル（インライン編集） (Priority: P1)

**Goal**: タスクカードをクリックすると `TaskDetailModal` が開き、全フィールドのインライン編集ができる（FR-TASK-002・FR-TASK-003・FR-TASK-004）。

**Independent Test**: タスクカードをクリックすると `TaskDetailModal` が開き、ステータス（onChange 即時保存）・カテゴリ（onChange 即時保存）・担当者（鉛筆アイコン→select→保存ボタン）・期限（カレンダーアイコン→date input→保存ボタン）・タスク説明（鉛筆アイコン→textarea→保存ボタン）が編集できる。フッター左に「削除」・右に「閉じる」ボタンがある（各フィールドが独立保存するためフッター右は「保存」ではなく「閉じる」）。

### Implementation for User Story 5

- [X] T014 [US5] `src/components/kanban/TaskDetailModal.tsx` を新規作成（FR-TASK-002・FR-TASK-003・FR-TASK-004）:
  - **Props**: `{ task: Task; teamId: string; members: TeamMember[]; columns: KanbanColumn[]; categories: TaskCategory[]; canEdit: boolean; onClose: () => void; onDeleted: () => void; }`
  - **レイアウト**: `ScheduleDetailModal` / `CollabDetailModal` と同パターン — オーバーレイ（`fixed inset-0 bg-black/50 z-50`）+ 中央配置 720px 幅ポップアップ・上部グラデーションバー（タスクのカテゴリ色を使用）
  - **クリックアウト**: `useRef<HTMLDivElement>` + `useEffect` で `document.mousedown` をリッスン、`ref.current` に含まれない場合は `onClose()` を呼び出す（research.md R-004 パターン）
  - **フィールド編集**:
    - タイトル: 表示時は `<h2>` + 鉛筆アイコン → `editingTitle = true` で `<input>` 表示 → `blur` / `Enter` で `updateTask(teamId, task.id, { title })` 保存
    - ステータス（columnId）: `<select>` で `columns` を選択肢として表示 → `onChange` で即時 `updateTask(teamId, task.id, { columnId })` 保存
    - カテゴリ（categoryId）: `<select>` で `categories` + 「なし」を選択肢として表示 → `onChange` で即時 `updateTask(teamId, task.id, { categoryId })` 保存
    - 担当者: 表示時はアバター + 氏名 + 鉛筆アイコン → `editingAssignee = true` で `<select>` 表示 → 「保存」ボタンで `updateTask(teamId, task.id, { assigneeId })` 保存
    - 期限: 表示時は日付 + カレンダーアイコン → `editingDueDate = true` で `<input type="date">` 表示 → 「保存」ボタンで `updateTask(teamId, task.id, { dueDate })` 保存
    - タスク説明: 表示時はテキスト + 鉛筆アイコン → `editingDescription = true` で `<textarea>` 表示 → 「保存」ボタンで `updateTask(teamId, task.id, { description })` 保存
  - **コメント**: `useState<LocalComment[]>` でローカル管理（Firestore 保存なし）。コメント入力フォーム + 送信でリストに追加（research.md R-009 参照）
  - **フッター**: 左に「削除」ボタン（`deleteTask()` 呼び出し後 `onDeleted()` → `onClose()`）・**右に「閉じる」ボタン**（`onClose()` 呼び出し）（FR-TASK-004 — 各フィールドが独立保存するためフッター右は「閉じる」）
- [X] T015 [US5] `src/app/(protected)/tasks/page.tsx` を更新（FR-TASK-002・FR-TASK-005）: ①`selectedTask: Task | null` 状態を追加（初期値 `null`）、②`taskCategories` ストアの `subscribe(teamId)` を `useEffect` で呼び出し、③`TaskCard` の `onEdit` ハンドラーを `(task) => setSelectedTask(task)` に変更（TaskForm 編集フロー削除）、④`TaskDetailModal` をレンダリング（`onClose: () => setSelectedTask(null)`・`onDeleted: () => setSelectedTask(null)`、Firestore `onSnapshot` で自動更新されるためローカルリストの手動フィルタ不要）

**Checkpoint**: タスクカードクリックでモーダルが開き、全フィールドの表示・編集・保存が動作することを確認

---

## Phase 5: User Story 6 — 設定画面「タスク管理」タブ (Priority: P1)

**Goal**: 設定画面の「カンバン」タブを「タスク管理」タブにリネームし、3 セクションを追加する（FR-TASK-010・FR-TASK-005・FR-TASK-008）。

**Independent Test**: `/settings` の「タスク管理」タブを開くと「列の管理」「カテゴリの管理」「ステータスの管理」の 3 セクションが表示される。カテゴリ CRUD が Firestore に反映され、完了ステータス設定がダッシュボードの完了率計算に使用される。

### Implementation for User Story 6

- [X] T016 [US6] `src/app/(protected)/settings/page.tsx` を更新（FR-TASK-010・FR-TASK-005・FR-TASK-008）:
  - タブ key を `'kanban'` → `'tasks'`・ラベルを「カンバン」→「タスク管理」に変更
  - `taskCategories` ストアの `subscribe(teamId)` を `useEffect` で呼び出し
  - **「列の管理」セクション**: 既存 `KanbanSettings` コンポーネントをそのまま再利用
  - **「カテゴリの管理」セクション**: `taskCategories` ストアから一覧取得、カテゴリごとに名前・色を表示し「編集」「削除」ボタンを配置・「カテゴリを追加」ボタンでインライン入力フォームを表示・`createTaskCategory` / `updateTaskCategory` / `deleteTaskCategory` で Firestore に保存（`ScheduleCategorySettings` と同パターン、research.md R-012 参照）
  - **「ステータスの管理」セクション**: `columns` 一覧を表示・各カラム行に「完了ステータスとしてマーク」ラジオボタン（単一選択）を配置・選択時に `updateColumn(teamId, selectedColumnId, { role: 'done' })` を呼び出し、他の全カラムを `updateColumn(teamId, otherId, { role: null })` で更新（research.md R-013 参照）

**Checkpoint**: 設定画面でカテゴリ・ステータスの CRUD が動作し、設定が `/tasks` ページと `/dashboard` に反映されることを確認

---

## Phase 6: Polish & 横断的修正

**Purpose**: ダッシュボード修正・型安全確認・E2E テスト追加（SC-TASK-004・SC-TASK-005）

- [X] T017 `src/app/(protected)/dashboard/page.tsx` を更新（FR-TASK-009）: タスク完了率計算の `columns.find(c => c.name === '完了' || c.name === 'Done')` を `columns.find(c => c.role === 'done')` に変更（カラム名依存の脆弱な実装を廃止）
- [X] T018 `pnpm typecheck` を実行しコンパイルエラーゼロを確認・型エラーがあれば修正（特に `Task['category']` 参照が残っていないかを確認）
- [X] T019 `tests/e2e/tasks.spec.ts` を更新（SC-TASK-005）: カンバンフル幅レイアウト確認・タスクカードクリックでモーダル開口・各フィールド編集（ステータス/カテゴリ/担当者/期限/説明）・フッター「削除」「閉じる」ボタン動作・設定画面「タスク管理」タブの列/カテゴリ/ステータス管理 UI 検証テストを追加
- [X] T020 `node scripts/seed.mjs` でシードデータ再投入・quickstart.md の手順に従いローカルで動作を通しで確認

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし — 即座に開始可能
- **Foundational (Phase 2)**: Setup 完了後 — **全ユーザーストーリーをブロック**
- **US4 (Phase 3)**: Foundational 完了後に開始可能
- **US5 (Phase 4)**: Foundational 完了後に開始可能（T014 は US4 の T012 完了後推奨 — `onEdit` ハンドラーの挙動変更が前提）
- **US6 (Phase 5)**: Foundational 完了後に開始可能 — US4/US5 と完全独立
- **Polish (Phase 6)**: 全ユーザーストーリー完了後

### User Story Dependencies

- **US4 (P1)**: Foundational 完了後に開始 — 他ストーリーへの依存なし
- **US5 (P1)**: Foundational 完了後に開始 — T014（モーダル本体）は独立・T015 は T012 完了後推奨
- **US6 (P1)**: Foundational 完了後に開始 — US4/US5 に依存なし

### Within Each Phase

- T002 が最初（`entities.ts` は全ての基盤）
- T003〜T010 は T002 完了後に全て並行実行可能（T009 のみ T005 完了後）
- T011〜T013 は Foundational 完了後に並行実行可能（全て別ファイル）
- T014 は Foundational 完了後・T013 完了後が推奨
- T015 は T014 と T012 完了後
- T016 は Foundational 完了後（US4/US5/US6 と独立）

### Parallel Opportunities

- Foundational フェーズ: T003〜T010 は T002 完了後に全て並行実行可能
- US4 フェーズ: T011・T012・T013 は並行実行可能（全て別ファイル）
- US6（T016）は US4/US5 と完全に並行実行可能

---

## Parallel Example: Foundational Phase

```
T002 完了後、以下を全て並行実行:

Task: "toTask() を categoryId + description 対応に更新 (src/lib/repositories/tasks.ts)"
Task: "toColumn() に role フィールド追加 (src/lib/repositories/kanbanColumns.ts)"
Task: "taskCategories.ts リポジトリ新規作成 (src/lib/repositories/taskCategories.ts)"
Task: "taskSchema を categoryId + description 対応に更新 (src/lib/validations/tasks.ts)"
Task: "exportTasksCsv.ts を categoryId + TaskCategory[] 対応に更新 (src/lib/utils/exportTasksCsv.ts)"
Task: "firestore.rules に taskCategories ルール追加"
Task: "seed.mjs に taskCategories シードデータ追加 (scripts/seed.mjs)"

T005 完了後に追加:
Task: "taskCategories Zustand ストア新規作成 (src/stores/taskCategories.ts)"
```

---

## Implementation Strategy

### MVP First（US4 のみ）

1. Phase 1: Setup 確認
2. Phase 2: Foundational 完了（型・リポジトリ・ストア・ルール・シード）
3. Phase 3: US4 — カンバンフル幅（T011〜T013）
4. **STOP and VALIDATE**: `/tasks` でフル幅レイアウトとカテゴリ表示を確認
5. デプロイ/デモ可能

### Incremental Delivery

1. Setup + Foundational → 基盤完了
2. US4 → カンバンフル幅 → 確認（MVP）
3. US5 → 詳細モーダル → 確認
4. US6 → 設定画面 → 確認
5. Polish → 型チェック・E2E テスト → 完了

---

## Requirement Coverage

| FR キー | カバータスク | 備考 |
|---|---|---|
| FR-TASK-001（カンバン全幅） | T011 | |
| FR-TASK-002（カード→モーダル） | T012, T014, T015 | |
| FR-TASK-003（インライン編集） | T014 | |
| FR-TASK-004（フッターボタン配置） | T014 | 右=「閉じる」（各フィールド独立保存） |
| FR-TASK-005（TaskCategory CRUD） | T005, T008, T013, T016 | |
| FR-TASK-006（削除時 categoryId null 化） | T005 | |
| FR-TASK-007（Task 型変更） | T002, T003, T006 | |
| FR-TASK-008（KanbanColumn.role） | T002, T004, T016 | |
| FR-TASK-009（ダッシュボード完了率） | T017 | |
| FR-TASK-010（設定タブ3セクション） | T016 | |
| FR-TASK-011（exportTasksCsv 更新） | T007 | |

---

## Notes

- [P] タスク = 別ファイル・依存関係なし → 並行実行可能
- **T002 が最重要**: `entities.ts` の変更が全ての後続タスクの基盤
- **T007（exportTasksCsv）**: `/speckit-analyze` H3 で発見。`Task['category']` 直参照があり Foundational フェーズに含める必要がある
- `TaskCategory` リポジトリ・ストアは `ScheduleCategory` と完全同パターンで実装すること（R-012 参照）
- `TaskDetailModal` は `ScheduleDetailModal` / `CollabDetailModal` と同パターンで実装すること（R-007 参照）
- フッター右ボタンは「閉じる」（M2解決 — 各フィールドが独立保存するため「保存」ボタン不要）
- `onDeleted` 後は Firestore `onSnapshot` が自動更新するためローカルリストの手動フィルタ不要（L1解決）
- コメントは日本語で記述すること（`any` 使用禁止）
- 各フェーズ Checkpoint で `pnpm typecheck` を実行してエラーゼロを確認すること
- タスク数: 20 タスク（T001〜T020）
