# Tasks: コラボ新規作成「internal」エラー修正と堅牢化

**Input**: Design documents from `/specs/016-collab-create-fix/`
**Prerequisites**: [plan.md](plan.md)（必須）, [research.md](research.md), [data-model.md](data-model.md), [contracts/cloud-function-contract.md](contracts/cloud-function-contract.md), [quickstart.md](quickstart.md)

**Tests**: 本機能はコラボ作成という中核ロジック（Constitution III 必須領域）かつ受け入れ基準 AC5 でテスト通過を要求するため、テストタスクを**含める**。

**Organization**: タスクはユーザーストーリー単位でグループ化し、各ストーリーを独立して実装・検証できるようにする。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（異なるファイル・依存なし）
- **[Story]**: 所属ユーザーストーリー（US1, US2）
- 各タスクに正確なファイルパスを明記

## Path Conventions

- **Web app**: Cloud Functions = `functions/src/`、フロント = `src/`、テスト = `tests/`

---

## ユーザーストーリー対応表

| ストーリー | 優先度 | 内容 | 受け入れ基準 |
|---|---|---|---|
| US1 | P1 🎯 MVP | コラボ新規追加が成功する（作成パスの堅牢化＋真因特定） | AC1, AC4 |
| US2 | P2 | 失敗時に画面へ適切な日本語メッセージを表示する | AC3 |
| Foundational | — | CF 例外境界＋構造化ログ（観測性の確立） | AC2 |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 再現・検証環境の準備

- [ ] T001 `develop` から `feature/collab-create-fix` ブランチを切る（CLAUDE.md ブランチ運用に準拠。`main` 直接禁止）
- [ ] T002 `functions/` をビルド（`cd functions && pnpm build`）し、`firebase emulators:start --only functions,firestore` で再現環境を確認。`quickstart.md` の「不具合の再現」手順で `internal` を再現できることを確認

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 真因特定と全ストーリーの前提となる「CF 例外境界＋構造化ログ」を導入する（AC2）

**⚠️ CRITICAL**: このフェーズ完了まで US1 の真因特定タスクは進められない

- [X] T003 [P] `functions/src/lib/withErrorBoundary.ts` を新規作成。`HttpsError` はそのまま再スロー、それ以外は `firebase-functions/logger` の `logger.error` で記録後 `HttpsError('internal', '...')` に変換する小ヘルパを実装（既存 `functions/src/collab/expireCollabSessions.ts` の logger 利用パターンを踏襲）
- [X] T004 `functions/src/collab/createCollabSessionDraft.ts` のハンドラ本体を T003 の例外境界で包む。ログには `teamId` / `request.auth?.uid` / `status` / `proposedDatesCount` / `participantsCount` / `error{name,message,stack}` を出力し、**機微情報（トークン・メール等）は出力しない**（[contracts/cloud-function-contract.md](contracts/cloud-function-contract.md) のログ契約に準拠）

**Checkpoint**: 以降、CF が `HttpsError` 以外で失敗してもサーバーログに真因が残る

---

## Phase 3: User Story 1 - コラボ新規追加が成功する (Priority: P1) 🎯 MVP

**Goal**: 有効な入力でコラボの「新規追加」が成功し、一覧に表示される。既知の脆弱ポイントを防御的に修正する。

**Independent Test**: コラボ詳細モーダルでタイトル・参加者1名以上・候補日程1件以上を入力 →「新規追加」→ 一覧「調整中」に表示される（AC1）。既存コラボ操作に回帰がない（AC4）。

### 真因特定（Foundational のログ導入が前提）

- [ ] T005 [US1] **（要 Emulator 環境・未実施）** Emulator で再現操作し、T004 のログから真因を特定。[research.md](research.md) §5 の未解決事項と §3 の候補表（C1〜C4）を確定結果で更新（Generator のみが進捗を、Planner のみが仕様を編集する規約に留意し、`research.md` はファイル所有規約に従って更新）

### 入力ハードニング実装

- [X] T006 [P] [US1] `functions/src/collab/createCollabSessionDraft.ts`: `proposedDates` の各 ISO 文字列を `new Date()` でパースし `isNaN(getTime())` を検査。不正なら `HttpsError('invalid-argument', '候補日程の形式が不正です')`。検証済み `Date[]` を `tx.set` に渡す（[data-model.md](data-model.md) 不変条件1）→ 純粋関数 `draftValidation.parseProposedDates` に切り出し
- [X] T007 [P] [US1] `functions/src/collab/createCollabSessionDraft.ts`: `tx.set` ペイロードから `undefined` を排除。`participants` を `{id,name,type}` に正規化し、`content ?? ''` / `icon ?? 'sports_esports'` で既定値を確定（[data-model.md](data-model.md) 不変条件2）→ `draftValidation.normalizeParticipants` に切り出し
- [X] T008 [US1] `functions/src/collab/lib.ts`: `assertActiveCollabLimit` の集計クエリ `.count().get()` を try/catch で保護し、失敗時はログ後に `HttpsError` 化（真因が C1 の場合でも `internal` の素通しを防ぐ）。`firebase-admin ^13` のため SDK バージョン要因は除外確認済み
- [ ] T009 [US1] **（T005 後に確定・現状ハードニング済み）** T005 で特定した真因に対する恒久修正を適用（C1〜C4 のうち該当箇所）。T006〜T008 で C1〜C4 を網羅的に防御済みのため、ログで真因確定後の確認のみで足りる見込み

### テスト

