# Tasks: コラボ機能改善・再調整

**Input**: Design documents from `specs/004-collab-improvements/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅
**Scope**: spec 004（バグ修正・改善）+ spec 005（再調整・復元）統合

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（異なるファイル、依存なし）
- **[Story]**: 対応するユーザーストーリー（US1〜US7）

---

## Phase 1: Foundational（Cloud Functions・リポジトリ基盤）

**Purpose**: UI 実装前に完了すべき Cloud Function とリポジトリ層の変更

**⚠️ CRITICAL**: このフェーズが完了するまで US4・US6 の UI 実装は開始しない

- [x] T001 [P] `functions/src/collab/respondToCollab.ts` の `updatePayload` 構築後に、`note?.trim()` が存在する場合に `FieldValue.arrayUnion` で `comments` へ追記するロジックを追加（US4）
- [x] T002 [P] `functions/src/collab/reopenCollabSession.ts` を新規作成（Owner/Editor 認証チェック・confirmed 確認・トランザクション: スケジュール削除 + status→open + confirmedDate→null + linkedScheduleId→null）（US6）
- [x] T003 `functions/src/index.ts` に `reopenCollabSession` をエクスポート追加（T002 完了後）
- [x] T004 [P] `src/lib/repositories/collabs.ts` に `replaceCollabProposedDates(teamId, sessionId, newDates, newParticipantResponses)` 関数を追加（Firestore `proposedDates`・`participantResponses` を一括置換）（US5）
- [x] T005 [P] `src/lib/repositories/collabs.ts` に `reopenCollabSession` の `httpsCallable` 定義を追加（US6）

**Checkpoint**: Cloud Functions ビルドが通り、クライアントから呼び出せる状態

---

## Phase 2: User Story 1 - 候補日程の昇順ソート（Priority: P1）🎯

**Goal**: 詳細画面・送信フォームで候補日程が日時の昇順で表示される

**Independent Test**: 順不同の候補日程を登録し、詳細画面・送信フォームの両方で昇順になっていることを確認

### Implementation for User Story 1

- [x] T006 [P] [US1] `src/components/collab/CollabDetailModal.tsx` の候補日程レンダリング部分に `sortedDatePairs`（`proposedDates.map((d,i)=>({date:d,originalIndex:i})).sort(...)`）を導入し、`getDateAggregates` と `selectedDateIdxs` で `originalIndex` を使用するよう変更
- [x] T007 [P] [US1] `src/components/collab/CollabResponseForm.tsx` の候補日程レンダリングに同様の `sortedDatePairs` を導入し、`toggleDate` に `originalIndex` を渡すよう変更

**Checkpoint**: 候補日程が日時の昇順で表示される

---

## Phase 3: User Story 2 - タイムゾーンバグ修正（Priority: P1）🎯

**Goal**: JST で入力した日程が 9 時間ずれずに保存・表示される

**Independent Test**: JST 15:00 の日程を登録し、詳細画面で 15:00 と表示されることを確認

### Implementation for User Story 2

- [x] T008 [P] [US2] `src/components/collab/CollabForm.tsx` の `handleSubmit` 内 `proposedDates: validDates` を `proposedDates: validDates.map((d) => new Date(d).toISOString())` に変更
- [x] T009 [P] [US2] `src/components/collab/CollabResponseForm.tsx` の `handleSubmit` 内 `alternativeDates: alternativeDate ? [alternativeDate] : []` を `alternativeDates: alternativeDate ? [new Date(alternativeDate).toISOString()] : []` に変更

**Checkpoint**: 候補日程・代替日程が JST で正確に保存・表示される

---

## Phase 4: User Story 3 - レスポンシブ対応（Priority: P1）🎯

**Goal**: 375px 幅のモバイルで公開送信フォームが横スクロールなしに操作できる

**Independent Test**: 375px 幅のブラウザで /collab/[token] を開き、全要素が表示・操作できることを確認

### Implementation for User Story 3

- [x] T010 [US3] `src/components/collab/CollabResponseForm.tsx` の候補日程カード行のレイアウトを見直し（ボタン `px-2 sm:px-3`・`flex-shrink-0`・必要に応じて `flex-wrap` 追加）し、`datetime-local` input に `w-full min-w-0` を追加、外側コンテナに `overflow-x-hidden` を追加して 375px 幅で横スクロールが発生しないよう修正

**Checkpoint**: iPhone SE（375px）相当でフォームが正常に表示・操作できる

---

## Phase 5: User Story 4 - 送信メモのコメント追記（Priority: P2）

**Goal**: 送信フォームのメモが詳細画面コメントセクションに表示される

**Independent Test**: 公開フォームでメモを入力して送信し、詳細画面のコメント欄に表示されることを確認

### Implementation for User Story 4

_T001（Cloud Function修正）が Phase 1 で完了済み。追加 UI 変更は不要。_

- [x] T011 [US4] `functions/src/collab/respondToCollab.ts` の T001 実装を検証（メモあり・なし両パターンでコメント追記動作を確認するためのエミュレータテスト手順を research.md に追記）

**Checkpoint**: 送信フォームのメモが詳細画面コメントセクションに表示される

---

## Phase 6: User Story 5 - 候補日程の編集・削除（Priority: P2）

**Goal**: 候補日程の編集・削除が詳細画面から操作できる

**Independent Test**: 詳細画面で編集・削除を操作し、Firestore の `proposedDates` と `participantResponses` が正しく更新されることを確認

### Implementation for User Story 5

_T004（`replaceCollabProposedDates`）が Phase 1 で完了済み_

- [x] T012 [US5] `src/components/collab/CollabDetailModal.tsx` に `editingDateIndex: number | null` state・`editDateValue: string` state を追加し、編集中のインデックスの行を `datetime-local` input に切り替えるよう変更
- [x] T013 [US5] `CollabDetailModal.tsx` に `handleEditDate(originalIndex: number, newDateValue: string)` async 関数を実装（`replaceCollabProposedDates` 呼び出し。`proposedDates` の `originalIndex` 番を新しい日時で置き換えた配列を渡す）
- [x] T014 [US5] `CollabDetailModal.tsx` に `remapParticipantResponses(responses, deletedIndex)` 関数を実装（削除インデックスのエントリを除き、それより大きいインデックスを -1 シフト）
- [x] T015 [US5] `CollabDetailModal.tsx` に `handleDeleteDate(originalIndex: number)` async 関数を実装（`remapParticipantResponses` でレスポンス再インデックス後、`replaceCollabProposedDates` 呼び出し）
- [x] T016 [US5] `CollabDetailModal.tsx` の候補日程カード行に「編集（鉛筆）」「削除（ゴミ箱）」アイコンボタンを追加（`isOpen && canEdit` 時のみ表示。削除は `proposedDates.length <= 1` の場合は `disabled`）

**Checkpoint**: 候補日程の編集・削除が正常に動作し、参加者回答のインデックスが崩れない

---

## Phase 7: User Story 6 - 確定済みコラボの再調整（Priority: P1）🎯

**Goal**: 確定済みコラボを「調整中（open）」状態に戻せる

**Independent Test**: 確定済みコラボに「再調整する」が表示され、実行後にステータスが「調整中」に戻ることを確認

### Implementation for User Story 6

_T002（Cloud Function）・T003（エクスポート）・T005（httpsCallable）が Phase 1 で完了済み_

- [x] T017 [US6] `src/components/collab/CollabDetailModal.tsx` の `CollabDetailModalProps` に `onReopen?: () => void` を追加し、`reopenCollabSession` を `collabs.ts` からインポート
- [x] T018 [US6] `CollabDetailModal.tsx` に `showReopenConfirm: boolean` state と `reopening: boolean` state を追加
- [x] T019 [US6] `CollabDetailModal.tsx` に `handleReopen()` async 関数を実装（`reopenCollabSession({ teamId, sessionId: session.id })` 呼び出し → `onReopen?.()` → `onClose()`）
- [x] T020 [US6] `CollabDetailModal.tsx` のフッターに、`status === 'confirmed' && canEdit` の条件で「再調整する」ボタンと確認ダイアログ（`showReopenConfirm` で表示制御）を追加
- [x] T021 [US6] `src/app/(protected)/collabs/page.tsx` の `CollabDetailModal` 呼び出しに `onReopen={() => setSelectedSession(null)}` prop を追加

**Checkpoint**: 確定済みコラボの「再調整する」が2ステップで動作し、ステータスが open に戻る

---

## Phase 8: User Story 7 - 確定済みコラボの複製（Priority: P2）

**Goal**: 確定済みコラボをテンプレートとして新規コラボ調整を素早く作成できる

**Independent Test**: 確定済みコラボの「コピーして新規作成」をクリックし、タイトル・参加者が引き継がれたフォームが表示されることを確認

### Implementation for User Story 7

- [x] T022 [US7] `CollabDetailModal.tsx` の `CollabDetailModalProps` に `onDuplicate?: (session: CollabSession) => void` を追加
- [x] T023 [US7] `CollabDetailModal.tsx` のフッターに、`status === 'confirmed' && canEdit` の条件で「コピーして新規作成」ボタンを追加（クリックで `onDuplicate?.(session)` → `onClose()`）
- [x] T024 [US7] `collabs/page.tsx` に `duplicateSource: CollabSession | null` state を追加し、`onDuplicate` ハンドラーで `setDuplicateSource(session)` を実行
- [x] T025 [US7] `collabs/page.tsx` に `useEffect`（`[duplicateSource]` 依存）を追加（`duplicateSource` 変化時に `formTitle`・`formParticipants`・`content` をプリフィル）
- [x] T026 [US7] `collabs/page.tsx` の `handleSubmit` 成功後に `setDuplicateSource(null)` を追加してプリフィル状態をリセット

**Checkpoint**: 確定済みコラボから複製すると、タイトル・参加者が入力済みのフォームが表示される

---

## Phase 9: Polish & 品質確認

**Purpose**: ビルド・型・リントの最終確認

- [x] T027 [P] `CollabDetailModal.tsx` のフッターレイアウトを最終調整（`confirmed` 時: 「再調整」「複製」「URLコピー」「削除」ボタンが視覚的に整理されていること）
- [x] T028 `pnpm typecheck` を実行してエラーがないことを確認・修正
- [x] T029 [P] `pnpm lint` を実行してエラーがないことを確認・修正

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1（Foundational）→ Phase 5（US4）・Phase 7（US6）がブロック解除
Phase 2〜4（US1・US2・US3）: Phase 1 と並列実行可能（依存なし）
Phase 6（US5）: T004 完了後に開始可能（Phase 1 内で完了）
Phase 7（US6）: T002・T003・T005 完了後（Phase 1 内）
Phase 8（US7）: Phase 7 完了後（props 追加が依存）
Phase 9（Polish）: 全 Phase 完了後
```

