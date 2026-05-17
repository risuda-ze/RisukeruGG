# Contract: Cloud Functions API

**目的**: Firebase Cloud Functions のエンドポイント仕様。全て Callable Functions として実装する。
**更新日**: 2026-05-13（Google OAuth認証・プラン管理・チームコード対応）

---

## チーム管理

### `createTeam`

新しいチームを作成し、現在のチーム（ソロチーム含む）から移行する。

**認証**: 認証済みユーザー
**入力**:

```typescript
{
  name: string; // チーム名（1〜50文字）
}
```

**出力**:

```typescript
{
  teamId: string;
  teamCode: string; // 英数字8文字の自動生成コード
}
```

**副作用**:

- 旧チームからメンバーとして削除（`teams/{oldTeamId}/members/{uid}` 削除）
- `users/{uid}/currentTeamId` を更新
- 新チームの `teams/{teamId}` ドキュメントを作成
- `teamCodes/{code}` にマッピングを作成

### `joinTeam`

チームコードを使ってチームに参加する。現在のチームから自動脱退。

**認証**: 認証済みユーザー
**入力**:

```typescript
{
  teamCode: string; // 英数字コード
}
```

**出力**: `{ success: boolean; teamId: string }`
**バリデーション**:

1. `teamCodes/{teamCode}` が存在するか確認
2. 対象チームのメンバー数 + プラン状態を確認（FR-P005: 全員PARTY必要かチェック）
3. ブロック時: LIGHTメンバー全員にシステム通知を送信してエラーを返す
   **副作用**（成功時）:

- 旧チームから脱退処理（`leaveTeam` と同じロジックをトランザクションで実行）
- `teams/{teamId}/members/{uid}` を editor ロールで作成
- `users/{uid}/currentTeamId` を更新

**エラー**:

- `not-found`: チームコードが無効（リセット済みの旧コード含む）
- `failed-precondition`: プラン制限により参加不可

### `leaveTeam`

現在のチームを脱退し、新しいソロチームに移行する。

**認証**: 認証済みユーザー（Owner は事前に所有権移譲が必要）
**入力**: `{}`（現在のチームIDはサーバー側で `users/{uid}/currentTeamId` から取得）
**出力**: `{ success: boolean; newSoloTeamId: string }`
**バリデーション**: `role === 'owner'` の場合はエラー（`failed-precondition`）
**副作用**:

- `teams/{teamId}/members/{uid}` 削除
- そのユーザーの未完タスクを `assigneeId: null` に更新し、Ownerに通知
- 新ソロチームを自動生成（`teams/` にドキュメント追加）
- `users/{uid}/currentTeamId` を新ソロチームIDに更新

### `transferOwnership`

Ownerが別メンバーに所有権を移譲する。

**認証**: Owner のみ
**入力**:

```typescript
{
  teamId: string;
  newOwnerId: string; // Editor または Viewer の userId
}
```

**出力**: `{ success: boolean }`
**副作用**:

- `teams/{teamId}/members/{newOwnerId}/role` を `owner` に更新
- `teams/{teamId}/members/{uid}/role` を `editor` に更新
- `teams/{teamId}/ownerId` を更新
- 旧Owner・新Owner 双方にシステム通知

### `removeTeamMember`

チームメンバーを削除する（Kick）。

**認証**: Owner のみ
**入力**: `{ teamId: string; targetUserId: string }`
**出力**: `{ success: boolean }`
**副作用**:

- `teams/{teamId}/members/{targetUserId}` を削除
- そのユーザーの未完タスクを `assigneeId: null` に更新
- Ownerへの通知を生成
- `users/{targetUserId}/currentTeamId` をソロチームIDに更新
- 対象ユーザーのソロチームを自動生成

### `resetTeamCode`

チームコードをリセットする（旧コードは即時無効化）。

**認証**: Owner のみ
**入力**: `{ teamId: string }`
**出力**: `{ newTeamCode: string }`
**副作用**:

- 旧 `teamCodes/{oldCode}` ドキュメントを削除（即時無効化）
- 新コードを生成し `teams/{teamId}/teamCode` を更新
- `teamCodes/{newCode}` にマッピングを作成

---

## タスク管理（プラン制限付き）

### `createTask`

タスクを作成する。LIGHTユーザーは月次上限をバックエンドで検証。

**認証**: Owner または Editor
**入力**:

```typescript
{
  teamId: string;
  title: string;
  columnId: string;
  category: 'shooting' | 'editing' | 'thumbnail' | 'announcement' | 'other';
  assigneeId?: string | null;
  dueDate?: string | null;          // ISO 8601
  linkedScheduleId?: string | null;
}
```

**出力**: `{ taskId: string }`
**バリデーション**（LIGHTプランの場合）:

- `users/{uid}/monthlyTaskCount >= 5` なら `failed-precondition` エラー（アップグレード案内を含む）
  **副作用**（成功時）:
- `teams/{teamId}/tasks/{taskId}` を作成
- `users/{uid}/monthlyTaskCount` をインクリメント
- assigneeId が設定された場合、担当者にタスク通知

---

## コラボセッション

### `createCollabSession`

コラボ日程調整セッションを作成し、共有URLトークンを生成する。LIGHTユーザーは月次上限をバックエンドで検証。

**認証**: Owner または Editor
**入力**:

