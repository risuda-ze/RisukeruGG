# Data Model: タスク管理画面 UIリデザイン (v3)

**Branch**: `014-task-ui-redesign` | **Date**: 2026-06-04（v3: TaskControlBar・動的列幅・カードフッター 追記）

---

---

## v3 追加・変更

### TaskControlBar.tsx（新規）★ v3

```typescript
interface TaskControlBarProps {
  categories: TaskCategory[];
  members: TeamMember[];
  activeCategoryIds: string[];      // 空配列 = 全カテゴリ表示（すべて）
  activeAssigneeId: string | null;  // null = 全担当者表示
  taskCount: number;
  canEdit: boolean;
  isLightPlanFull: boolean;
  onCategoryToggle: (categoryId: string) => void;  // 選択/解除のトグル
  onClearCategories: () => void;                   // 「すべて」クリック時
  onAssigneeChange: (assigneeId: string | null) => void;
  onAddTask: () => void;
  onShowHint: () => void;
}
```

**責務**:
- カテゴリ選択バッジの複数選択（左揃え）
- 担当者プルダウン（左揃え、`<select>` 要素）
- タスク件数テキスト（右揃え）
- タスク追加ボタン（右揃え）
- ステータス・カテゴリ設定ボタン（右揃え）
- ? ボタン（右揃え）

**レイアウト構造**:
```tsx
<div className="flex items-center gap-3 px-4 py-2 md:px-7">
  {/* 左: フィルタ */}
  <div className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto scrollbar-none">
    {/* 「すべて」バッジ */}
    {/* カテゴリバッジ × N */}
    {/* 担当者プルダウン */}
  </div>
  {/* 右: アクション */}
  <div className="flex items-center gap-2 shrink-0">
    {/* タスク件数 */}
    {/* ＋タスクボタン */}
    {/* 設定ボタン */}
    {/* ? ボタン */}
  </div>
</div>
```

---

### tasks/page.tsx の状態変更 ★ v3

```typescript
// 変更前（v2）
const [activeFilter, setActiveFilter] = useState<string>('all');

// 変更後（v3）
const [activeCategoryIds, setActiveCategoryIds] = useState<string[]>([]);
const [activeAssigneeId, setActiveAssigneeId] = useState<string | null>(null);

// フィルタロジック（OR条件 × AND条件）
const filteredTasks = tasks.filter((t) => {
  const catMatch =
    activeCategoryIds.length === 0 ||
    activeCategoryIds.includes(t.categoryId ?? '');
  const assigneeMatch =
    activeAssigneeId === null || t.assigneeId === activeAssigneeId;
  return catMatch && assigneeMatch;
});
```

---

### KanbanBoard.tsx の列幅変更 ★ v3

```typescript
// 変更前（v2）
// TaskStatusPanel: className="flex-none flex flex-col ..."
// style={{ width: '304px', ... }}

// 変更後（v3）
// TaskStatusPanel: className="flex flex-col ..."
// style={{ flex: '1 1 0', minWidth: '180px', ... }}
```

ゴーストカラム（`.kbcol--add`）ブロックを KanbanBoard.tsx から削除する。

---

### TaskCard.tsx のフッター変更 ★ v3

フッターの要素順序と日付フォーマットを変更する:

```
変更前: [担当者アバター+名前] [M/d] [緊急度チップ]
変更後: [M/d HH:mm] [担当者アバター+名前] [緊急度チップ]
```

日付フォーマット: `format(task.dueDate, 'M/d HH:mm', { locale: ja })`

---

## 新規作成コンポーネント

### TaskMobileBoard.tsx（新規）

```typescript
interface TaskMobileBoardProps {
  teamId: string;
  members: TeamMember[];
  canEdit: boolean;
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: () => void;
}
```

**責務**: モバイル専用 UI
- ステータスピル（`STATUSES` を横スクロール）
- 選択中ステータスのタスクをカード縦リストで表示
- 固定配置の「タスクを追加」ボタン

---

## 変更するコンポーネントの Props インターフェース

### KanbanBoard.tsx（変更）

```typescript
interface KanbanBoardProps {
  teamId: string;
  members: TeamMember[];
  canEdit: boolean;
  tasks?: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: (columnId?: string) => void;  // 追加: 列の「＋ タスクを追加」用
}
```

