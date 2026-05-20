# Data Model: ユーザー管理修正

**Phase 1** | 2026-05-20

---

## 型定義変更

### `UserRole` （`src/types/entities.ts`）

```typescript
// Before（旧値）
export type UserRole = 'owner' | 'editor' | 'viewer';

// After
export type UserRole = 'operator' | 'member' | 'rom';
```

### `User` エンティティ拡張 （`src/types/entities.ts`）

```typescript
export interface User {
  uid: string;
  displayName: string;
  avatarUrl: string | null;
  // ---- 既存フィールド ----
  currentTeamId: string | null;
  teamIds: string[];
  plan: PlanType;
  planUpdatedAt: Date;
  monthlyTaskCount: number;
  monthlyCollabCount: number;
  countResetAt: Date;
  createdAt: Date;
  notificationPreferences: NotificationPreferences;
  fcmTokens: string[];
  googleCalendar: { ... } | null;
  // ---- 新規フィールド ----
  deleted?: boolean;
  deletedAt?: Date | null;
}
```

---

## Firestore スキーマ

### `users/{uid}` — ゴースト状態（削除後）

```json
{
  "uid": "abc123",
  "displayName": "ユーザー名",
  "avatarUrl": "https://storage.googleapis.com/...",
  "deleted": true,
  "deletedAt": "<Timestamp>"
}
```

通常ユーザーは `deleted` フィールドなし（または `false`）。

### `teams/{teamId}/members/{uid}` — ロール値変更

新値（新規書き込み）:
```json
{ "role": "operator" }
{ "role": "member" }
{ "role": "viewer" }
```

旧値（Firestore 既存データ、後方互換読み取りで変換）:
```json
{ "role": "owner" }   → operator に変換
{ "role": "editor" }  → member に変換
{ "role": "viewer" }  → そのまま
```

---

## `AuthContext` 型変更 （`functions/src/lib/validateAuth.ts`）

```typescript
// Before
export interface AuthContext {
  uid: string;
  teamId: string;
  role: 'owner' | 'editor' | 'rom';
}

// After
export interface AuthContext {
  uid: string;
  teamId: string;
  role: 'operator' | 'member' | 'rom';
}
```

---

## 状態遷移

### ロール遷移（変更なし、名称のみ更新）

```
  なし → operator（チーム作成時）
  なし → member（チーム参加時）
  member ⇄ viewer（オペレーターによるロール変更）
  member → operator（オペレーターによるロール変更）
  operator → member（オペレーターによるロール変更）
```

制約: operator は常に1人のみ。

### ユーザー状態遷移

```
  active → (アカウント削除) → ghost（deleted: true）
```

ghost 状態のユーザーは Firebase Auth で認証不可。
Firestore の `users/{uid}` ドキュメントは軽量ゴーストとして残存。
