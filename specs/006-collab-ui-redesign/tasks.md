# Tasks: コラボ調整画面 UI リデザイン

**Input**: `specs/006-collab-ui-redesign/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅

**Organization**: US1〜US4 は `collabs/page.tsx` / `CollabDetailModal.tsx` / `CollabResponseForm.tsx` の 3 ファイルに分かれており、US4（バグ修正）と US5（フォーム再設計）は他と独立して並行実装可能。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並行実行可能（異なるファイル・依存なし）
- **[Story]**: 対応するユーザーストーリー（US1〜US5）

---

## Phase 1: Setup（なし）

本機能は既存ファイルの変更のみ。新規インフラ設定は不要。

---

## Phase 2: Foundational（なし）

Cloud Function・Firestore スキーマの変更なし。既存の `reopenCollabSession` を再利用。

---

## Phase 3: US1 - 受信・送信件数テキストをセクション見出しへ移動 (Priority: P1)

**Goal**: TopBar から件数テキストを削除し、中央セクション見出し横に移動する。

**Independent Test**: ページを開き、TopBar に「受信 ○ 件」が表示されず、「受信・送信したコラボ調整」見出し横に件数が表示されること。

### Implementation for User Story 1

- [ ] T001 [US1] `src/app/(protected)/collabs/page.tsx` — `subtitle` 変数定義と TopBar への `subtitle` prop 渡しを削除
- [ ] T002 [US1] `src/app/(protected)/collabs/page.tsx` — 「受信・送信したコラボ調整」見出し横に `receivedCount` / `sentCount` のバッジテキストを追加（例: `受信 ${receivedCount}件 · 送信 ${sentCount}件`）

**Checkpoint**: TopBar に件数なし、セクション見出し横に件数あり。

---

## Phase 4: US2 - 画面中央に 2 セクション配置 (Priority: P1)

**Goal**: 中央カラムに「受信・送信コラボ」と「予定確定コラボ」の 2 セクションを縦並び表示する。

**Independent Test**: confirmed コラボが存在する状態でページを開き、中央に「予定確定したコラボ」セクションとカードが表示されること。

**Note**: T001/T002（US1）完了後に実施。

### Implementation for User Story 2

- [ ] T003 [US2] `src/app/(protected)/collabs/page.tsx` — 右サイドバーにあった `confirmedSessions` 表示を削除し、中央カラムの open セクション下に「予定確定したコラボ」セクションを追加（`confirmedSessions` のフィルタ・ソートはそのまま流用）
- [ ] T004 [US2] `src/app/(protected)/collabs/page.tsx` — confirmed セクションの各カードに確定日時（`format(s.confirmedDate!, 'M月d日（E） HH:mm〜', { locale: ja })`）・タイトル・パートナー名を表示

**Checkpoint**: 中央に 2 セクションが縦並びで表示される。右サイドバーはフォームのみ。

---

## Phase 5: US3 - 予定確定コラボカードに「再調整」ボタン (Priority: P1)

**Goal**: 確定コラボカードに「再調整する」ボタンを追加し、承認で `reopenCollabSession` を呼ぶ。

**Independent Test**: confirmed コラボの「再調整する」をクリック→確認 UI→承認後、カードが open セクションに移動し対応スケジュールが削除されること。

**Note**: T003/T004（US2）完了後に実施。

### Implementation for User Story 3

- [ ] T005 [US3] `src/app/(protected)/collabs/page.tsx` — `reopenCollabSession` を import し、再調整中の sessionId を管理する `reopeningId` / `confirmReopenId` state を追加
- [ ] T006 [US3] `src/app/(protected)/collabs/page.tsx` — confirmed カードに「再調整する」ボタンを追加。クリックで `confirmReopenId` をセット（インライン確認 UI を表示）
- [ ] T007 [US3] `src/app/(protected)/collabs/page.tsx` — インライン確認 UI（「再調整すると確定日時とスケジュールが削除されます」メッセージ + キャンセル/承認ボタン）を実装。承認で `reopenCollabSession` を呼び、エラー時は console.error

**Checkpoint**: 確定コラボから再調整できる。スケジュール削除は Cloud Function 側で実施済み。

---

## Phase 6: US4 - CollabDetailModal リサイズ時クローズバグ修正 (Priority: P1) [P]

**Goal**: `resize: both` ドラッグ後にモーダルが閉じるバグを修正する。

**Independent Test**: モーダルを開き右下ハンドルをドラッグしてサイズ変更後、モーダルが開いたままであること。背景クリックで閉じること。

**Note**: Phase 3〜5 と独立（異なるファイル）。並行実装可。

### Implementation for User Story 4

- [ ] T008 [P] [US4] `src/components/collab/CollabDetailModal.tsx` — `mouseDownOnOverlay` を `useRef<boolean>(false)` で追加。オーバーレイ div に `onMouseDown={(e) => { mouseDownOnOverlay.current = e.target === e.currentTarget; }}` を追加。`onClick={onClose}` を `onClick={() => { if (mouseDownOnOverlay.current) onClose(); }}` に変更

**Checkpoint**: ドラッグリサイズでモーダルが閉じず、背景クリックで閉じる。

---

## Phase 7: US5 - CollabResponseForm を 3 ステップ構成に変更 (Priority: P1) [P]

**Goal**: 公開コラボ送信フォームを Step1（名前）・Step2（日程）・Step3（コメント）の 3 ステップ UI に変更。PC では横並び。

**Independent Test**: 公開コラボページで 3 ステップが表示され、PC では横並び、モバイルでは縦積み（ステップナビ）となること。送信完了後に修正方法アナウンスが表示されること。

**Note**: Phase 3〜6 と独立（異なるファイル）。並行実装可。

### Implementation for User Story 5

- [ ] T009 [P] [US5] `src/components/collab/CollabResponseForm.tsx` — ファイル冒頭の「○○さんからの」テキスト（`{session.partnerName}さんからのコラボ調整`）を削除。代わりにタイトルと期限のみシンプルに表示
- [ ] T010 [P] [US5] `src/components/collab/CollabResponseForm.tsx` — PC レイアウト用のラッパー構造を追加。`md:grid md:grid-cols-3 md:gap-6` のグリッドコンテナを作成。モバイルでは `currentStep` state（0/1/2）で表示ステップを制御
- [ ] T011 [US5] `src/components/collab/CollabResponseForm.tsx` — Step1 UI: 説明文（「コラボに参加するお名前を入力してください」）+ 名前テキスト入力フィールド。モバイルでは「次へ →」ボタンを追加
- [ ] T012 [US5] `src/components/collab/CollabResponseForm.tsx` — Step2 UI: 説明文（「各候補日程に回答してください。参加できない場合は NG を選んでください」）+ 候補日程リスト（OK/NG/未定ボタン）+ 別日程提案フィールド。モバイルでは「← 戻る」「次へ →」ボタン
- [ ] T013 [US5] `src/components/collab/CollabResponseForm.tsx` — Step3 UI: 説明文（「コメントがあれば入力してください（任意）」）+ メモ textarea + 「回答を送信する」ボタン。モバイルでは「← 戻る」ボタン
- [ ] T014 [US5] `src/components/collab/CollabResponseForm.tsx` — 完了画面（`onSuccess` 後の表示）に「このページを再度開くと回答を修正できます」アナウンスを追加（`collabs/[token]/page.tsx` の成功状態 UI を確認して適切な箇所に挿入）

**Checkpoint**: 公開フォームが 3 ステップで表示。PC では全ステップ横並び。完了後にアナウンスあり。「○○さんからの」表示なし。

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T015 `pnpm typecheck` でエラーゼロを確認
- [ ] T016 `pnpm lint` でエラーゼロを確認。必要なら `pnpm lint:fix` を実行
- [ ] T017 `collabs/page.tsx`・`CollabDetailModal.tsx`・`CollabResponseForm.tsx` の変更を目視確認（件数表示・セクション・再調整ボタン・バグ修正・3ステップ）

---

## Dependencies & Execution Order

### Phase Dependencies

- **US1 (T001-T002)**: 即時開始可能
- **US2 (T003-T004)**: US1 完了後（同ファイル）
- **US3 (T005-T007)**: US2 完了後（同ファイル）
- **US4 (T008)**: 独立・US1〜3 と並行可能
- **US5 (T009-T014)**: 独立・US1〜4 と並行可能
- **Polish (T015-T017)**: 全 US 完了後

### Parallel Opportunities

```
[Main stream]  T001 → T002 → T003 → T004 → T005 → T006 → T007
[Parallel A]   T008 (CollabDetailModal バグ修正 — いつでも開始可)
[Parallel B]   T009 → T010 → T011 → T012 → T013 → T014 (ResponseForm — いつでも開始可)
[Final]        T015 → T016 → T017
```

---

## Implementation Strategy

### MVP First

1. T001-T002（件数移動）→ 確認
2. T003-T004（確定セクション表示）→ 確認
3. T005-T007（再調整ボタン）→ 確認
4. T008（バグ修正）→ 確認
5. T009-T014（3ステップフォーム）→ 確認
6. T015-T017（最終チェック）

### Parallel Strategy（2 エージェント）

- エージェント A: T001 → T007（page.tsx）
- エージェント B: T008 + T009 → T014（Modal/Form）
- 合流: T015 → T017
