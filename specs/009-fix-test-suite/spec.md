# Feature Spec: テストスイート見直し・CI信頼性向上

**Branch**: `009-fix-test-suite` | **Date**: 2026-05-23

## Overview

テスト作成時点から仕様が大きく変更されており、一部テストが常にCI失敗となっている。
「GitHub CI失敗 → エージェント対応 → 再テスト」というフィードバックループを確立するため、
テストスイート全体を見直し、CIで安定して通過するよう修正する。

---

## 背景・課題

### 現状の問題

1. **`tests/e2e/visual.spec.ts` がCIで常に失敗する**
   - Firebase Emulator（localhost:9099）への接続を必要とする
   - GitHub ActionsのCI環境にEmulatorが存在しないため、`__firebaseEmulatorsConnected` 待機がタイムアウト
   - シードデータ（Docker + `scripts/seed.mjs`）も必要であり、CIセットアップ外

2. **E2Eテストの分離がない**
   - CIが全E2Eテスト（`pnpm test:e2e`）を実行し、Emulator必須テストも含む
   - CIで安全に実行できるスモークテストと、Emulator必須テストの区別がない

3. **ユニットテストは正常（参考情報）**
   - `pnpm vitest run` → 17/17テスト合格
   - 型定義（`entities.ts`）との整合性は保たれている

---

## 修正項目

### 1. Playwright プロジェクト分離

**変更後**:
- `playwright.config.ts` に2つのプロジェクトを定義：
  - `smoke`: Emulator不要。CIで実行。(`login.spec.ts`, `schedule.spec.ts`, `tasks.spec.ts`)
  - `emulator`: Emulator必須。ローカル専用。(`visual.spec.ts`)
- CIの `pnpm test:e2e` コマンドを `--project=smoke` に絞る

### 2. CI ワークフロー更新

**変更後**:
- `.github/workflows/ci.yml` の `e2e-tests` ジョブを修正
- `pnpm test:e2e --project=smoke` で実行（Emulator依存テストを除外）
- ローカルでのフル実行は `pnpm test:e2e` で引き続き可能

### 3. `visual.spec.ts` の emulator プロジェクトへの移行

**変更後**:
- `visual.spec.ts` をローカル専用の `emulator` プロジェクト設定に割り当て
- CIでは自動的にスキップされる

### 4. ユニットテストの補完

**変更後**:
- Sprint 008で追加したチーム管理ロジックのユニットテストを追加
  - ソロチーム（メンバー1名）でのオペレーター脱退許可ロジック
  - 複数メンバーのチームでのオペレーター脱退ブロックロジック
- コンスティテューション III に従い「コアビジネスロジックのみ」にフォーカス

---

## 受け入れ基準

### スプリント 1: E2Eテスト分離

- [ ] `playwright.config.ts` に `smoke` / `emulator` プロジェクトが定義されている
- [ ] `pnpm test:e2e --project=smoke` が3テスト（login・schedule・tasks）を実行し全合格
- [ ] `visual.spec.ts` は `emulator` プロジェクトでのみ実行対象となる
- [ ] CI（`.github/workflows/ci.yml`）の `e2e-tests` ジョブが `--project=smoke` で実行
- [ ] CIの全ジョブ（lint, typecheck, unit-tests, e2e-tests）がエラーなく完了

### スプリント 2: ユニットテスト補完

- [ ] `tests/unit/teams/leaveTeamLogic.test.ts` が追加される
- [ ] ソロチーム脱退許可・複数メンバー脱退ブロックの純粋ロジックがテストされる
- [ ] `pnpm vitest run` で全ユニットテストが合格（追加テストを含む）
- [ ] `pnpm typecheck` がエラーなく完了

---

## 非機能要件

- テスト追加による `pnpm test`（unit）の実行時間増加は30秒以内とする
- CIの `e2e-tests` ジョブは5分以内に完了すること（スモークテストのみのため）
- コメントは日本語で記述する（コンスティテューション V）
