# Quickstart: タスク管理画面 リデザイン（一覧フル幅 + 詳細モーダル + 設定画面）

## 前提

- Firebase エミュレーター起動: `docker-compose up -d`
- 開発サーバー起動: `pnpm dev`
- エミュレーターシード: `node scripts/seed.mjs`（taskCategories データ追加後に再実行）

## 変更ファイル一覧

| ファイル | 変更種別 | 概要 |
|---|---|---|
| `src/types/entities.ts` | 変更 | TaskCategory インターフェース追加、Task.categoryId 変更、KanbanColumn.role 追加 |
| `src/lib/repositories/tasks.ts` | 変更 | `toTask()` を categoryId・description 対応に更新 |
| `src/lib/repositories/kanbanColumns.ts` | 変更 | `toColumn()` に role フィールド追加 |
| `src/lib/repositories/taskCategories.ts` | 新規 | TaskCategory CRUD（ScheduleCategories と同パターン） |
| `src/lib/validations/tasks.ts` | 変更 | `taskSchema` を categoryId・description 対応に更新 |
| `src/stores/taskCategories.ts` | 新規 | TaskCategory Zustand ストア |
| `src/components/kanban/KanbanBoard.tsx` | 変更 | 列幅をフレックス均等（`flex-1 min-w-[240px]`）に変更 |
| `src/components/kanban/TaskCard.tsx` | 変更 | categoryId 対応・カード本体クリックで詳細モーダルを開く |
| `src/components/kanban/TaskDetailModal.tsx` | 新規 | タスク詳細モーダル（ステータス・カテゴリ・担当者・期限・説明・コメント） |
| `src/components/kanban/TaskForm.tsx` | 変更 | categoryId 対応（新規作成専用フォーム） |
| `src/app/(protected)/tasks/page.tsx` | 変更 | `TaskDetailModal` 状態管理を接続 |
| `src/app/(protected)/settings/page.tsx` | 変更 | "カンバン"タブ → "タスク管理"タブ、3セクション追加 |
| `firestore.rules` | 変更 | taskCategories コレクションのセキュリティルール追加 |
| `scripts/seed.mjs` | 変更 | taskCategories シードデータ追加 |
| `tests/e2e/tasks.spec.ts` | 変更 | カンバン・詳細モーダル・設定画面 UI 検証テストを追加 |

## TaskDetailModal の主要インターフェース

```typescript
interface TaskDetailModalProps {
  task: Task;
  teamId: string;
  members: TeamMember[];
  columns: KanbanColumn[];
  categories: TaskCategory[];
  canEdit: boolean;
  onClose: () => void;
  onDeleted: () => void;
}
```

## 各フィールドの編集フロー

| フィールド | 表示モード → 編集モードのトリガー | 保存タイミング |
|---|---|---|
| タイトル | 鉛筆アイコンクリック | blur / Enter |
| ステータス（columnId） | `<select>` onChange 即時 | onChange |
| カテゴリ（categoryId） | `<select>` onChange 即時 | onChange |
| 担当者 | 鉛筆アイコンクリック → `<select>` 表示 | 「保存」ボタン |
| 期限 | カレンダーアイコンクリック → `<input type="date">` 表示 | 「保存」ボタン |
| タスク説明 | 鉛筆アイコンクリック → `<textarea>` 表示 | 「保存」ボタン |

## 設定画面「タスク管理」タブ

| セクション | コンポーネント | 内容 |
|---|---|---|
| 列の管理 | `ColumnManagement` | 既存 KanbanSettings の内容（追加・編集・削除・並び替え） |
| カテゴリの管理 | `TaskCategoryManagement` | Firestore バックのカテゴリ CRUD（名前・色の管理） |
| ステータスの管理 | `StatusManagement` | 各カラムに「完了」ロールをマーク（`role: 'done'`） |

## ローカルでの動作確認手順

1. `pnpm dev` でサーバー起動
2. タスク管理ページ（`/tasks`）を開く
3. カンバンボードが画面幅いっぱいに表示されることを確認
4. タスクカードをクリックして詳細モーダルが開くことを確認
5. 各フィールドの編集・保存が正常に動作することを確認
6. 設定ページ（`/settings`）の「タスク管理」タブを開く
7. 列・カテゴリ・ステータスの CRUD が動作することを確認

## E2E テスト実行

```bash
pnpm test:e2e -- --grep "タスク管理"
```
