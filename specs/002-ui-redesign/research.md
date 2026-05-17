# Research: UIリデザイン — チケット002

**Feature**: 002-ui-redesign  
**Date**: 2026-05-16

---

## R-001: Material Icons 統合方法

**Decision**: Google Fonts CDN リンクを `src/app/layout.tsx` に直接追加  
**Rationale**: `next/font/google` はアイコンフォント非対応。CDN リンク1行で済むため導入コストが最小  
**Alternatives considered**: `@material-icons/font` npm（バンドル ~3MB で過大）、`@material-ui/icons`（MUI 依存で過大）

**実装**:

```tsx
// src/app/layout.tsx — <html> の直前または <body> 内に追加
<link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />
```

**使用方法**:

```tsx
// Material Icons はクラス名 "material-icons" で span 要素を使う
<span className="material-icons text-[20px]">calendar_month</span>
```

---

## R-002: Azouaoui Mohamed サイドバーパターン

**Decision**: `docs/risukeru_gg_screens.html` の実装をそのまま TypeScript/Tailwind に移植する

**参照実装のキー仕様** (`risukeru_gg_screens.html` より):

- `.sidebar { width: 260px }` / `.sidebar.collapsed { width: 72px }`
- `.sidebar-dropdown > a` クリックで `.sidebar-submenu` を `display: block` 切り替え
- `.sidebar-dropdown.active .arrow { transform: rotate(90deg) }` でシェブロン回転
- `logo-icon` クリックで `switchScreen('dashboard')` → Next.js では `router.push('/dashboard')`

**Tailwind 移植方針**:

- `w-[260px]` → `w-[72px]`、`transition-[width] duration-300` でスムーズアニメーション
- アコーディオン: `openSections` 配列で開いているセクションを管理
- 折りたたみ時のテキスト非表示: `collapsed` 時に `hidden` class を付与

---

## R-003: Zustand persist 使用方法

**Decision**: `zustand/middleware` の `persist` で `localStorage` に保存

**既存ストア確認** (`src/stores/auth.ts` 等):

- 既存ストアは `persist` を使用していない
- sidebar.ts のみ `persist` を採用（folded state は UX 上重要）

