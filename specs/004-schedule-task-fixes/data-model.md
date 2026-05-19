# Data Model: スケジュール・タスク修正＆終日フラグ対応

## 変更エンティティ

### 1. ScheduleEntry（変更）

**ファイル**: `src/types/entities.ts`

| フィールド | 型 | 変更 | 説明 |
|-----------|-----|------|------|
| `allDay` | `boolean \| undefined` | **既存・読み取り追加** | 終日フラグ（既に定義済み、`toSchedule()` での読み取りが未実装） |
| `startAt` | `Date` | **挙動変更** | `allDay: true` 時は `00:00:00` に統一 |
| `endAt` | `Date` | **挙動変更** | `allDay: true` 時は `startAt` と同一（`00:00:00`） |

**allDay 時の不変条件**:
- `allDay: true` ⟹ `startAt.getHours() === 0 && startAt.getMinutes() === 0`
- `allDay: true` ⟹ `startAt.getTime() === endAt.getTime()`

---

### 2. CollabComment（変更）

**ファイル**: `src/types/entities.ts`

| フィールド | 型 | 変更 | 説明 |
|-----------|-----|------|------|
| `id` | `string` | 既存 | コメント一意識別子 |
| `authorId` | `string` | 既存 | 投稿者 userId |
| `authorName` | `string` | 既存 | 投稿者表示名 |
| `text` | `string` | 既存 | コメント本文 |
| `createdAt` | `Date` | 既存 | 投稿日時 |
| `parentId` | `string \| undefined` | **NEW** | 親コメントの ID。未設定 = ルートコメント、設定済み = 返信 |

**ツリー構造ルール**:
- ネストは1階層のみ（返信への返信は不可）
- `parentId` が設定されている場合、その値は同一 `comments` 配列内に存在する `id` を参照する
- `parentId` のないコメントが「ルートコメント」、あるものが「返信」

**Firestore 保存形式**:
```
teams/{teamId}/tasks/{taskId}.comments = [
  { id: "c1", authorId: "u1", authorName: "user1", text: "コメント本文", createdAt: Timestamp, /* parentId なし */ },
  { id: "c2", authorId: "u2", authorName: "user2", text: "返信本文", createdAt: Timestamp, parentId: "c1" },
]
```

---

### 3. Task.comments（変更）

**ファイル**: `src/lib/repositories/tasks.ts`

`toTask()` 関数の `parentId` フィールド読み取りを追加する:

```typescript
const comments: CollabComment[] = rawComments.map((c) => ({
  id: c.id as string,
  authorId: c.authorId as string,
  authorName: c.authorName as string,
  text: c.text as string,
  createdAt: (c.createdAt as Timestamp).toDate(),
  parentId: (c.parentId as string | undefined) ?? undefined, // NEW
}));
```

---

## 新規コンポーネント

### 4. DateInput

**ファイル**: `src/components/ui/DateInput.tsx`（新規作成）

```typescript
interface DateInputProps {
  label: string;
  value: string;        // "yyyy-MM-dd" 形式
  onChange: (value: string) => void;
  min?: string;         // "yyyy-MM-dd" 形式
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
}
```

- `DateTimeInput` と同一の `BASE_CLASS` スタイルを使用
- `type="date"` で日付のみ入力
- TaskDetailModal の `dueDate` state と型互換（`string` 型のまま）

---

## 廃止

### LocalReply（廃止）

**ファイル**: `src/components/kanban/TaskDetailModal.tsx`

```typescript
// 廃止するインターフェース
interface LocalReply {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  time: string;  // format(new Date(), 'HH:mm') — Firestore Timestamp に代替
}
```

- `localReplies` state と `repliesKey` localStorage を削除
- `addReply()` 関数を削除
- 代替: `addComment()` を `parentId` 付きで呼び出す形に拡張
