# Data Model: UIリデザイン — チケット002

**Feature**: 002-ui-redesign  
**Date**: 2026-05-16

---

## 新規 UIステートエンティティ

### SidebarState（Zustand Store）

```typescript
// src/stores/sidebar.ts
interface SidebarState {
  /** サイドバーが折りたたまれているか（72px幅） */
  collapsed: boolean;
  /** 現在展開中のセクションラベル配列（例: ['メイン', 'チーム管理']） */
  openSections: string[];
  /** 折りたたみ状態をトグル */
  toggleCollapsed: () => void;
  /** 指定セクションの開閉をトグル */
  toggleSection: (label: string) => void;
  /** 指定セクションを強制的に開く（パスに応じた自動展開に使用） */
  openSection: (label: string) => void;
}
```

**永続化**:

- localStorage key: `risukeru-sidebar`
- 永続化対象: `collapsed`、`openSections`
- 永続化方法: `zustand/middleware` の `persist`

**初期値**:

```typescript
{
  collapsed: false,
  openSections: ['メイン'],  // メインセクションをデフォルト展開
}
```

---

## Task エンティティ変更（`description` フィールド追加）

```typescript
// src/types/entities.ts — 変更箇所のみ

// 旧 union 型は TaskCategoryKey として残す（既存データとの後方互換用）
/** @deprecated 新規コードでは TaskCategory インターフェースと categoryId を使用すること */
export type TaskCategoryKey = 'shooting' | 'editing' | 'thumbnail' | 'announcement' | 'other';

// 新 Firestore バックの TaskCategory エンティティ
export interface TaskCategory {
  id: string;
  name: string;
  color: string;   // CSS color 文字列（例: '#534AB7'）
  order: number;
  createdAt: Date;
}

export interface Task {
  id: string;
  title: string;
  columnId: string;
  categoryId: string | null;    // ← 変更: category enum → Firestore ID
  assigneeId: string | null;
  dueDate: Date | null;
  description: string | null;   // ← 追加（既存ドキュメントは null にフォールバック）
  linkedScheduleId: string | null;
  updatedAt: Date;
  createdBy: string;
  createdAt: Date;
}
```

**Firestore マッピング変更** (`src/lib/repositories/tasks.ts`):
```typescript
// toTask() を更新
categoryId: (data.categoryId as string | null) ?? null,
description: (data.description as string | null) ?? null,
```

**バリデーションスキーマ変更** (`src/lib/validations/tasks.ts`):
```typescript
// taskSchema 更新: category enum → categoryId string, description 追加
categoryId: z.string().nullable().default(null),
description: z.string().max(2000).nullable().default(null),
```

---

## 新規エンティティ: TaskCategory（Firestore）

```typescript
// Firestore パス: teams/{teamId}/taskCategories/{categoryId}
export interface TaskCategory {
  id: string;
  name: string;    // カテゴリ名（例: "動画編集"）
  color: string;   // CSS 色文字列（例: "#7F77DD"）
  order: number;   // 表示順（0始まり）
  createdAt: Date;
}
```

**バリデーション制約**:
- `name`: 1〜30 文字
- `color`: `#RRGGBB` 形式
- `order`: 0 以上の整数
- チームあたり最大カテゴリ数: 無制限（PARTY プラン）、3 個（LIGHT プラン）— ただし現行実装では制限なし

**リポジトリ** (`src/lib/repositories/taskCategories.ts`): `ScheduleCategories` と同パターン
- `createTaskCategory(teamId, data)`
- `updateTaskCategory(teamId, categoryId, data)`
- `deleteTaskCategory(teamId, categoryId)` — 削除時は関連 Task の `categoryId` を `null` に一括更新
- `subscribeTaskCategories(teamId, callback)`

**Zustand ストア** (`src/stores/taskCategories.ts`): `scheduleCategories.ts` と同パターン

---

## KanbanColumn エンティティ変更（role フィールド追加）

```typescript
// src/types/entities.ts — 変更箇所
export interface KanbanColumn {
  id: string;
  name: string;
  order: number;
  color: string;
  role: 'done' | null;  // ← 追加（完了カラムのマーク）
  createdAt: Date;
}
```

**Firestore マッピング変更** (`src/lib/repositories/kanbanColumns.ts`):
```typescript
role: (data.role as 'done' | null) ?? null,
```

**ステータスの管理 UI**:
- 設定画面の「ステータスの管理」セクションでカラム一覧を表示
- 各カラムに「完了ステータスとしてマーク」ラジオボタン/チェックボックスを追加
- 「完了」にマークされたカラムの `role` を `'done'` に設定（他のカラムは `null` に）
- `updateColumn(teamId, columnId, { role: 'done' })` で保存

**ダッシュボード更新**:
```typescript
// 変更前（脆弱）
const doneColumnId = columns.find((c) => c.name === '完了' || c.name === 'Done')?.id;

// 変更後（堅牢）
const doneColumnId = columns.find((c) => c.role === 'done')?.id;
```

