# Tasks: テストスイート見直し・CI信頼性向上

**Input**: Design documents from `/specs/009-fix-test-suite/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1 = E2E分離, US2 = ユニットテスト補完)
- Include exact file paths in descriptions

---

## Phase 1: Setup (事前確認)

**Purpose**: 現状の把握と変更前の状態確認

- [x] T001 現行テスト実行状況を確認: `pnpm vitest run` と `pnpm test:e2e` の出力を記録する
- [x] T002 `playwright.config.ts` の現在の内容を確認し、変更前状態を把握する

---

## Phase 2: Foundational (共通前提)

**Purpose**: 全ユーザーストーリーに共通する前提確認。この段階ではファイル変更なし。

- [x] T003 `tests/e2e/` 内の4ファイル（login, schedule, tasks, visual）がそれぞれ独立して実行可能なことを確認する
- [x] T004 `.github/workflows/ci.yml` の `e2e-tests` ジョブが現在 `pnpm test:e2e` を実行していることを確認する

**Checkpoint**: 現状把握完了 — ユーザーストーリーの実装開始可能

---

## Phase 3: User Story 1 - E2Eテスト分離・CI安定化 (Priority: P1) 🎯 MVP

**Goal**: Playwright プロジェクトを `smoke` / `emulator` に分離し、CI で安定して E2E テストが通過するようにする。

**Independent Test**:
1. `pnpm test:e2e --project=smoke` を実行し、5テスト（login×2, schedule×1, tasks×2）が全合格すること
2. `pnpm test:e2e --project=emulator` を実行すると `visual.spec.ts` のみが対象になること
3. GitHub Actions の `e2e-tests` ジョブが緑になること

### Implementation for User Story 1

- [x] T005 [US1] `playwright.config.ts` を更新して `smoke` プロジェクト（login/schedule/tasks）と `emulator` プロジェクト（visual）を追加する。既存の `chromium`/`firefox` プロジェクト定義を `smoke`/`emulator` に置き換える。`playwright.config.ts`
- [x] T006 [P] [US1] `package.json` の `scripts` に `"test:e2e:smoke": "playwright test --project=smoke"` を追加する。`package.json`
- [x] T007 [US1] `.github/workflows/ci.yml` の `e2e-tests` ジョブの実行コマンドを `pnpm test:e2e` から `pnpm test:e2e:smoke` に変更する。`.github/workflows/ci.yml`
- [x] T008 [US1] `pnpm test:e2e --project=smoke` をローカル実行して全5テストが合格することを確認する（検証タスク）

**Checkpoint**: `pnpm test:e2e --project=smoke` が全合格。`visual.spec.ts` は `emulator` プロジェクトでのみ実行される。

---

## Phase 4: User Story 2 - ユニットテスト補完 (Priority: P2)

**Goal**: Sprint 008 で実装したチーム脱退ビジネスロジックのユニットテストを追加し、コアロジックのカバレッジを向上させる。

**Independent Test**:
1. `pnpm vitest run` を実行し、新規追加テストを含む全テストが合格すること
2. `pnpm typecheck` がエラーなく完了すること

### Implementation for User Story 2

- [x] T009 [US2] `tests/unit/teams/leaveTeamLogic.test.ts` を新規作成する。`columnTransition.test.ts` と同じアプローチで Cloud Functions 実装から純粋ロジックを抽出してテストする。以下のケースを含むこと: (1) ソロチーム（memberCount=1）のオペレーターは脱退可能（delete_team）、(2) 複数メンバー（memberCount=2以上）のオペレーターは脱退不可（error）、(3) 非オペレーター（member/rom）は常に脱退可能（leave）、(4) memberCount=0 の境界値はソロ扱い（delete_team）。コメントは日本語で記述する。`tests/unit/teams/leaveTeamLogic.test.ts`
- [x] T010 [US2] `pnpm vitest run` を実行して新規テスト含む全テストが合格することを確認する（検証タスク）
- [x] T011 [US2] `pnpm typecheck` を実行してエラーがないことを確認する（検証タスク）

**Checkpoint**: 全ユニットテスト合格（17 + 新規テスト数）。型チェック通過。

---

## Phase 5: Polish & 最終検証

**Purpose**: 全変更の統合確認と CI 動作確認

- [x] T012 [P] `pnpm lint` を実行してエラーがないことを確認する（src/外のファイルはエラーなし。src/内の既存エラーは本フィーチャー対象外）
- [x] T013 [P] `pnpm typecheck` を実行してエラーがないことを確認する
- [x] T014 `pnpm test` を実行して全ユニットテストが合格することを確認する（29/29）
- [x] T015 `pnpm test:e2e:smoke` を実行して全スモークE2Eテストが合格することを確認する（5/5）
- [x] T016 変更ファイル一覧を確認する: `playwright.config.ts`, `package.json`, `.github/workflows/ci.yml`, `tests/unit/teams/leaveTeamLogic.test.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし — 即時開始可能
- **Foundational (Phase 2)**: Phase 1 完了後 — ユーザーストーリーをブロック
- **User Story 1 (Phase 3)**: Phase 2 完了後 — P1 優先で先に実施
- **User Story 2 (Phase 4)**: Phase 2 完了後 — US1 と並行可能だが P2 のため後回し
- **Polish (Phase 5)**: US1 + US2 の両方完了後