**変更点**: `onAddTask` prop 追加のみ。内部レイアウトも `.kbcol` 新デザインへ更新。

---

### TaskDetailModal.tsx（変更）

```typescript
interface TaskDetailModalProps {
  task: Task | null;           // null = 新規追加モード
  teamId: string;
  canEdit: boolean;
  columns: TaskStatus[];
  members: TeamMember[];
  categories: TaskCategory[];
  defaultColumnId?: string;   // 新規追加時の初期ステータス
  onClose: () => void;
  onDeleted: () => void;
}
```

**変更点**:
- `task` を `Task | null` に変更（null = 新規追加モード）
- `defaultColumnId` 追加（列の「＋」ボタンから開く場合に初期値をセット）
- モーダル幅を `min(850px, ...)` → `min(960px, ...)` に変更
- コメント入力を `textarea` → 丸型一行フィールド + 送信ボタンに変更
- フッターを「削除 / キャンセル / 保存」の正しい構成に変更
- リプライ機能（`replyInputs` state）削除
- 新規追加モードの `createTask()` 呼び出しロジック追加

---

### tasks/page.tsx（変更）

```typescript
// 変更後の状態管理
const [selectedTask, setSelectedTask] = useState<Task | null>(null);
const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
const [defaultColumnId, setDefaultColumnId] = useState<string | undefined>(undefined);

// ヒントバー dismiss（HintBar コンポーネントを使用）
// useHintDismiss('task-board-hint') フックで管理

function openAdd(columnId?: string) {
  setSelectedTask(null);
  setDefaultColumnId(columnId);
  setIsTaskModalOpen(true);
}
function openEdit(task: Task) {
  setSelectedTask(task);
  setDefaultColumnId(undefined);
  setIsTaskModalOpen(true);
}
```

---

## CSS ユーティリティクラス（globals.css に追加）

### 追加 CSS 変数

```css
:root {
  --danger-dim:  rgba(240, 80, 110, 0.15);
  --success-dim: rgba(61, 214, 140, 0.15);
  --warning-dim: rgba(239, 159, 39, 0.15);
}
```

### 追加 CSS クラス（task.css 相当）