**後方互換性**: 既存の Firestore ドキュメントに `description` フィールドが存在しない場合は `null` として扱う。マイグレーションスクリプト不要。

---

## TaskDetailModal ローカル状態

```typescript
// src/components/kanban/TaskDetailModal.tsx 内で定義

interface LocalComment {
  id: string;
  authorName: string;
  authorInitials: string;
  text: string;
  time: string;  // 表示用 HH:mm
}

// コンポーネント内ローカル状態（Firestoreには保存しない）
const [comments, setComments] = useState<LocalComment[]>([]);
const [editingTitle, setEditingTitle] = useState(false);
const [editingDescription, setEditingDescription] = useState(false);
const [editingAssignee, setEditingAssignee] = useState(false);
const [editingDueDate, setEditingDueDate] = useState(false);
```

---

## 変更なし（既存エンティティを流用）

| エンティティ   | 使用先                             | 変更                    |
| -------------- | ---------------------------------- | ----------------------- |
| `Notification` | `NotificationDropdown`             | なし（既存 store 流用） |
| `KanbanColumn` | `KanbanBoard`、`TaskDetailModal`   | なし                    |
| `TeamMember`   | `TaskDetailModal`（担当者選択）    | なし                    |

---

## ナビゲーション定義（Sidebar）

```typescript
// src/components/layout/Sidebar.tsx 内で定義

interface NavItem {
  href: string;
  label: string;
  icon: string; // Material Icons アイコン名
  badge?: number; // 未読バッジ（省略可）
  disabled?: boolean; // 将来実装のアイテムを非活性化
}

interface NavSection {
  label: string; // セクションラベル（openSections での識別に使用）
  icon: string; // Material Icons アイコン名
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'メイン',
    icon: 'dashboard',
    items: [
      { href: '/schedule', label: 'スケジュール', icon: 'calendar_month' },
      { href: '/tasks', label: 'タスク管理', icon: 'task_alt' },
      { href: '/collabs', label: 'コラボ調整', icon: 'handshake' },
    ],
  },
  {
    label: 'チーム管理',
    icon: 'groups',
    items: [
      { href: '/team', label: 'メンバー', icon: 'person' },
      { href: '/notifications', label: '通知設定', icon: 'notifications' },
      { href: '/settings', label: 'チャンネル設定', icon: 'settings' },
    ],
  },
  {
    label: '各種連携',
    icon: 'integration_instructions',
    items: [
      { href: '#', label: 'Googleカレンダー', icon: 'event', disabled: true },
      { href: '#', label: 'Discord', icon: 'forum', disabled: true },
      { href: '#', label: 'YouTube', icon: 'smart_display', disabled: true },
      { href: '#', label: 'X (Twitter)', icon: 'tag', disabled: true },
    ],
  },
];
```

---

## コンポーネント状態フロー

### Sidebar 状態遷移

```
[ロード時]
  ↓ localStorage から collapsed / openSections を復元
  ↓ 現在パスに対応するセクションを自動 openSection()

[トグルボタンクリック]
  ↓ toggleCollapsed()
  ↓ collapsed = true → サイドバー幅 260px → 72px（transition）
  ↓ collapsed = false → サイドバー幅 72px → 260px（transition）

[セクションヘッダークリック]
  ↓ collapsed = true の場合 → collapsed を false に戻してから toggleSection()
  ↓ toggleSection(label) → openSections に追加または削除

[サブアイテムクリック]
  ↓ disabled = true → 何もしない（pointer-events-none）
  ↓ disabled = false → router.push(href)
```

### TopBar 通知ドロップダウン状態遷移

```
[ベルボタンクリック]
  ↓ dropdownOpen = !dropdownOpen

[ドロップダウン外クリック]
  ↓ document.mousedown イベント
  ↓ ref.current に含まれない場合 → dropdownOpen = false

[「すべて見る」クリック]
  ↓ router.push('/notifications')
  ↓ dropdownOpen = false（NavLink 遷移により TopBar 再レンダリング）
```

---

## 統計ウィジェット計算ロジック（Dashboard）

```typescript
// 今月の配信枠数
const thisMonthSchedules = schedules.filter((s) => {
  const now = new Date();
  return s.startAt.getMonth() === now.getMonth() && s.startAt.getFullYear() === now.getFullYear();
});

// 今月の編集タスク数（動画投稿数の代理値 — フェーズ2で修正予定）
const editingTaskCount = tasks.filter((t) => t.category === 'editing').length;

// 今月のタスク総数
const totalTaskCount = tasks.length;

// コラボ調整中件数
const pendingCollabCount = collabSessions.filter((s) => s.status === 'open').length;

// タスク完了率
const doneColumnId = columns.find((c) => c.name === '完了' || c.name === 'Done')?.id;
const doneTaskCount = doneColumnId ? tasks.filter((t) => t.columnId === doneColumnId).length : 0;
const taskCompletionRate = tasks.length > 0 ? Math.round((doneTaskCount / tasks.length) * 100) : 0;
```