### User Story Dependencies

- **US1 (P1)**: Phase 2 完了後に即開始 — US2 への依存なし
- **US2 (P2)**: Phase 2 完了後に開始 — US1 への依存なし（並行実施可能）

### Within Each User Story

- T005 (`playwright.config.ts`) → T008 (検証) の順序を守る
- T006 (`package.json`) は T005 と並行可能
- T007 (`ci.yml`) は T005/T006 完了後に実施（スクリプト名が確定してから）
- T009 (テスト作成) → T010 (実行確認) → T011 (型チェック) の順序を守る

### Parallel Opportunities

- T006 は T005 と並行実施可能（別ファイル）
- T012, T013 は並行実施可能（read-only 検証）

---

## Parallel Example: User Story 1

```bash
# T005 と T006 は並行実施可能:
Task T005: "playwright.config.ts を更新して smoke / emulator プロジェクトを追加"
Task T006: "package.json に test:e2e:smoke スクリプトを追加"

# T007 は T005/T006 完了後:
Task T007: "ci.yml の e2e-tests ジョブを pnpm test:e2e:smoke に変更"
```

---

## Implementation Strategy

### MVP First (User Story 1 のみ)

1. Phase 1: 現状確認（T001-T002）
2. Phase 2: 前提確認（T003-T004）
3. Phase 3: E2E分離実装（T005-T008）
4. **STOP and VALIDATE**: `pnpm test:e2e --project=smoke` で全5テスト合格確認
5. CI が緑になることを確認してからUS2へ

### Incremental Delivery

1. Setup + Foundational → 現状把握完了
2. US1 実装 → CI E2E テスト安定化 → **CI緑確認**
3. US2 実装 → ユニットテストカバレッジ向上 → **全テスト緑確認**

---

## Notes

- `playwright.config.ts` の `firefox` プロジェクトは削除し、`smoke` / `emulator` の2プロジェクトに置き換える
- ローカルでは `pnpm test:e2e`（全テスト）、CI では `pnpm test:e2e:smoke`（スモークのみ）で運用する
- `visual.spec.ts` のテストコードは変更しない（プロジェクト設定での分離のみ）
- `leaveTeamLogic.test.ts` は Firebase に依存しない純粋関数のテストのみ記述する
- コメントは日本語で記述する（Constitution V）
- 各タスク完了後に `pnpm lint` + `pnpm typecheck` でエラーがないことを確認する
