# Implementation Plan: ユーザー管理修正（ロール名・削除保持・PlanStatus）

**Branch**: `claude/hardcore-maxwell-5564ae` | **Date**: 2026-05-20 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/007-user-management-fixes/spec.md`

## Summary

仕様とコードのロール名称ギャップを解消（`owner→operator`、`editor→member`）し、アカウント削除後もユーザーの表示名・アイコンをゴーストドキュメントとして保持する。PlanStatus コンポーネントが Zustand store から実プランを読むよう修正する。

## Technical Context

**Language/Version**: TypeScript 5, Next.js 14 (App Router)
**Primary Dependencies**: Firebase Admin SDK (functions), Firestore, Zustand
**Storage**: Cloud Firestore (`users/{uid}`, `teams/{teamId}/members/{uid}`)
**Testing**: Vitest (unit), 型チェック（tsc --noEmit）
**Target Platform**: Web (Vercel) + PWA
**Project Type**: Web application
**Performance Goals**: 型チェックエラーゼロ、既存テストグリーン維持
**Constraints**: Firestore 後方互換読み取り（旧ロール値への対応）、Firebase Security Rules 変更なし

## Constitution Check

| 原則 | 評価 | 根拠 |
|------|------|------|
| I. シンプルさ優先 | ✅ PASS | 新規抽象化なし。`normalizeRole()` ユーティリティ1関数のみ追加。YAGNI 準拠。 |
| II. TypeScript型安全 | ✅ PASS | `UserRole` 型を正確に更新。`any` 不使用。境界のみバリデーション。 |
| III. テスト方針 | ✅ PASS | ロール文字列変換は既存ロジックのリネーム。UI テスト不要。 |
| IV. Firebase・セキュリティ | ✅ PASS | Cloud Functions の認証チェックは維持。削除後ゴースト化で Security Rules 変更不要。 |
| V. 日本語コメント | ✅ PASS | 新規コメントは日本語で記述。 |

## Project Structure

### Documentation (this feature)

```text
specs/007-user-management-fixes/
├── plan.md         # このファイル
├── spec.md         # フィーチャー仕様
├── research.md     # Phase 0 調査結果
├── data-model.md   # Phase 1 データモデル
└── tasks.md        # Phase 2 タスク (/speckit-tasks で生成)
```

### Source Code（変更対象ファイル）

```text
src/
├── types/
│   └── entities.ts                        # UserRole型、User型（deleted/deletedAt追加）
├── lib/repositories/
│   └── teams.ts                           # toTeamMember()に後方互換マッピング追加
├── components/
│   ├── team/
│   │   └── RoleChangeDialog.tsx           # ROLE_LABELS、newRole型更新
│   └── plan/
│       └── PlanStatus.tsx                 # isLight を auth store から取得
└── app/(protected)/
    ├── team/page.tsx                      # isOwner→isOperator、ROLE_LABELS
    ├── settings/profile/page.tsx          # 前セッション更新済み（確認のみ）
    ├── tasks/page.tsx                     # ロール参照確認・更新
    ├── schedule/page.tsx                  # ロール参照確認・更新
    ├── schedule/[id]/page.tsx             # ロール参照確認・更新
    ├── settings/page.tsx                  # ロール参照確認・更新
    ├── collabs/page.tsx                   # ロール参照確認・更新
    └── collabs/[id]/page.tsx              # ロール参照確認・更新

functions/src/
├── lib/
│   └── validateAuth.ts                    # AuthContext型、requireOwner→requireOperator
├── auth/
│   ├── onUserCreate.ts                    # role: 'owner'→'operator'
│   └── deleteAccount.ts                   # ゴースト化ロジック、role === 'owner'→'operator'
└── teams/
    ├── createTeam.ts                      # role: 'owner'→'operator'
    ├── joinTeam.ts                        # role: 'editor'→'member'
    ├── leaveTeam.ts                       # role === 'owner'→'operator'
    ├── leaveSpecificTeam.ts               # ロール参照更新
    ├── removeTeamMember.ts                # role !== 'owner'→'operator'
    ├── dissolveTeam.ts                    # requireOwner→requireOperator
    └── resetTeamCode.ts                   # requireOwner→requireOperator
```

---

## 実装詳細

### A. `UserRole` 型変更と後方互換マッピング

**`src/types/entities.ts`**:
```typescript
export type UserRole = 'operator' | 'member' | 'rom';

export interface User {
  // ... 既存フィールド ...
  deleted?: boolean;
  deletedAt?: Date | null;
}
```

**`src/lib/repositories/teams.ts`** — `toTeamMember()` に後方互換マッピングを追加:
```typescript
function normalizeRole(raw: string): UserRole {
  if (raw === 'owner') return 'operator';
  if (raw === 'editor') return 'member';
  if (raw === 'viewer') return 'rom';
  return raw as UserRole;
}

function toTeamMember(id: string, data: Record<string, unknown>): TeamMember {
  return {
    userId: id,
    role: normalizeRole(data.role as string),
    // ...
  };
}
```

---

### B. `validateAuth.ts` — ロール型・関数名更新

**`functions/src/lib/validateAuth.ts`**:
```typescript
export interface AuthContext {
  uid: string;
  teamId: string;
  role: 'operator' | 'member' | 'rom';
}