```css
/* Kanban board */
.kbwrap       { flex: 1; min-height: 0; display: flex; overflow: hidden; padding-bottom: 16px; }
.kbscroll     { flex: 1; min-height: 0; overflow-x: auto; overflow-y: hidden; display: flex; }
.kb           { display: flex; gap: 16px; align-items: stretch; min-height: 0; padding-bottom: 4px; }

.kbcol        { flex: 0 0 304px; width: 304px; display: flex; flex-direction: column; ... }
.kbcol__hd    { display: flex; align-items: center; gap: 10px; padding: 13px 12px 12px 14px; border-bottom: 1px solid var(--card-border); }
.kbcol__bar   { width: 4px; height: 17px; border-radius: 3px; flex: 0 0 auto; }
.kbcol__name  { font-family: var(--font-head); font-weight: 700; font-size: 0.98rem; color: var(--text-primary); }
.kbcol__count { min-width: 24px; height: 22px; padding: 0 8px; border-radius: 11px; background: var(--card); border: 1px solid var(--card-border); color: var(--text-secondary); font-family: 'Space Grotesk',monospace; font-weight: 700; font-size: 0.74rem; }
.kbcol__menu  { margin-left: auto; width: 30px; height: 30px; border: none; border-radius: var(--radius-sm); background: none; color: var(--text-muted); cursor: pointer; }
.kbcol__body  { flex: 1; min-height: 0; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.kbcol__add   { display: flex; align-items: center; justify-content: center; gap: 7px; width: 100%; padding: 10px; border: 1px dashed var(--border-light); border-radius: var(--radius-md); background: none; color: var(--text-muted); cursor: pointer; ... }
.kbcol__empty { font-size: 0.78rem; color: var(--text-disabled); text-align: center; padding: 10px 0; }
.kbcol--add   { flex: 0 0 240px; width: 240px; align-items: center; justify-content: center; background: none; border: 1px dashed var(--border-light); ... }

/* Task card */
.tcard       { display: flex; flex-direction: column; gap: 9px; background: var(--card); border: 1px solid var(--card-border); border-left: 3px solid var(--tc); border-radius: var(--radius-md); padding: 12px 13px; cursor: pointer; }
.tcard--done { opacity: 0.82; }
.tcat        { display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px; border-radius: var(--radius-full); font-family: var(--font-head); font-weight: 600; font-size: 0.72rem; background: var(--tcat-bg); color: var(--tcat); border: 1px solid color-mix(in oklab, var(--tcat) 35%, transparent); }
.tcard__title   { font-family: var(--font-head); font-weight: 600; font-size: 0.96rem; line-height: 1.4; color: var(--text-primary); }
.tcard__foot    { display: flex; align-items: center; gap: 10px; }
.tcard__who     { display: flex; align-items: center; gap: 7px; min-width: 0; }
.tcard__whoname { font-size: 0.78rem; color: var(--text-secondary); white-space: nowrap; }
.tcard__due     { display: inline-flex; align-items: center; gap: 5px; font-size: 0.78rem; color: var(--text-secondary); white-space: nowrap; }
.tcard__chip    { font-family: 'Space Grotesk',monospace; font-weight: 700; font-size: 0.66rem; padding: 3px 7px; border-radius: var(--radius-xs); white-space: nowrap; }
.tchip--over    { background: var(--danger-dim);  color: var(--danger); }
.tchip--today   { background: var(--warning-dim); color: var(--warning); }
.tchip--soon    { background: var(--warning-dim); color: var(--warning); }
.tchip--normal  { background: var(--surface); color: var(--text-muted); border: 1px solid var(--border); }
.tchip--done    { background: var(--success-dim); color: var(--success); }
.tcard__actions { margin-left: auto; display: flex; gap: 4px; flex: 0 0 auto; }
.tcard__act     { width: 30px; height: 30px; border: none; border-radius: var(--radius-sm); background: none; cursor: pointer; color: var(--text-muted); }
.tcard__act--del:hover { background: var(--danger-dim); color: var(--danger); }

/* Board header */
.tboardhd        { flex: 0 0 auto; display: flex; align-items: center; gap: 16px; padding: 4px 0 16px; flex-wrap: wrap; }
.tboardhd__right { margin-left: auto; display: flex; align-items: center; gap: 10px; }

/* Task detail modal — 2-col split */
.smodal__card--task { width: 960px; }
.sform__split       { display: flex; align-items: stretch; min-height: 0; flex: 1; }
.tdcol              { padding: 22px 26px 10px; min-width: 0; }
.tdcol--main        { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.tdcol--chat        { flex: 0 0 372px; border-left: 1px solid var(--card-border); background: rgba(0,0,0,0.13); display: flex; flex-direction: column; min-height: 0; }

/* Chat */
.tchat           { display: flex; flex-direction: column; }
.tchat__list     { display: flex; flex-direction: column; gap: 13px; max-height: 234px; overflow-y: auto; padding: 2px 6px 2px 2px; }
.tchat__empty    { display: flex; align-items: center; gap: 8px; padding: 14px; border-radius: var(--radius-md); background: var(--surface); border: 1px dashed var(--border); color: var(--text-muted); font-size: 0.82rem; }
.tchat__msg      { display: flex; gap: 10px; align-items: flex-start; }
.tchat__msg--me  { flex-direction: row-reverse; }
.tchat__body     { max-width: 78%; display: flex; flex-direction: column; gap: 4px; }
.tchat__meta     { display: flex; align-items: center; gap: 7px; }
.tchat__name     { font-family: var(--font-head); font-weight: 600; font-size: 0.76rem; color: var(--text-secondary); }
.tchat__time     { font-family: 'Space Grotesk',monospace; font-size: 0.7rem; color: var(--text-muted); }
.tchat__bubble   { background: var(--surface); border: 1px solid var(--border); border-radius: 13px 13px 13px 4px; padding: 9px 13px; font-size: 0.88rem; line-height: 1.55; color: var(--text-primary); }
.tchat__msg--me .tchat__bubble { background: var(--primary-950); border-color: var(--primary-800); border-radius: 13px 4px 13px 13px; }
.tchat__inputrow { display: flex; align-items: center; gap: 8px; margin-top: 12px; padding-top: 14px; border-top: 1px solid var(--card-border); }
.tchat__field    { flex: 1; min-width: 0; display: flex; align-items: center; gap: 9px; height: 46px; padding: 0 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-full); transition: border-color var(--duration-fast); }
.tchat__field:focus-within { border-color: var(--primary); box-shadow: var(--glow-primary); }
.tchat__send     { flex: 0 0 auto; width: 46px; height: 46px; border: none; border-radius: 50%; cursor: pointer; background: var(--primary); color: #fff; display: flex; align-items: center; justify-content: center; box-shadow: var(--glow-primary); }

/* Mobile task board */
.mtpills   { flex: 0 0 auto; display: flex; gap: 8px; padding: 2px 16px 12px; overflow-x: auto; }
.mtpill    { flex: 0 0 auto; display: flex; align-items: center; gap: 7px; padding: 8px 13px; border-radius: var(--radius-full); background: var(--surface); border: 1px solid var(--card-border); color: var(--text-secondary); cursor: pointer; font-family: var(--font-head); font-weight: 600; font-size: 0.82rem; white-space: nowrap; }
.mtpill__dot { width: 8px; height: 8px; border-radius: 3px; flex: 0 0 auto; }
.mtpill__n { font-family: 'Space Grotesk',monospace; font-weight: 700; font-size: 0.74rem; opacity: 0.85; }
.mtpill.is-on { background: var(--primary-950); border-color: var(--primary-700); color: var(--text-accent); }
.mtlist    { flex: 1; min-height: 0; overflow-y: auto; padding: 4px 16px 16px; display: flex; flex-direction: column; gap: 10px; }
.mtlist__hd { display: flex; align-items: center; gap: 9px; padding: 6px 0 2px; }
.mtlist__bar { width: 4px; height: 16px; border-radius: 3px; flex: 0 0 auto; }
.mtlist__name { font-family: var(--font-head); font-weight: 700; font-size: 1rem; }
.mtlist__count { font-family: 'Space Grotesk',monospace; font-weight: 700; font-size: 0.78rem; color: var(--text-muted); }

/* Mobile detail override */
.sch--mobile .sform__split  { flex-direction: column; }
.sch--mobile .tdcol         { padding: 18px 16px 4px; }
.sch--mobile .tdcol--chat   { flex: 0 0 auto; border-left: none; border-top: 1px solid var(--card-border); background: none; }
.sch--mobile .tchat__list   { max-height: none; }
```

