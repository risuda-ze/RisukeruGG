# Implementation Plan: チーム管理改善・ナビ修正

**Branch**: `claude/quirky-rosalind-ffe782` | **Date**: 2026-05-21 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/008-team-management-improvements/spec.md`

## Summary

3件のバグを修正する。(1) ソロチームオペレーターが `leaveSpecificTeam` を呼ぶとエラーになる問題を修正し、チーム移動後のゴーストチームを自動削除。(2) チーム管理画面の退出ボタンを全ロールに表示。(3) `/settings` と `/settings/profile` が両方アクティブになるサイドバーの最長一致バグを修正。

## Technical Context

**Language/Version**: TypeScript 5, Next.js 14 (App Router)
**Primary Dependencies**: Firebase Admin SDK (functions), Firestore, React
**Storage**: Cloud Firestore (`teams/{teamId}`, `teamCodes/{code}`, `teams/{teamId}/members/{uid}`)
**Testing**: TypeScript 型チェック（tsc --noEmit）、既存ユニットテスト継続
**Target Platform**: Web (Vercel) + Firebase Cloud Functions
**Project Type**: Web application
**Performance Goals**: 型チェックエラーゼロ、既存テストグリーン維持
**Constraints**: Firestore トランザクション内の読み取り→書き込み順序を維持

## Constitution Check

| 原則 | 評価 | 根拠 |
|------|------|------|
| I. シンプルさ優先 | ✅ PASS | 既存 `deleteAccount.ts` の solo チーム削除パターンを再利用。新規抽象化なし。 |
| II. TypeScript型安全 | ✅ PASS | `LeaveTeamDialogProps` の型を明示的に更新。`any` 不使用。 |
| III. テスト方針 | ✅ PASS | UI変更のためユニットテスト不要。Cloud Function のロジック変更は軽微（分岐追加）。 |
| IV. Firebase・セキュリティ | ✅ PASS | Firestore 操作はトランザクション内。Security Rules 変更不要。 |
| V. 日本語コメント | ✅ PASS | 新規コメントは日本語で記述。 |

## Project Structure

### Documentation (this feature)

```text
specs/008-team-management-improvements/
├── plan.md         # このファイル
├── spec.md         # フィーチャー仕様
├── research.md     # Phase 0 調査結果
├── data-model.md   # Phase 1 データモデル
└── tasks.md        # Phase 2 タスク (/speckit-tasks で生成)
```

### Source Code（変更対象ファイル）

```text
functions/src/teams/
├── leaveSpecificTeam.ts   # ソロチームオペレーターの脱退許可 + チーム自動削除
├── leaveTeam.ts           # 同様の修正（フォールバック用）
└── removeTeamMember.ts    # 削除後0メンバーの防御的チーム削除

src/
├── components/
│   └── team/
│       └── LeaveTeamDialog.tsx    # props再設計 + ソロチームオペレーター対応
└── app/(protected)/
    └── team/
        └── page.tsx               # 退出ボタンを全ロールに表示

src/components/layout/
└── Sidebar.tsx                    # 最長一致アクティブ判定に変更
```

---

## 実装詳細

### A. `leaveSpecificTeam.ts` — ソロチームオペレーターの脱退許可

**変更箇所**: L28–34（オペレーターチェック）

```typescript
// Before
if (memberDoc.data()!.role === 'operator') {
  throw new HttpsError('failed-precondition', '先に別のメンバーをオペレーターに指名してください');
}