- [X] T010 [P] [US1] `tests/unit/collab/draftValidation.test.ts` を追加：日付パース（有効/不正/空）・参加者正規化（余分フィールド除去・type 既定・不正要素除去・undefined 非混入）を純粋関数で検証（9 ケース・全パス）
- [~] T011 [US1] 既存コラボ機能の回帰確認（AC4）：`pnpm test` 全 96 件パスで自動回帰なしを確認。**Playwright E2E と手動操作確認は要アプリ起動（未実施）**

**Checkpoint**: コラボ新規追加が成功し、回帰がない。MVP として独立検証可能

---

## Phase 4: User Story 2 - 失敗時に適切な日本語メッセージを表示する (Priority: P2)

**Goal**: 作成失敗時、画面に `internal` ではなく状況に応じた日本語メッセージを表示する。

**Independent Test**: 上限到達・権限不足・サーバーエラー等を誘発し、画面の表示が `internal` ではなく状況に応じた日本語になる（AC3）。

- [X] T012 [P] [US2] `src/lib/firebase/errors.ts` を新規作成：`firebaseFunctionsErrorMessage(err.code → 日本語)` を実装（[contracts/cloud-function-contract.md](contracts/cloud-function-contract.md) のマッピング契約に準拠。`failed-precondition`/`invalid-argument` は CF の `message` を透過、`internal`/その他は定型文。`"internal"` 素値はフォールバックに置換）
- [X] T013 [US2] `src/components/collab/CollabDetailModal.tsx` の `handleCreate` の `catch` を `firebaseFunctionsErrorMessage` 経由に変更し、`setCreateError` に日本語メッセージを渡す。`internal` の素の文字列を画面に出さない
- [X] T014 [P] [US2] `tests/unit/firebase/errors.test.ts` を追加：各 `code` のマッピング・未知コードのフォールバック・`"internal"` 非表示を検証（8 ケース・全パス）

**Checkpoint**: US1 と US2 が独立して動作する

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: 品質確認と受け入れ基準の最終検証

- [X] T015 [P] `pnpm typecheck`（0 errors）/ `pnpm lint`（0 errors、既存 warning のみ）/ `pnpm test`（96 件パス）を通過（AC5）。`functions` 側も `cd functions && pnpm build`（tsc 成功）・`pnpm lint`（0 errors）で確認
- [ ] T016 [P] **（要アプリ起動・未実施）** [quickstart.md](quickstart.md) の検証表（AC1〜AC5）に沿って Playwright / 手動で全基準を確認
- [ ] T017 **（要デプロイ権限・未実施）** CF を `asia-northeast1` にデプロイし、本番（またはステージング）で AC1（正常作成）・AC2（ログ出力）を確認。デプロイ前に Emulator 再現を済ませること
- [ ] T018 **（未実施）** `docs/progress.md` に自己評価・起動手順・テストシナリオを追記（Generator 規約）。`feature/collab-create-fix` → `develop` への PR を作成（base=`develop`、`main` 直接マージ禁止）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし。即時開始可
- **Foundational (Phase 2)**: Setup 完了に依存。**全ストーリーをブロック**（特に真因特定 T005）
- **US1 (Phase 3)**: Foundational 完了後に開始可
- **US2 (Phase 4)**: Foundational 完了後に開始可。US1 とは独立（並行可）
- **Polish (Phase 5)**: US1・US2 完了に依存

### Within Each User Story

- T005（真因特定）→ T006〜T009（実装）。ただし T006/T007 は真因に依らず安全に先行可
- テスト（T010, T014）は対象実装と並行作成可。実装前に失敗することを確認してから実装するのが望ましい

### Parallel Opportunities

- T003 は他と独立（[P]）
- US1 の T006 / T007 は別関数内の別ブロックだが同一ファイルのため**直列推奨**（[P] は付すが編集競合に注意）。T010 は別ファイルで並行可
- US2 の T012 / T014 は別ファイルで並行可
- Foundational 完了後、US1 と US2 は別担当で並行実装可能

---

## Parallel Example: 着手直後

```bash
# Foundational のヘルパは独立して着手可
Task: "functions/src/lib/withErrorBoundary.ts に例外境界ヘルパを実装"

# US2 のクライアント側ユーティリティは US1 と並行可（Foundational 完了後）
Task: "src/lib/firebase/errors.ts に FunctionsError→日本語マッピングを実装"
Task: "tests/unit/firebase/errors.test.ts にマッピングテストを追加"
```

---

## Implementation Strategy

### MVP First (US1 のみ)

1. Phase 1: Setup（再現確認）
2. Phase 2: Foundational（例外境界＋ログ — 真因特定の前提）
3. Phase 3: US1（真因特定＋入力ハードニング）
4. **STOP & VALIDATE**: コラボ新規追加が成功すること（AC1）と回帰なし（AC4）を確認
5. ここまでで達成条件（新規追加できること）を満たす MVP

### Incremental Delivery

1. Setup + Foundational → 観測性が立つ（AC2）
2. + US1 → 新規追加成功（AC1・AC4）= **MVP**
3. + US2 → 画面エラー表示改善（AC3）
4. + Polish → CI 通過（AC5）・デプロイ・PR

---

## Notes

- [P] = 異なるファイル・依存なし。同一ファイル編集は直列化する
- ファイル所有規約（CLAUDE.md）: 仕様は Planner、進捗は Generator、フィードバックは Evaluator のみが編集
- `main` への直接コミット・マージ禁止。PR の base は必ず `develop`
- 各タスクまたは論理単位ごとにコミットすること
- デプロイ（T017）前に必ず Emulator で再現・検証する