---

## 既存 Entity 型（変更なし、v3時点）

```typescript
// src/types/entities.ts（参照のみ）
interface Task { id, title, columnId, categoryId, assigneeId, dueDate, description, comments, createdAt, updatedAt, createdBy }
interface TaskStatus { id, name, color, order }
interface TaskCategory { id, name, color }
interface CollabComment { id, authorId, authorName, text, createdAt, parentId? }
```

---

## v4 追加・変更（2026-06-05）

### Entity 型変更: `TaskStatus` に `icon` 追加

```typescript
// src/types/entities.ts
export interface TaskStatus {
  id: string;
  name: string;
  order: number;
  color: string;
  role: 'done' | null;
  icon: string | null;   // ★ v4 追加: Material Icons 名。未設定は null
  createdAt: Date;
}
```

**後方互換**: 既存 Firestore ドキュメントは `icon` フィールドなし → `toColumn()` で `?? null` フォールバック

---

### Entity 型変更: `TaskCategory` に `icon` 追加

```typescript
// src/types/entities.ts
export interface TaskCategory {
  id: string;
  name: string;
  color: string;
  order: number;
  icon: string | null;   // ★ v4 追加: Material Icons 名。未設定は null
  createdAt: Date;
}
```

---

### リポジトリ変更: `taskStatuses.ts`

```typescript
// toColumn() に icon フォールバック追加
function toColumn(id: string, data: Record<string, unknown>): TaskStatus {
  return {
    id,
    name: data.name as string,
    order: data.order as number,
    color: data.color as string,
    role: (data.role as 'done' | null) ?? null,
    icon: (data.icon as string | null) ?? null,  // ★ v4 追加
    createdAt: (data.createdAt as Timestamp).toDate(),
  };
}

// createColumn() の Omit 型を更新（icon は省略可、デフォルト null）
export async function createColumn(
  teamId: string,
  data: Omit<TaskStatus, 'id' | 'role' | 'createdAt'>
): Promise<string> { ... }
// → data に icon フィールドが含まれる（icon: string | null）
```

