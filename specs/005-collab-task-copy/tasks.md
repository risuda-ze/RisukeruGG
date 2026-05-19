# Tasks: コラボ再調整・復元

**Input**: Design documents from `specs/005-collab-task-copy/`
**Prerequisites**: plan.md ✅, spec.md ✅

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（異なるファイル、依存なし）
- **[Story]**: 対応するユーザーストーリー（US1, US2）

---

## Phase 1: Foundational（共通基盤）

**Purpose**: US1・US2 両方が依存する Cloud Function の型定義とリポジトリ拡張

**⚠️ CRITICAL**: このフェーズが完了するまで US1・US2 の実装は開始しない

- [ ] T001 Cloud Function `reopenCollabSession.ts` を `functions/src/collab/reopenCollabSession.ts` に新規作成（認証チェック・status→open・confirmedDate→null・linkedScheduleId→null・関連スケジュール削除）
- [ ] T002 `functions/src/index.ts` に `reopenCollabSession` をエクスポート追加
- [ ] T003 `src/lib/repositories/collabs.ts` に `reopenCollabSession` の `httpsCallable` 定義を追加

**Checkpoint**: Cloud Function が実装・エクスポートされ、クライアントから呼び出せる状態

---

## Phase 2: User Story 1 - 確定済みコラボを再調整状態に戻す（Priority: P1）🎯 MVP

**Goal**: 確定済みコラボに「再調整する」ボタンを追加し、2ステップ（ボタン→確認ダイアログ）で open 状態に戻せる

**Independent Test**: コラボを確定 → 詳細画面の「再調整する」ボタンをクリック → 確認ダイアログ → 実行 → ステータスが「調整中」に戻り、確定日・紐づきスケジュールが削除されていることを確認

### Implementation for User Story 1

- [ ] T004 [US1] `src/components/collab/CollabDetailModal.tsx` の `CollabDetailModalProps` に `onReopen?: () => void` を追加し、`reopenCollabSession` のインポートを追加
- [ ] T005 [US1] `CollabDetailModal.tsx` のフッターに、`status === 'confirmed'` かつ `canEdit` の条件で「再調整する」ボタンを追加（スタイル: amber 系）
- [ ] T006 [US1] `CollabDetailModal.tsx` に再調整確認ダイアログ state（`showReopenConfirm`）と `handleReopen` async 関数を実装（`reopenCollabSession` 呼び出し → `onReopen?.()` → `onClose()`）
- [ ] T007 [US1] `src/app/(protected)/collabs/page.tsx` の `CollabDetailModal` に `onReopen` prop を追加（`() => setSelectedSession(null)` で一覧に戻る）

**Checkpoint**: 確定済みコラボに「再調整する」ボタンが表示され、実行後にステータスが「調整中」に戻る

---

## Phase 3: User Story 2 - 確定済みコラボを複製して新規調整を作成（Priority: P2）

**Goal**: 確定済みコラボの詳細画面から「コピーして新規作成」ボタンで、タイトル・パートナー名・参加者を引き継いで新規コラボフォームに遷移できる

**Independent Test**: 確定済みコラボの詳細画面で「コピーして新規作成」をクリック → モーダルが閉じ → コラボ作成フォームにタイトル・参加者が事前入力されていることを確認

### Implementation for User Story 2

- [ ] T008 [US2] `CollabDetailModal.tsx` の props に `onDuplicate?: (session: CollabSession) => void` を追加
- [ ] T009 [US2] `CollabDetailModal.tsx` のフッターに、`status === 'confirmed'` かつ `canEdit` の条件で「コピーして新規作成」ボタンを追加（スタイル: secondary 系）。クリックで `onDuplicate?.(session)` → `onClose()` を呼ぶ
- [ ] T010 [US2] `collabs/page.tsx` に `duplicateSource: CollabSession | null` state を追加し、`onDuplicate` ハンドラーで `duplicateSource` にセット
- [ ] T011 [US2] `collabs/page.tsx` の `useEffect` を追加（`duplicateSource` が変わったとき、`formTitle`・`content`・`formParticipants` を複製元の値でプリフィルし、画面を新規フォームにスクロール）
- [ ] T012 [US2] `collabs/page.tsx` のフォーム送信成功後（`handleSubmit`）に `duplicateSource` を null にリセット

**Checkpoint**: 確定済みコラボから複製すると、フォームに元のタイトル・参加者が入力された状態でフォームが表示される

---

## Phase 4: Polish & 品質

**Purpose**: ユーザー体験の細部調整

- [ ] T013 [P] `CollabDetailModal.tsx` のフッターレイアウトを調整：`confirmed` ステータス時は「再調整」「複製」「URLコピー」「削除」ボタンを適切に配置（削除ボタンは右端など）
- [ ] T014 型チェック実行 `pnpm typecheck` でエラーがないことを確認し修正
- [ ] T015 [P] ESLint チェック `pnpm lint` でエラーがないことを確認し修正

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: 即座に開始可能 — US1・US2 をブロック
- **User Story 1 (Phase 2)**: Phase 1 完了後に開始
- **User Story 2 (Phase 3)**: Phase 1 完了後に開始（US1 と並列可能）
- **Polish (Phase 4)**: US1・US2 完了後

### Within User Story 1

```
T004（props/import） → T005（ボタンUI） → T006（ダイアログ/ハンドラー） → T007（ページ統合）
```

### Within User Story 2

```
T008（props追加） → T009（ボタンUI） → T010（page state） → T011（プリフィル） → T012（リセット）
```

### Parallel Opportunities

- **Phase 1**: T001（Cloud Function）と T003（repository）は並列実行可能（T002 は T001 完了後）
- **US1 と US2**: Phase 1 完了後、T004〜T007 と T008〜T012 は別ファイルのため並列実行可能

---

## Parallel Example: Phase 1

```bash
# 並列実行可能:
Task T001: "Cloud Function reopenCollabSession.ts 作成"
Task T003: "collabs.ts に httpsCallable 定義追加"

# T001 完了後:
Task T002: "index.ts にエクスポート追加"
```

---

## Implementation Strategy

### MVP First (User Story 1 のみ)

1. Phase 1 完了（T001-T003）
2. Phase 2 完了（T004-T007）
3. **STOP & VALIDATE**: 確定済みコラボを再調整できることを確認
4. 動作確認後に Phase 3（US2）へ進む

### Incremental Delivery

1. Phase 1（基盤）→ 確認
2. Phase 2（再調整）→ MVP として機能確認 → デモ可能
3. Phase 3（複製）→ 追加価値として実装
4. Phase 4（Polish）→ リリース前最終調整

---

## Notes

- Cloud Function `reopenCollabSession` は `confirmCollabDate.ts` を参考に実装（同様の認証・トランザクションパターン）
- `linkedScheduleId` が指すスケジュールが既に削除済みの場合は `delete` をスキップしエラーにしない
- 複製時の参加者プリフィルは `CollabParticipant[]` をそのまま使用（IDは新規 collab では意味が変わるが参照時に問題なし）
- `collabs/page.tsx` は inline フォームを使用しているため `CollabForm.tsx` コンポーネントは変更不要