// After
const isOperator = memberDoc.data()!.role === 'operator';
if (isOperator) {
  // ソロチームかどうか確認（Firestoreトランザクション外で読み取り）
  const membersSnap = await db.collection(`teams/${teamId}/members`).get();
  if (membersSnap.size > 1) {
    throw new HttpsError('failed-precondition', '先に別のメンバーをオペレーターに指名してください');
  }
  // ソロチーム（自分のみ）: チームを削除して脱退
  const teamSnap = await db.doc(`teams/${teamId}`).get();
  const teamCode = teamSnap.data()?.teamCode as string | undefined;
  await db.runTransaction(async (tx) => {
    tx.delete(db.doc(`teams/${teamId}/members/${uid}`));
    tx.delete(db.doc(`teams/${teamId}`));
    if (teamCode) tx.delete(db.doc(`teamCodes/${teamCode}`));
    const remainingTeamIds = currentTeamIds.filter((id) => id !== teamId);
    let newActiveTeamId: string;
    if (remainingTeamIds.length === 0) {
      // 他チームなし: 新ソロチームを作成
      // ... (既存の新ソロチーム生成ロジックを使用)
    } else {
      newActiveTeamId = userData.currentTeamId === teamId
        ? remainingTeamIds[0]
        : (userData.currentTeamId as string);
    }
    tx.update(db.doc(`users/${uid}`), {
      teamIds: FieldValue.arrayRemove(teamId),
      currentTeamId: newActiveTeamId,
    });
  });
  return { success: true, newActiveTeamId: /* ... */ };
}
```

実装上の注意:
- Firestoreトランザクション制約（読み取り→書き込み順）を守るため、メンバー数確認はトランザクション外で実施
- `newActiveTeamId` の算出は既存コードの `remainingTeamIds` ロジックを再利用
- 新ソロチームが必要な場合、既存の `randomBytes` によるコード生成パターンを流用

---

### B. `leaveTeam.ts` — ソロチームオペレーター対応

**変更箇所**: L17（オペレーターチェック）

```typescript
// Before
if (ctx.role === 'operator') {
  throw new HttpsError('failed-precondition', '先に別のメンバーをオペレーターに指名してください');
}

// After
if (ctx.role === 'operator') {
  const membersSnap = await db.collection(`teams/${teamId}/members`).get();
  if (membersSnap.size > 1) {
    throw new HttpsError('failed-precondition', '先に別のメンバーをオペレーターに指名してください');
  }
  // ソロチームオペレーター: チームを削除（既存の新ソロチーム生成フローに合流）
}
// 以降の処理（新ソロチーム作成・currentTeamId更新）はそのまま利用
// ただしチーム削除とtx.delete(teamCodes/{code})を追加
```

---

### C. `removeTeamMember.ts` — 防御的チーム削除

**変更箇所**: トランザクションの**読み取りフェーズ**（既存の `tasksSnap`・`userSnap` と同タイミング）に `membersSnap` と `teamDocSnap` を追加し、書き込みフェーズでチェックする

```typescript
// 読み取りフェーズ（既存の tasksSnap・userSnap 読み取りと同タイミングで追加）
const membersSnap = await tx.get(db.collection(`teams/${teamId}/members`));
const teamDocSnap = await tx.get(db.doc(`teams/${teamId}`));

// ...（既存の書き込み処理）...

// 書き込みフェーズ: tx.delete(members/targetUserId) の後に追記
// 通常 requireOperator(ctx) によりオペレーター（ctx.uid）が常にメンバーとして存在し、
// かつ ctx.uid !== targetUserId が保証されるため membersSnap.size >= 2 が維持される。
// ただしデータ破損等の異常状態で targetUserId のみが存在していた場合の防御として実施。
if (membersSnap.size <= 1) {
  const teamCode = teamDocSnap.data()?.teamCode as string | undefined;
  tx.delete(db.doc(`teams/${teamId}`));
  if (teamCode) tx.delete(db.doc(`teamCodes/${teamCode}`));
}
```

注意: Firestore Admin SDK はトランザクション内で書き込み後の読み取りを禁止するため、
`membersSnap` と `teamDocSnap` は必ず書き込みより前の読み取りフェーズで取得する。

---

### D. `LeaveTeamDialog.tsx` — props再設計・ソロチームオペレーター対応

```typescript
interface LeaveTeamDialogProps {
  open: boolean;
  onClose: () => void;
  teamId: string;            // leaveSpecificTeam に渡すチームID
  isSoloOperator: boolean;   // ソロチームのオペレーター（退出ボタン表示）
  isMultiOperator: boolean;  // 複数メンバーのオペレーター（移譲メッセージ表示）
  onSuccess?: () => void;
}
// ケース判定:
//   isMultiOperator === true  → 移譲メッセージのみ（ボタンなし）
//   isSoloOperator  === true  → 退出確認 + 退出ボタン
//   どちらも false（非オペレーター）→ 通常の脱退フロー
// ※ isSoloOperator と isMultiOperator は排他的（両方 true にはならない）