**実装パターン**:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set, get) => ({
      collapsed: false,
      openSections: ['メイン'],
      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
      toggleSection: (label) =>
        set((s) => ({
          openSections: s.openSections.includes(label)
            ? s.openSections.filter((l) => l !== label)
            : [...s.openSections, label],
        })),
      openSection: (label) =>
        set((s) => ({
          openSections: s.openSections.includes(label)
            ? s.openSections
            : [...s.openSections, label],
        })),
    }),
    { name: 'risukeru-sidebar' }
  )
);
```

---

## R-004: 通知ドロップダウン外クリック閉じる実装

**Decision**: `useRef` + `useEffect` で `document.mousedown` をリッスン

```typescript
const ref = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (!open) return;
  const handler = (e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) {
      onClose();
    }
  };
  document.addEventListener('mousedown', handler);
  return () => document.removeEventListener('mousedown', handler);
}, [open, onClose]);
```

---

## R-005: ダッシュボードの「今月の動画投稿数」データ

**Decision**: フェーズ1では `tasks.filter(t => t.category === 'editing').length` を使用し、ラベルを「編集タスク数」と表示する

**Rationale**:

- `ScheduleEntry` に `type` フィールド（配信 vs 動画投稿）が存在しない
- 動画制作の代理指標として「編集」カテゴリのタスク件数が最も近い
- フェーズ2でのデータモデル拡張まで暫定実装とし、コメントで明記する

---

## R-006: カンバンボード フル幅レイアウト

**Decision**: `KanbanColumnPanel` の幅を `flex-shrink-0 w-[272px]` から `flex-1 min-w-[240px]` に変更し、列を画面幅に均等分割する。

**Rationale**: モックの `.kb-col { flex: 1; min-width: 280px }` に倣う。現状の固定幅ではカラムが少ない場合に右側に余白が残る。`min-w-[240px]` を設けることでカラムが多い場合でも最低限の可読性を確保する。

**Alternatives considered**: CSS Grid (`grid-template-columns: repeat(N, 1fr)`) — @hello-pangea/dnd の Droppable が flex 前提のため変更最小化のため Flexbox を維持。

---

## R-007: TaskDetailModal 設計方針

**Decision**: `ScheduleDetailModal` / `CollabDetailModal` と同パターン（オーバーレイ + 720px 幅ポップアップ、インライン編集）で新規実装する。

**Rationale**: 既存パターンが 2 件存在し再利用コストが低い。新しい抽象化コンポーネントは必要なし（Constitution I. シンプルさ優先）。`updateTask()` 既存関数で全フィールドを保存可能。

**Alternatives considered**:
- Next.js route-based modal: URL 変化を伴い他モーダルと一貫性がない。却下
- 汎用 DetailModal 基底コンポーネント: フィールド構成が各モーダルで大きく異なり過剰抽象。YAGNI 原則に従い却下

---

## R-008: `description` フィールド追加

**Decision**: `Task` に `description: string | null` を追加。`toTask()` で `data.description ?? null` にフォールバックし既存ドキュメントはマイグレーション不要。

**Rationale**: nullable にすることで後方互換性を保つ。既存タスクの再書き込みは不要。

**Alternatives considered**: `description: string`（non-nullable）— 既存ドキュメントに空文字列を書き込む移行スクリプトが必要で scope 超過。却下

---

## R-009: タスクコメント実装方針

**Decision**: コメントはモーダル内ローカル状態のみ（`useState<LocalComment[]>`）。`ScheduleDetailModal` と同パターン。

**Rationale**: Firestore サブコレクション追加はセキュリティルール・リポジトリ関数・型定義の追加が必要で scope 超過。モックの UI 再現が主目的のため永続化は将来機能強化とする。

**Alternatives considered**: Firestore サブコレクション `tasks/{taskId}/comments` — 将来的に望ましいが今回の scope 外。却下

---

## R-010: タスクカードのクリック挙動変更

**Decision**: 編集・削除ボタン以外のカード領域クリックで `TaskDetailModal` を開く。既存 `onEdit` prop を `TaskDetailModal` を開くハンドラーに変更し、`TaskForm` は新規作成専用として残す。

**Rationale**: `TaskDetailModal` はフィールドの詳細閲覧・編集を統合的に扱えるため、`TaskForm` の編集フロー（シンプルなフォーム）よりも UX が向上する。変更量を最小化するため既存 `onEdit` prop 経由で解決する。

---

## R-011: 設定画面「タスク管理」タブ構成

**Decision**: 既存の "カンバン" タブ（key: `'kanban'`）を "タスク管理" タブ（key: `'tasks'`）にリネームし、その中に 3 セクション（列の管理・カテゴリの管理・ステータスの管理）を配置する。

**Rationale**: モックの `screen-settings-task` は「設定 > タスク管理」として単一ページで表示されている。既存の `KanbanSettings` を列の管理セクションとして再利用することで変更量が最小化できる。

**Alternatives considered**: 既存カンバンタブを残して別途タスク管理タブを追加 — タブが増えて UX が複雑化する。却下

---

## R-012: TaskCategory の Firestore バック化

**Decision**: `Task.category`（union 型 enum）を `Task.categoryId: string | null`（Firestore ドキュメント ID）に変更し、`teams/{teamId}/taskCategories/{categoryId}` コレクションで管理する。`ScheduleCategory` / `ScheduleEntry.categoryId` と完全同パターン。

**Rationale**: モックの settings 画面が「タスクカテゴリ設定」として追加・編集・削除 UI を示している。既存ユーザー定義カテゴリが不可能なため Firestore バック化が唯一の正解。`ScheduleCategory` パターンがリポジトリ・ストア・設定 UI まで実装済みで、そのまま複製できる。

**Breaking change の影響範囲**: `entities.ts`・`tasks.ts` repository・`TaskCard.tsx`・`TaskForm.tsx`・`exportTasksCsv.ts` など category 参照箇所すべて。既存 Firestore データの `category` フィールドは `categoryId` に移行が必要（seed 更新で対応）。

**Alternatives considered**: 既存 enum を維持して UI だけ追加 — カテゴリの追加・削除ができないため却下

---

## R-013: ステータスの管理（完了カラム設定）

**Decision**: `KanbanColumn` に `role: 'done' | null` フィールドを追加し、設定画面の「ステータスの管理」セクションでどのカラムが「完了」を表すかを設定できるようにする。ダッシュボードの「タスク完了率」計算は `role === 'done'` で検索するよう変更。

**Rationale**: 現状のダッシュボードは `columns.find(c => c.name === '完了' || c.name === 'Done')` という脆弱なコード。`role` フィールドを追加することでカラム名変更後も完了率計算が正しく機能する。既存データは `role` フィールド不在のため `null` フォールバック（後方互換性あり）。

**Alternatives considered**: 複数の role 値（`'todo' | 'in_progress' | 'done'`）— ダッシュボードで必要なのは `done` だけのため YAGNI 原則に従いシンプルな nullable 設計に留める