---

### リポジトリ変更: `taskCategories.ts`

```typescript
// toTaskCategory() に icon フォールバック追加
function toTaskCategory(id: string, data: Record<string, unknown>): TaskCategory {
  return {
    id,
    name: data.name as string,
    color: (data.color as string) ?? '#7F77DD',
    order: (data.order as number) ?? 0,
    icon: (data.icon as string | null) ?? null,  // ★ v4 追加
    createdAt: (data.createdAt as Timestamp).toDate(),
  };
}

// updateTaskCategory() の Pick 型に icon 追加
export async function updateTaskCategory(
  teamId: string,
  categoryId: string,
  data: Partial<Pick<TaskCategory, 'name' | 'color' | 'order' | 'icon'>>  // ★ v4: icon 追加
): Promise<void> { ... }
```

---

### 新規ルート: `/settings/tasks/page.tsx`

```typescript
// src/app/(protected)/settings/tasks/page.tsx
// KanbanStatusSettings と TaskCategorySettings をアイコン対応版として同ファイルに定義

'use client';
export default function TasksSettingsPage() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="タスク管理設定" />
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-7 max-w-3xl">
        <div className="space-y-8">
          <KanbanStatusSettings />   {/* ステータス管理 + アイコンピッカー */}
          <TaskCategorySettings />   {/* カテゴリ管理 + アイコンピッカー */}
        </div>
      </div>
    </div>
  );
}
```

---

### アイコンオプション定数（共通）

```typescript
// settings/tasks/page.tsx に定義
const TASK_ICON_OPTIONS = [
  // タスクステータス用
  'pending', 'check_circle', 'cancel', 'hourglass_empty', 'rocket_launch', 'flag',
  // 汎用
  'event', 'sports_esports', 'video_library', 'live_tv', 'mic',
  'movie', 'music_note', 'star', 'campaign', 'group', 'school', 'build',
];
```

---

### UI 変更: `KanbanBoard.tsx` の列ヘッダー

```tsx
{/* カラーバーの直後にアイコンを挿入 */}
<span className="w-1 h-[17px] rounded-full shrink-0" style={{ background: column.color }} />
{column.icon && (
  <span className="material-icons text-[15px] shrink-0" style={{ color: column.color }}>
    {column.icon}
  </span>
)}
<span className="font-semibold text-[14px] text-text flex-1 truncate">
  {column.name}
</span>
```

---

### UI 変更: `TaskControlBar.tsx` のカテゴリバッジ

```tsx
{categories.map((cat) => (
  <button key={cat.id} onClick={() => onCategoryToggle(cat.id)} ...>
    {cat.icon && (
      <span className="material-icons text-[11px]">{cat.icon}</span>
    )}
    {cat.name}
  </button>
))}
```

---

### UI 変更: `TaskCard.tsx` のカテゴリチップ

```tsx
{category && (
  <span className="inline-flex items-center gap-1 self-start rounded-full px-2 py-0.5 ...">
    {category.icon && (
      <span className="material-icons text-[10px]">{category.icon}</span>
    )}
    {category.name}
  </span>
)}
```

---

### UI 変更: `TaskDetailModal.tsx` のアイコン表示

ステータスとカテゴリの `Dropdown` 選択の上に、選択中アイテムのアイコンプレビューを追加する。

```tsx
// ステータス選択エリア
const currentColumn = columns.find((c) => c.id === columnId);
{currentColumn?.icon && (
  <span className="material-icons text-[16px]" style={{ color: currentColumn.color }}>
    {currentColumn.icon}
  </span>
)}
<Dropdown value={columnId} options={...} onChange={handleColumnChange} />

// カテゴリ選択エリア  
const currentCategory = categories.find((c) => c.id === categoryId);
{currentCategory?.icon && (
  <span className="material-icons text-[16px]" style={{ color: currentCategory.color }}>
    {currentCategory.icon}
  </span>
)}
<Dropdown value={categoryId} options={...} onChange={handleCategoryChange} />
```
