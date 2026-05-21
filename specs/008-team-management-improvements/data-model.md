# Data Model: チーム管理改善・ナビ修正

**Feature**: `008-team-management-improvements` | **Date**: 2026-05-21

## Firestore スキーマ変更

### 変更なし

今回の修正はすべて既存のスキーマに対する操作のみ。新規コレクション・フィールドの追加は不要。

### 操作パターン（既存スキーマ）

**ソロチーム自動削除時の書き込み**（Bug 1 fix）:

```
DELETE  teams/{soloTeamId}
DELETE  teams/{soloTeamId}/members/{uid}
DELETE  teamCodes/{teamCode}
UPDATE  users/{uid}
  - teamIds: arrayRemove(soloTeamId)
  - currentTeamId: <次のチームID または 新ソロチームID>
```

※ `deleteAccount.ts` の既存実装（solo チーム削除）と同じパターン

## TypeScript 型変更

### `LeaveTeamDialogProps`（`src/components/team/LeaveTeamDialog.tsx`）

```typescript
// Before
interface LeaveTeamDialogProps {
  open: boolean;
  onClose: () => void;
  isOwner: boolean;
  onSuccess?: () => void;
}

// After
interface LeaveTeamDialogProps {
  open: boolean;
  onClose: () => void;
  teamId: string;
  isSoloOperator: boolean;   // ソロチームオペレーター（退出可能）
  isMultiOperator: boolean;  // 複数メンバーのオペレーター（移譲必要）
  onSuccess?: () => void;
}
```

### 既存型（変更なし）

- `UserRole`, `TeamMember`, `Team` — 変更なし
- Firestore ドキュメント構造 — 変更なし