### Parallel Execution Map

```
Phase 1 での並列:
  T001（respondToCollab 修正）
  T002（reopenCollabSession 新規作成）
  T004（replaceCollabProposedDates 追加）
  T005（reopenCollabSession httpsCallable 追加）
  → T003（index.ts エクスポート）は T002 完了後

Phase 1 完了後の並列:
  Group A: US1（T006・T007）
  Group B: US2（T008・T009）
  Group C: US3（T010）
  Group D: US5（T012〜T016）
  Group E: US6（T017〜T021）

US6 完了後:
  US7（T022〜T026）
```

---

## Implementation Strategy

### MVP First（P1 ストーリーのみ）

P1 スコープ: US1（ソート）・US2（タイムゾーン）・US3（レスポンシブ）・US6（再調整）

1. Phase 1（T001〜T005）: 基盤構築
2. Phase 2（T006〜T007）: ソート修正
3. Phase 3（T008〜T009）: タイムゾーン修正
4. Phase 4（T010）: レスポンシブ修正
5. Phase 7（T017〜T021）: 再調整機能
6. **STOP & VALIDATE**: P1 ストーリーが全て動作することを確認

### 完全実装

7. Phase 5（T011）: メモ→コメント（Cloud Function は Phase 1 で実装済み）
8. Phase 6（T012〜T016）: 候補日程編集・削除
9. Phase 8（T022〜T026）: 複製機能
10. Phase 9（T027〜T029）: 最終品質確認

---

## Notes

- `respondToCollab.ts` の T001 は Cloud Function のビルドが通ることを `functions/` ディレクトリで `pnpm build` or `npx tsc` で確認する
- `reopenCollabSession.ts` は `confirmCollabDate.ts` を参考に実装（同様の認証・トランザクションパターン）
- `replaceCollabProposedDates` は `Timestamp.fromDate(date)` で変換してから `updateDoc` に渡す
- `collabs/page.tsx` は独自インラインフォームを持つため `CollabForm.tsx` は変更対象外（US2 のタイムゾーン修正は `CollabForm.tsx` にも適用する）
- `collabs/page.tsx:147` の `proposedDate` ISO 変換は**実装済み**（`new Date(proposedDate).toISOString()` は既存コード）— T008・T009 の対象外
- `respondToCollab.ts` T001 のコメント追記では `Timestamp.now()` を使用すること（`FieldValue.serverTimestamp()` は `arrayUnion` 内ネストで使用不可 — Firestore 制約）
