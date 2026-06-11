# Data Model: コラボ調整機能 UI リデザイン

## 1. `CollabStatus` 型（変更）

```ts
// 変更前
export type CollabStatus = 'open' | 'confirmed' | 'expired' | 'cancelled';

// 変更後（draft 追加）
export type CollabStatus = 'draft' | 'open' | 'confirmed' | 'expired' | 'cancelled';
```

## 2. `COLLAB_STATUS_LABELS`（変更）

```ts
export const COLLAB_STATUS_LABELS: Record<CollabStatus, string> = {
  draft:     '準備中',   // 新規追加
  open:      '募集中',   // ラベル変更: 調整中 → 募集中
  confirmed: '確定',     // ラベル変更: 予定決定 → 確定
  expired:   '終了',     // 変更なし
  cancelled: '終了',     // 変更なし
};
```

## 3. `CollabSession`（フィールド追加）

```ts
export interface CollabSession {
  id: string;
  title: string;
  partnerName: string;
  createdBy: string;
  createdAt: Date;
  teamId: string;
  proposedDates: Date[];
  responses: { ... } | null;
  expiresAt: Date;
  status: CollabStatus;
  confirmedDate: Date | null;
  linkedScheduleId: string | null;
  // 既存任意フィールド
  icon?: string | null;
  content?: string | null;
  participants?: CollabParticipant[];
  participantResponses?: Record<string, Record<string, 'ok' | 'ng' | 'maybe' | 'pending'>>;
  comments?: CollabComment[];
  // 追加フィールド
  updatedBy?: string;   // 最終更新者 UID
  updatedAt?: Date;     // 最終更新日時
}
```

## 4. `participantResponses` の値型

```ts
// 変更前: 'ok' | 'ng' | 'pending'
// 変更後: 'ok' | 'ng' | 'maybe' | 'pending'
// ※ 'pending' は後方互換のため残す。△ 表示では 'maybe' と 'pending' の両方を集計
```

---

## 状態遷移

```
[draft（準備中）]
  ↓ ユーザーがステータスを変更
[open（募集中）]
  ↓ ユーザーが候補日を確定
[confirmed（確定）]

[any active] → [expired（終了）]  ← 期限切れ（自動）
[any active] → [cancelled（終了）] ← 削除操作
```

## ゾーン分類

| CollabStatus | ゾーン |
|--------------|--------|
| `draft` | 調整中ゾーン |
| `open` | 調整中ゾーン |
| `confirmed` | 予定確定ゾーン |
| `expired` | 非表示（または別扱い） |
| `cancelled` | 非表示 |

---

## Firestore フィールド追加

コレクション: `teams/{teamId}/collabSessions`

| フィールド | 型 | 必須 | 追加・変更 |
|------------|-----|------|---------|
| `status` | string | ✅ | `'draft'` を追加 |
| `updatedBy` | string (uid) | — | 新規追加 |
| `updatedAt` | Timestamp | — | 新規追加 |
| `participantResponses.*.* ` | string | — | `'maybe'` を追加 |

---

## バリデーションルール

| フィールド | ルール |
|------------|--------|
| `title` | 必須（新規時）、1〜100文字 |
| `participants` | 新規時: 1人以上 |
| `proposedDates` | 新規時: 1件以上 |
| `status` | 初期値 `'draft'`。`expired`/`cancelled` への手動変更は禁止 |
| `updatedBy` | 保存時に `currentUser.uid` を自動セット |
| `updatedAt` | 保存時に `new Date()` を自動セット |
