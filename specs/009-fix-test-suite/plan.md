# Implementation Plan: テストスイート見直し・CI信頼性向上

**Branch**: `009-fix-test-suite` | **Date**: 2026-05-23 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/009-fix-test-suite/spec.md`

## Summary

E2Eテストの `visual.spec.ts` が Firebase Emulator 依存のため CI で常に失敗している問題を解決する。
Playwright プロジェクト分離（smoke / emulator）と CI ワークフロー更新で CI テストを安定化させ、
さらに Sprint 008 チーム脱退ロジックのユニットテストを追加してビジネスロジックカバレッジを向上させる。

## Technical Context

**Language/Version**: TypeScript 5.9, Node.js 22  
**Primary Dependencies**: Playwright 1.60.0, Vitest 4.1.6, @testing-library/jest-dom 6.9.1  
**Storage**: N/A（テストコードのみ）  
**Testing**: Vitest（ユニット）、Playwright（E2E）  
**Target Platform**: GitHub Actions（Ubuntu Latest）、ローカル開発環境  
**Project Type**: テスト設定・CI設定の修正  
**Performance Goals**: CI `e2e-tests` ジョブが5分以内に完了  
**Constraints**: Firebase Emulator はCIで使用不可、Firebase Secrets はCIで利用可能  
**Scale/Scope**: 4 E2Eテストファイル、2 ユニットテストファイル（+1 新規）

## Constitution Check

| 原則 | 評価 | 備考 |
|---|---|---|
| I. シンプルさ優先 | ✅ | 既存テストを活かし、最小限の変更でCIを安定化する |
| II. TypeScript型安全 | ✅ | 新規テストも `entities.ts` の型を使用、strict mode 準拠 |
| III. テスト方針 | ✅ | コアビジネスロジック（チーム脱退判定）のみテスト追加 |
| IV. Firebase・セキュリティ | ✅ | Emulator依存テストをCI外に隔離、Secrets はそのまま維持 |
| V. 日本語コメント | ✅ | テストのdescribe/itの説明は日本語で記述 |

**Gates**: 全原則をクリア。Complexity Tracking の記入は不要。

## Project Structure

### Documentation (this feature)

```text
specs/009-fix-test-suite/
├── plan.md              # このファイル
├── spec.md              # フィーチャー仕様
├── research.md          # Phase 0 調査結果
├── data-model.md        # Phase 1 データモデル・影響範囲
└── tasks.md             # Phase 2 タスク一覧（/speckit-tasks で生成）
```

### Source Code (変更対象)

```text
playwright.config.ts          # smoke / emulator プロジェクト分離
package.json                  # test:e2e:smoke スクリプト追加
.github/workflows/ci.yml      # e2e-tests ジョブを --project=smoke に絞る
tests/
├── e2e/
│   ├── login.spec.ts         # smoke プロジェクト（変更なし）
│   ├── schedule.spec.ts      # smoke プロジェクト（変更なし）
│   ├── tasks.spec.ts         # smoke プロジェクト（変更なし）
│   └── visual.spec.ts        # emulator プロジェクトに移行（変更なし）
└── unit/
    ├── setup.ts              # 変更なし
    ├── collab/
    │   └── collabSession.test.ts  # 変更なし（17テスト合格中）
    ├── tasks/
    │   └── columnTransition.test.ts  # 変更なし（17テスト合格中）
    └── teams/
        └── leaveTeamLogic.test.ts    # 新規追加
```

**Structure Decision**: 既存のディレクトリ構造を維持。`tests/unit/teams/` ディレクトリを追加し、Sprint 008 のチーム管理ロジックのテストを配置する。

---

## Sprint 1: E2Eテスト分離・CI安定化

### 目標
CIで `pnpm test:e2e:smoke` を実行し、スモークテスト（3ファイル・5テスト）が全合格すること。

### 実装タスク

#### Task 1.1: `playwright.config.ts` の更新

`smoke` と `emulator` の2プロジェクトを定義する。

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    // CIで実行するスモークテスト（Firebase Emulator不要）
    {
      name: 'smoke',
      testMatch: [
        '**/e2e/login.spec.ts',
        '**/e2e/schedule.spec.ts',
        '**/e2e/tasks.spec.ts',
      ],
      use: { ...devices['Desktop Chrome'] },
    },
    // ローカルのみ: Firebase Emulator + シードデータ必須
    {
      name: 'emulator',
      testMatch: ['**/e2e/visual.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

#### Task 1.2: `package.json` に `test:e2e:smoke` スクリプト追加

```json
"test:e2e:smoke": "playwright test --project=smoke"
```

#### Task 1.3: `.github/workflows/ci.yml` の `e2e-tests` ジョブ更新

`pnpm test:e2e` → `pnpm test:e2e:smoke` に変更。

```yaml
- run: pnpm test:e2e:smoke
```

### 受け入れ基準

- `pnpm test:e2e:smoke` がローカルで5テスト全合格
- CI `e2e-tests` ジョブが `smoke` プロジェクトのみ実行し成功
- `pnpm test:e2e` はローカルで引き続き全テスト（smoke + emulator）を実行可能

---

## Sprint 2: ユニットテスト補完

### 目標
Sprint 008 で実装したチーム脱退ロジックのユニットテストを追加し、`pnpm vitest run` で全合格すること。

### 実装タスク

#### Task 2.1: `tests/unit/teams/leaveTeamLogic.test.ts` 新規作成

純粋ロジック（Firebase依存なし）のテスト。`columnTransition.test.ts` と同様のアプローチ。

```typescript
import { describe, it, expect } from 'vitest';
import type { UserRole } from '@/types/entities';

// Sprint 008 leaveSpecificTeam から抽出した純粋ロジック
function canOperatorLeave(memberCount: number): boolean {
  return memberCount <= 1;
}

type LeaveResult =
  | { action: 'delete_team' }
  | { action: 'leave' }
  | { action: 'error'; reason: string };

function resolveLeaveAction(role: UserRole, memberCount: number): LeaveResult {
  if (role !== 'operator') return { action: 'leave' };
  if (canOperatorLeave(memberCount)) return { action: 'delete_team' };
  return { action: 'error', reason: '先に所有権を移譲してください' };
}

describe('チーム脱退ロジック', () => {
  describe('オペレーターがソロチーム（メンバー1名）を脱退', () => {
    it('脱退許可（チーム削除）', ...);
  });
  // ...
});
```

### 受け入れ基準

- `tests/unit/teams/leaveTeamLogic.test.ts` が存在する
- `pnpm vitest run` で全ユニットテストが合格（17 + 新規テスト数）
- `pnpm typecheck` がエラーなく完了

---

## 完了条件

1. `pnpm test` (unit tests) → 全テスト合格
2. `pnpm test:e2e:smoke` → 5テスト全合格
3. `pnpm typecheck` → エラーなし
4. `pnpm lint` → エラーなし
5. GitHub Actions CI の全ジョブ（lint, typecheck, unit-tests, e2e-tests）が緑

## Complexity Tracking

> 今回の変更は Complexity Tracking が不要なシンプルな修正である。