// ハンドラ: ソロチームオペレーターは leaveSpecificTeam を呼ぶ
const handleLeave = async () => {
  if (isMultiOperator) return;
  setLoading(true);
  setError(null);
  try {
    await leaveSpecificTeam({ teamId });
    onClose();
    onSuccess?.();
  } catch {
    setError('チームの脱退に失敗しました。もう一度お試しください');
  } finally {
    setLoading(false);
  }
};

// 表示ロジック:
// isMultiOperator === true → 「先に所有権を移譲してください」（閉じるボタンのみ）
// isSoloOperator === true → 「ソロチームを退出します」 + 退出ボタン
// それ以外（非オペレーター）→ 既存の「チームを脱退すると、ソロチームに自動移行します。」
```

---

### E. `team/page.tsx` — 退出ボタンを全ロールに表示

```typescript
// Before (L313)
{!isOperator && (
  <div className="mt-4">
    <button onClick={() => setDialog({ type: 'leave' })}>チームを脱退する</button>
  </div>
)}

// After
<div className="mt-4">
  <button
    onClick={() => setDialog({ type: 'leave' })}
    className="text-[12px] text-muted hover:text-live transition-colors"
  >
    現在のチームから退出する
  </button>
</div>
```

`LeaveTeamDialog` の呼び出し箇所も更新（isSoloOperator, isMultiOperator, teamId を渡す）:

```typescript
<LeaveTeamDialog
  open={dialog?.type === 'leave'}
  onClose={() => setDialog(null)}
  teamId={teamId ?? ''}
  isSoloOperator={isOperator && members.length <= 1}
  isMultiOperator={isOperator && members.length > 1}
  onSuccess={() => setDialog(null)}
/>
```

---

### F. `Sidebar.tsx` — 最長一致アクティブ判定

**変更箇所**: `Sidebar()` 関数内のレンダリング前に `activeHref` を計算

```typescript
// usePathname() の直下に追加
const activeHref = NAV_SECTIONS.flatMap((s) => s.items)
  .filter((i) => !i.disabled && (pathname === i.href || pathname.startsWith(i.href + '/')))
  .reduce((longest, i) => (i.href.length > longest.length ? i.href : longest), '');
```

**変更箇所**: L143（通常表示時）と L180（折りたたみ時）

```typescript
// Before
const active = !item.disabled && pathname.startsWith(item.href);

// After
const active = item.href === activeHref;
```

---

## Complexity Tracking

変更なし（すべて Constitution に準拠）。

---

## 実装順序（依存関係順）

1. `functions/src/teams/leaveSpecificTeam.ts` — ソロチームオペレーター脱退 + チーム削除（他が依存）
2. `functions/src/teams/leaveTeam.ts` — 同様の修正（フォールバック用）
3. `functions/src/teams/removeTeamMember.ts` — 防御的チーム削除（独立）
4. `src/components/team/LeaveTeamDialog.tsx` — props再設計・leaveSpecificTeam呼び出し
5. `src/app/(protected)/team/page.tsx` — 退出ボタン全ロール表示・Dialog props更新
6. `src/components/layout/Sidebar.tsx` — 最長一致アクティブ判定
7. `pnpm typecheck` — 型エラーゼロを確認
