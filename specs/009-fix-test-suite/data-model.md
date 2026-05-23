# Data Model: テストスイート見直し

## 概要

本フィーチャーはテストコードとCI設定の修正であり、Firestoreのデータモデル変更は伴わない。
既存の `entities.ts` 型定義をそのまま使用する。

---

## テスト補完で扱う純粋ロジックの型

新規ユニットテスト `leaveTeamLogic.test.ts` では、以下の純粋関数型をインライン定義する（外部依存なし）。

```typescript
// Sprint 008 leaveSpecificTeam から抽出した純粋ロジック
function canOperatorLeave(memberCount: number): boolean {
  return memberCount <= 1;
}

// 脱退処理結果の型（純粋ロジック用）
type LeaveResult =
  | { action: 'delete_team' }  // ソロチーム: チーム削除
  | { action: 'leave' }        // 非オペレーター: 通常脱退
  | { action: 'error'; reason: string }; // 複数メンバーオペレーター: エラー

function resolveLeaveAction(
  role: 'operator' | 'member' | 'rom',
  memberCount: number
): LeaveResult {
  if (role !== 'operator') return { action: 'leave' };
  if (memberCount <= 1) return { action: 'delete_team' };
  return { action: 'error', reason: '先に所有権を移譲してください' };
}
```

---

## 影響範囲

| ファイル | 変更種別 | 説明 |
|---|---|---|
| `playwright.config.ts` | 変更 | `smoke` / `emulator` プロジェクト追加 |
| `package.json` | 変更 | `test:e2e:smoke` スクリプト追加 |
| `.github/workflows/ci.yml` | 変更 | E2Eジョブを `--project=smoke` に絞る |
| `tests/unit/teams/leaveTeamLogic.test.ts` | 新規 | チーム脱退ロジックのユニットテスト |
| `specs/009-fix-test-suite/` | 新規 | 本フィーチャーの仕様・計画ドキュメント |