```typescript
{
  teamId: string;
  title: string;
  partnerName: string;
  proposedDates: string[];   // ISO 8601 の配列（1〜5件）
  expiresInDays: number;     // 1〜30
}
```

**出力**:

```typescript
{
  sessionId: string; // URLトークン（UUID v4）
  shareUrl: string; // https://risukeru.gg/collab/{sessionId}
  expiresAt: string;
}
```

**バリデーション**（LIGHTプランの場合）:

- `users/{uid}/monthlyCollabCount >= 3` なら `failed-precondition` エラー
  **副作用**（成功時）:
- `teams/{teamId}/collabSessions/{sessionId}` を作成
- `users/{uid}/monthlyCollabCount` をインクリメント

### `confirmCollabDate`

コラボ日程を確定し、カレンダーエントリを自動登録する。

**認証**: Owner または Editor（同チーム）
**入力**:

```typescript
{
  teamId: string;
  sessionId: string;
  confirmedDate: string; // ISO 8601
}
```

**出力**: `{ success: boolean; scheduleId: string }`
**副作用**:

- セッションの `status` を `confirmed`、`confirmedDate` を更新
- `teams/{teamId}/schedules` にエントリ作成
- コラボカテゴリの通知を生成

### `cancelCollabSession`

コラボセッションをキャンセルする。

**認証**: Owner または Editor（同チーム）
**入力**: `{ teamId: string; sessionId: string }`
**出力**: `{ success: boolean }`
**副作用**:

- セッションの `status` を `cancelled` に更新
- 確定済みの場合、`linkedScheduleId` のスケジュールエントリを削除

### `respondToCollab` （認証不要）

コラボ相手（外部ユーザー）が候補日程に回答する。

**認証**: 不要（公開エンドポイント）
**入力**:

```typescript
{
  sessionId: string;         // URLトークン（= セッションID）
  responses: {
    [isoDate: string]: 'ok' | 'ng';
  };
  alternativeDates?: string[];
  note?: string;
}
```

**出力**: `{ success: boolean }`
**バリデーション**: セッションが `open` かつ期限内であることを検証。
**副作用**: `responses` フィールドを更新。チームのOwner/Editorへ通知。

---

## 通知

### `markNotificationRead`

通知を既読にする。

**認証**: 通知の受信者本人
**入力**: `{ notificationId: string; teamId: string }`
**出力**: `{ success: boolean }`

---

## Googleカレンダー同期（Scheduled Function）

### `syncGoogleCalendar` （Scheduled: 5分ごと）

全ユーザーの接続済みGoogleカレンダーを同期する。

**トリガー**: Cloud Scheduler（`every 5 minutes`）
**処理**:

1. `users` コレクションから `googleCalendar.connected == true` のユーザーを取得
2. 各ユーザーのリフレッシュトークンで Google Calendar API を呼び出し
3. 直近7日のイベントを取得し、`teams/*/schedules` と照合
4. 新規・更新・削除を同期
5. エラー発生時は `users/{userId}/googleCalendar.syncError` に記録

---

## プラン管理（Scheduled Function）

### `resetMonthlyPlanCounts` （Scheduled: 毎月1日）

LIGHTユーザーの月次カウント（タスク・コラボ）をリセットする。

**トリガー**: Cloud Scheduler（`15 0 1 * *` UTC = 毎月1日 0:00 JST）
**処理**:

1. `users` コレクションから `plan == "light"` のユーザーをバッチ取得
2. 各ユーザーの `monthlyTaskCount`、`monthlyCollabCount` を 0 に更新
3. `countResetAt` を現在時刻に更新

---

## コラボセッション有効期限管理（Scheduled Function）

### `expireCollabSessions` （Scheduled: 1時間ごと）

期限切れのコラボセッションを自動更新する。

**トリガー**: Cloud Scheduler（`0 * * * *`）
**処理**:

1. 全チームの `collabSessions` から `status == "open"` かつ `expiresAt <= now` を取得
2. 対象セッションの `status` を `"expired"` に一括更新

---

## Firebase Auth Trigger

### `onUserCreate` （Auth trigger）

新規ユーザー作成時にLIGHTプランで初期化し、ソロチームを生成する。

**トリガー**: `functions.auth.user().onCreate()`
**処理**:

1. `users/{uid}` ドキュメントを初期化（plan: "light"、monthlyTaskCount: 0 等）
2. ソロチーム（`teams/{soloTeamId}`）を自動生成（name: displayName + "のチーム"）
3. ソロチームのOwnerとしてメンバー追加
4. `users/{uid}/currentTeamId` をソロチームIDに設定

---

## エラーレスポンス

全エンドポイントで Firebase Functions HttpsError を使用:

| コード                | 状況                                                      |
| --------------------- | --------------------------------------------------------- |
| `unauthenticated`     | 認証なし（認証が必要なエンドポイント）                    |
| `permission-denied`   | 権限不足（ロール不一致）                                  |
| `not-found`           | リソースが見つからない（無効なチームコード含む）          |
| `already-exists`      | 重複作成                                                  |
| `invalid-argument`    | バリデーションエラー                                      |
| `deadline-exceeded`   | タイムアウト（Googleカレンダー同期等）                    |
| `failed-precondition` | 前提条件未満（プラン制限・期限切れ・Owner脱退ブロック等） |
