# Research: チーム管理改善・ナビ修正

**Feature**: `008-team-management-improvements` | **Date**: 2026-05-21

## Bug 1: ソロチーム自動削除

### 調査結果

**`leaveSpecificTeam.ts` の現状フロー**:
1. オペレーターチェック（L32）: `role === 'operator'` → 一律エラー（メンバー数不問）
2. トランザクション内でメンバー削除、タスク再アサイン、通知送信
3. 残チームがない場合のみ新ソロチームを自動生成

**`leaveTeam.ts` の現状フロー**:
1. オペレーターチェック（L17）: `role === 'operator'` → 一律エラー
2. 新ソロチームを自動生成してユーザーの `currentTeamId` を更新（`teamIds` は未更新）
3. ※ `leaveSpecificTeam` より古い実装。複数チーム管理に完全対応していない

**`removeTeamMember.ts` の現状フロー**:
1. オペレーターが `targetUserId` を削除
2. 削除されたユーザーのソロチームを自動生成
3. チームのメンバー数が0になるケースのチェックなし（防御処理なし）

**`deleteAccount.ts` の既存ソロチーム削除ロジック** (参考):
```typescript
isSolo: role === 'operator' && memberCount <= 1,
// isSolo === true の場合:
tx.delete(db.doc(`teams/${teamId}/members/${uid}`));
tx.delete(db.doc(`teams/${teamId}`));
if (teamCode) tx.delete(db.doc(`teamCodes/${teamCode}`));
```
→ 同様のパターンを `leaveSpecificTeam` に導入する

### 決定事項

- **Decision**: `leaveSpecificTeam.ts` でオペレーターのソロチーム脱退を許可
- **Rationale**: `deleteAccount.ts` が同じパターンで solo team deletion を実装済み。一貫性のある実装。
- **Alternatives considered**:
  - `leaveTeam.ts` の修正のみ: `teamIds` を適切に管理しないため不完全
  - 新 Cloud Function の作成: 不必要な抽象化（Constitution I違反）
- **leaveTeam.ts の対応**: Bug 2 の UI 変更で `leaveSpecificTeam` を使うため、`leaveTeam.ts` は最小修正（同様のソロチーム許可のみ）

---

## Bug 2: 退出 UI の追加

### 調査結果

**現状の team/page.tsx**:
- L313-322: `{!isOperator && <button onClick={leave}>チームを脱退する</button>}`
- オペレーターには脱退 UI なし（「解散」のみ）

**`LeaveTeamDialog.tsx` の現状**:
```typescript
interface LeaveTeamDialogProps {
  open: boolean;
  onClose: () => void;
  isOwner: boolean;  // true → 「移譲してください」メッセージ表示のみ
  onSuccess?: () => void;
}
```
- `isOwner === true` の時: 確認ボタンなしで「移譲してください」メッセージのみ
- `isOwner === false` の時: `leaveTeam()` Cloud Function 呼び出し

### 決定事項

- **Decision**: 退出ボタンを全ロールに表示。`LeaveTeamDialog` のロジックを3パターンに拡張
- **Rationale**: ソロチームオペレーターが退出できるようになる（Bug 1 修正と連動）
- **Dialog の新しい prop 設計**:
  ```typescript
  interface LeaveTeamDialogProps {
    open: boolean;
    onClose: () => void;
    teamId: string;           // leaveSpecificTeam 呼び出しに使用
    isSoloOperator: boolean;  // ソロチームオペレーター → 退出可能
    isMultiOperator: boolean; // 複数メンバーのオペレーター → 移譲必要
    onSuccess?: () => void;
  }
  ```
- **非オペレーターの leaveTeam → leaveSpecificTeam への変更**:
  - `leaveTeam` は `teamIds` を更新しない古い実装のため、`leaveSpecificTeam(currentTeam.id)` に統一
  - 呼び出し元の `team/page.tsx` で `currentTeam.id` を渡す

---

## Bug 3: サイドバー最長一致

### 調査結果

**現状の active 判定**:
```typescript
// line 143, 180 (Sidebar.tsx)
const active = !item.disabled && pathname.startsWith(item.href);
```

**問題の再現**:
- Pathname: `/settings/profile`
- `/settings` アイテム: `'/settings/profile'.startsWith('/settings')` → `true` ❌
- `/settings/profile` アイテム: `'/settings/profile'.startsWith('/settings/profile')` → `true` ✓
→ 両方がアクティブ

**Fix パターン（最長一致）**:
```typescript
// レンダリング前に一度計算
const allNavItems = NAV_SECTIONS.flatMap((s) => s.items);
const activeHref = allNavItems
  .filter((i) => !i.disabled && (pathname === i.href || pathname.startsWith(i.href + '/')))
  .reduce((longest, i) => (i.href.length > longest.length ? i.href : longest), '');
```

**検証**:
| pathname | /settings match | /settings/profile match | activeHref |
|---|---|---|---|
| `/settings` | ✓ (exact) | ✗ | `/settings` ✓ |
| `/settings/profile` | ✓ (prefix+/) | ✓ (exact) | `/settings/profile` ✓ |
| `/schedule` | ✗ | ✗ | `/schedule` ✓ |
| `/schedule/123` | ✗ | ✗ | `/schedule` ✓ |

### 決定事項

- **Decision**: 最長前方一致アルゴリズムを使用
- **Rationale**: 最もシンプルで汎用的。将来のネストした routes にも対応
- **Alternatives considered**:
  - 完全一致のみ: `/schedule/123` で `/schedule` がアクティブにならない（スケジュール詳細ページで問題）
  - ハードコードの除外リスト: `item.href !== '/settings'` → 脆弱で保守性低い