// getAuthContext() 内のメンバー取得後、ロール正規化を追加:
function normalizeRole(raw: string): 'operator' | 'member' | 'rom' {
  if (raw === 'owner') return 'operator';
  if (raw === 'editor') return 'member';
  if (raw === 'viewer') return 'rom';
  return raw as 'operator' | 'member' | 'rom';
}

export function requireOperator(ctx: AuthContext): void {
  if (ctx.role !== 'operator') {
    throw new HttpsError('permission-denied', 'オペレーター権限が必要です');
  }
}

export function requireOperatorOrMember(ctx: AuthContext): void {
  if (ctx.role !== 'operator' && ctx.role !== 'member') {
    throw new HttpsError('permission-denied', 'オペレーターまたはメンバー権限が必要です');
  }
}
```

旧関数 `requireOwner`・`requireOwnerOrEditor` は削除。

---

### C. Cloud Functions — ロール文字列の一括更新

各 Cloud Function の書き込み時ロール値を新値に変更:

| ファイル | 変更前 | 変更後 |
|---|---|---|
| `onUserCreate.ts` | `role: 'owner'` | `role: 'operator'` |
| `createTeam.ts` | `role: 'owner'` | `role: 'operator'` |
| `joinTeam.ts` | `role: 'editor'` | `role: 'member'` |
| `leaveTeam.ts` | `role === 'owner'` | `role === 'operator'` |
| `leaveSpecificTeam.ts` | ロール比較値 | 新値に更新 |
| `removeTeamMember.ts` | `role !== 'owner'` | `role !== 'operator'` |
| `dissolveTeam.ts` | `requireOwner(ctx)` | `requireOperator(ctx)` |
| `resetTeamCode.ts` | `requireOwner(ctx)` | `requireOperator(ctx)` |
| `deleteAccount.ts` | `role === 'owner'` | `role === 'operator'` |

---

### D. フロントエンド UI ラベル・ロール参照の更新

**`src/components/team/RoleChangeDialog.tsx`**:
```typescript
const ROLE_LABELS: Record<UserRole, string> = {
  operator: 'オペレーター',
  member: 'メンバー',
  rom: 'ROM専',
};
// newRole 型: 'editor' | 'viewer' → 'member' | 'rom'
```

**`src/app/(protected)/team/page.tsx`**:
```typescript
const ROLE_LABELS: Record<UserRole, string> = {
  operator: 'オペレーター',
  member: 'メンバー',
  rom: 'ROM専',
};
const isOperator = myMember?.role === 'operator';
// DialogState の newRole: 'editor' | 'viewer' → 'member' | 'rom'
// ロール変更セレクトの options: 'editor' → 'member', 'viewer' → 'rom'
```

その他 `app/(protected)` ページのロール参照（`=== 'owner'`、`=== 'editor'` 等）を全て新値に更新。

---

### E. アカウント削除 — ゴースト化

**`functions/src/auth/deleteAccount.ts`** — ユーザードキュメントの削除をゴースト化に変更:

```typescript
// Before
tx.delete(db.doc(`users/${uid}`));

// After
tx.set(db.doc(`users/${uid}`), {
  uid,
  displayName: userData.displayName as string,
  avatarUrl: (userData.avatarUrl as string | null) ?? null,
  deleted: true,
  deletedAt: FieldValue.serverTimestamp(),
});
```

**`src/types/entities.ts`** — `User` 型に追加済み（セクションAで実施）。

---

### F. PlanStatus — 実データ接続

**`src/components/plan/PlanStatus.tsx`**:
```typescript
const { currentUser, members } = useAuthStore();
const myMember = members.find((m) => m.userId === currentUser?.uid);
const isLight = myMember?.plan !== 'party';
// TODO コメントを削除
```

---

## Complexity Tracking

変更なし（すべて Constitution に準拠）。

---

## 実装順序（依存関係順）

1. `src/types/entities.ts` — `UserRole` 型変更、`User` 型拡張（他のファイルが依存）
2. `functions/src/lib/validateAuth.ts` — `AuthContext` 型と関数名更新（functions が依存）
3. Cloud Functions のロール文字列一括更新（`validateAuth.ts` の新関数を使用）
   - `onUserCreate.ts`、`createTeam.ts`、`joinTeam.ts`
   - `leaveTeam.ts`、`leaveSpecificTeam.ts`、`removeTeamMember.ts`
   - `dissolveTeam.ts`、`resetTeamCode.ts`、`deleteAccount.ts`（ゴースト化も同時実施）
4. `src/lib/repositories/teams.ts` — `normalizeRole` と `toTeamMember` 更新
5. `src/components/team/RoleChangeDialog.tsx` — ROLE_LABELS と型更新
6. `src/app/(protected)/team/page.tsx` — ROLE_LABELS、isOwner→isOperator
7. `src/app/(protected)/**` — 残りページのロール参照一括更新
8. `src/components/plan/PlanStatus.tsx` — isLight を store から取得
9. `pnpm typecheck` — 型エラーゼロを確認
