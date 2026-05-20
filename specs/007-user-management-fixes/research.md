# Research: ユーザー管理修正

**Phase 0** | 2026-05-20

---

## 1. ロール名変更の影響範囲

### 決定
- コード値: `'operator' | 'member' | 'rom'`
- 旧値との対応: `'owner'` → `'operator'`、`'editor'` → `'member'`、`'rom'` → `'rom'`
- UI 表示は日本語（オペレーター・メンバー・ROM専）

### 変更対象ファイル（全 21 ファイル）

**フロントエンド src/**

| ファイル | 変更内容 |
|---|---|
| `src/types/entities.ts` | `UserRole` 型定義変更 |
| `src/lib/repositories/teams.ts` | `toTeamMember()` に後方互換マッピング追加、`updateMemberRole` 型更新 |
| `src/stores/auth.ts` | ロール参照なし（影響なし） |
| `src/components/team/RoleChangeDialog.tsx` | `ROLE_LABELS`、`newRole` 型 |
| `src/app/(protected)/team/page.tsx` | `isOwner`→`isOperator`、`ROLE_LABELS`、`DialogState` の `newRole` 型 |
| `src/app/(protected)/settings/profile/page.tsx` | `isOperatorWithMembers` はすでに更新済み（前セッション） |
| `src/app/(protected)/tasks/page.tsx` | ロール参照を確認・更新 |
| `src/app/(protected)/schedule/page.tsx` | ロール参照を確認・更新 |
| `src/app/(protected)/schedule/[id]/page.tsx` | ロール参照を確認・更新 |
| `src/app/(protected)/settings/page.tsx` | ロール参照を確認・更新 |
| `src/app/(protected)/collabs/page.tsx` | ロール参照を確認・更新 |
| `src/app/(protected)/collabs/[id]/page.tsx` | ロール参照を確認・更新 |

**Cloud Functions functions/src/**

| ファイル | 変更内容 |
|---|---|
| `functions/src/lib/validateAuth.ts` | `AuthContext.role` 型、`requireOwner`→`requireOperator`、`requireOwnerOrEditor`→`requireOperatorOrMember` |
| `functions/src/auth/deleteAccount.ts` | `role === 'owner'` → `=== 'operator'`（前セッションで一部更新済み） |
| `functions/src/auth/onUserCreate.ts` | `role: 'owner'` → `'operator'` |
| `functions/src/teams/createTeam.ts` | `role: 'owner'` → `'operator'` |
| `functions/src/teams/joinTeam.ts` | `role: 'editor'` → `'member'` |
| `functions/src/teams/leaveTeam.ts` | `role === 'owner'` → `=== 'operator'` |
| `functions/src/teams/leaveSpecificTeam.ts` | ロール文字列を確認・更新 |
| `functions/src/teams/removeTeamMember.ts` | `role !== 'owner'` → `!== 'operator'` |
| `functions/src/teams/dissolveTeam.ts` | `requireOwner` → `requireOperator` 呼び出し |
| `functions/src/teams/resetTeamCode.ts` | `requireOwner` → `requireOperator` 呼び出し |
| `functions/src/collab/respondToCollab.ts` | ロール参照を確認・更新 |

### 後方互換戦略
Firestore に保存されている既存データ（`role: 'owner'`、`role: 'editor'`）を、フロントの `toTeamMember()` で読み取り時にマッピング変換する。新規書き込みからは新値を使用。

```typescript
function normalizeRole(raw: string): UserRole {
  if (raw === 'owner') return 'operator';
  if (raw === 'editor') return 'member';
  if (raw === 'viewer') return 'rom'; // Firestore旧値の後方互換
  return raw as UserRole;
}
```

---

## 2. ユーザー削除後のデータ保持

### 決定
`users/{uid}` ドキュメントを **ゴースト化**（削除せず最小フィールドのみ残す）。

**根拠**:
- チームメンバー、タスク担当、コラボ参加者など複数コレクションから uid 参照がある
- 参照元ドキュメントをすべて更新するより、参照先を残す方が変更範囲が小さい
- 個人情報（email、FCM トークン、Google Calendar トークン等）は削除し、GDPR 観点のリスクを最小化
- Firebase Auth アカウントは引き続き削除（再ログイン不可）

### ゴースト化フィールド
```typescript
{
  uid: string;           // 保持
  displayName: string;   // 保持
  avatarUrl: string | null; // 保持
  deleted: true;         // 追加
  deletedAt: Timestamp;  // 追加
  // 下記は削除: email, fcmTokens, googleCalendar, notificationPreferences,
  //             plan, planUpdatedAt, teamIds, currentTeamId, monthlyTaskCount,
  //             monthlyCollabCount, countResetAt, createdAt
}
```

### 代替案（不採用）
- **メンバードキュメントにスナップショット保存**: displayName/avatarUrl はすでにメンバードキュメントに複製されている。チームから削除した後も表示が必要なタスクや通知では使えない。不採用。
- **完全削除 + null 表示**: アプリ内で「削除済みユーザー」と表示する UX は現スコープ外。

---

## 3. PlanStatus のデータ取得

### 決定
`useAuthStore` の `members` 配列から `currentUser.uid` に一致するメンバーのプランを読む。

**根拠**:
- `members` は `subscribeMembers` でリアルタイム購読されており最新値が保証されている
- Firestore に追加読み取りコールが不要（既存 store データで完結）
- `profile/page.tsx` の `myMember?.plan` と同じパターン（既存の一貫したアプローチ）
