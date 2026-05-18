# Tasks: スケジュール・UI改善 + 複数チーム所属

**Input**: Design documents from `specs/003-schedule-ui-improvements/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅

**Organization**: タスクはユーザーストーリー別に整理。各フェーズは独立して実装・テスト可能。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（異なるファイル、依存なし）
- **[Story]**: 対応するユーザーストーリー（US1〜US7）
- 各タスクに正確なファイルパスを記載

---

## Phase 1: Setup（共有インフラ）

**Purpose**: 追加ライブラリのインストール

- [X] T001 `react-markdown` と `remark-gfm` をインストールし `package.json` に追加 (`pnpm add react-markdown remark-gfm`)

---

## Phase 2: Foundational（ブロッキング前提条件）

**Purpose**: 複数のユーザーストーリーが依存する共有コンポーネント・型・ユーティリティを先に作成する

**⚠️ CRITICAL**: このフェーズが完了するまで US3・US4・US6・US7 の実装を開始できない

- [X] T002 [P] `DateTimeInput` コンポーネントを新規作成する (`src/components/ui/DateTimeInput.tsx`) — `Date | null ↔ datetime-local string` 変換・ラベル・エラー表示を統一
- [X] T003 [P] `MarkdownEditor` コンポーネントを新規作成する (`src/components/ui/MarkdownEditor.tsx`) — textarea（編集）と react-markdown（プレビュー）をトグルボタンで切替、`readOnly` prop で表示専用モード対応
- [X] T004 [P] `formDraft` ユーティリティを新規作成する (`src/lib/formDraft.ts`) — `saveDraft<T>`, `loadDraft<T>`, `clearDraft` を実装。Date は ISO 文字列にシリアライズ
- [X] T005 [P] `ScheduleEntry` 型に `allDay?: boolean` を追加する (`src/types/entities.ts`)
- [X] T006 `User` 型に `teamIds: string[]` を追加する (`src/types/entities.ts`) — T005 と同一ファイルのため T005 完了後に実行

**Checkpoint**: 共有コンポーネント・型が揃ったので US1〜US7 を並列実装可能

---

## Phase 3: User Story 1 — 複数日程の予定を正しく表示する (Priority: P1) 🎯 MVP

**Goal**: 複数日にまたがるイベントが全対象日付のセルに表示される

**Independent Test**: 3日間の予定（例: 5/18 09:00 〜 5/20 18:00）を登録し、週ビュー・月ビューで 5/18・5/19・5/20 の3日ともカードが表示されることを確認

### Implementation

- [X] T007 [P] [US1] `WeekCalendar` のイベントフィルタを `isSameDay` から範囲判定に変更する (`src/components/calendar/WeekCalendar.tsx`) — `s.startAt <= endOfDay(day) && s.endAt >= startOfDay(day)` で全対象日にイベントを表示
- [X] T008 [P] [US1] `MonthCalendar` のイベントフィルタを `isSameDay` から範囲判定に変更する (`src/components/calendar/MonthCalendar.tsx`) — 同様の範囲判定ロジックを適用
- [X] T009 [US1] `WeekCalendar` の複数日イベントカードにスパンスタイルを追加する (`src/components/calendar/WeekCalendar.tsx`) — 初日でない日のカードに「前日から継続」スタイル（左端なし・角丸なし）、最終日でない日に「翌日へ続く」スタイル（右端なし）を適用
- [ ] T010 [US1] 複数日イベントフィルタのユニットテストを追加する (`tests/unit/schedule/multiDayFilter.test.ts`) — 単日・複数日・跨ぎケースを網羅

**Checkpoint**: 複数日予定が全日付で表示される（US1 完了）

---

## Phase 4: User Story 2 — 日曜始まりカレンダー (Priority: P2)

**Goal**: 週ビュー・月ビューの先頭が日曜日になっている

**Independent Test**: スケジュール画面を開き、週ヘッダー左端が「日」、右端が「土」になっていることを確認

### Implementation

- [X] T011 [P] [US2] `WeekCalendar` の週開始を月曜から日曜に変更する (`src/components/calendar/WeekCalendar.tsx`) — `weekStartsOn: 1 → 0`、曜日ヘッダー配列を `['日','月','火','水','木','金','土']` に変更
- [X] T012 [P] [US2] `MonthCalendar` の週開始を月曜から日曜に変更する (`src/components/calendar/MonthCalendar.tsx`) — `weekStartsOn: 1 → 0`、曜日ヘッダー配列を更新
- [X] T013 [P] [US2] `schedule/page.tsx` の `startOfWeek` 呼び出しを日曜始まりに変更する (`src/app/(protected)/schedule/page.tsx`) — `weekStartsOn: 1 → 0`

**Checkpoint**: カレンダーが日曜始まりになっている（US2 完了）

---

## Phase 5: User Story 3 — フォームへのマークダウン入力 (Priority: P2)

**Goal**: スケジュール・タスクの説明フィールドでマークダウン記法が使える

**Independent Test**: スケジュール作成フォームの説明欄に `**太字**` を入力してプレビューボタンを押し、太字でレンダリングされることを確認

### Implementation

- [X] T014 [P] [US3] `ScheduleForm` の description フィールドを `MarkdownEditor` に置き換える (`src/components/calendar/ScheduleForm.tsx`) — 既存の `<textarea>` を `<MarkdownEditor>` に差し替え、maxLength を維持
- [X] T015 [P] [US3] `ScheduleDetailModal` の description フィールドと表示を `MarkdownEditor` に置き換える (`src/components/calendar/ScheduleDetailModal.tsx`) — 編集時は編集モード、表示時は `readOnly` モードで描画
- [X] T016 [P] [US3] タスク詳細の description フィールドに `MarkdownEditor` を適用する（`src/components/tasks/` 配下のタスク詳細モーダルを特定し差し替え）— 該当ファイルが存在しない場合はスキップ

**Checkpoint**: 説明フィールドでマークダウンの入力・プレビューができる（US3 完了）

---

## Phase 6: User Story 4 — フォームドラフト自動保存 (Priority: P2)

**Goal**: 「確定」以外でフォームを閉じても、次回開いた際に入力内容が復元される

**Independent Test**: スケジュール作成フォームにタイトルを入力 → ×ボタンで閉じる → 再度「予定を追加」をクリック → タイトルが復元されていることを確認

### Implementation

- [X] T017 [US4] `ScheduleForm`（新規作成モーダル）にドラフト保存・復元を追加する (`src/components/calendar/ScheduleForm.tsx`) — onClose 時に `saveDraft('draft:schedule:new', formValues)`、起動時に `loadDraft` で復元、onSubmit 成功後に `clearDraft`
- [X] T018 [US4] `ScheduleDetailModal`（編集モーダル）にドラフト保存・復元を追加する (`src/components/calendar/ScheduleDetailModal.tsx`) — ドラフトキー `draft:schedule:{scheduleId}` を使用
- [X] T019 [US4] タスク詳細モーダル（存在する場合）にドラフト保存・復元を追加する — 該当ファイルを特定し同様のパターンを適用。存在しない場合はスキップ

**Checkpoint**: フォームのドラフトが自動保存・復元される（US4 完了）

---

## Phase 7: User Story 5 — スケジュールカードにアイコン表示 (Priority: P3)

**Goal**: 週ビューの予定カードにカテゴリアイコンが表示され、最小高さが調整される

**Independent Test**: アイコン設定済みのカテゴリを持つ予定を作成し、週ビューでカードにアイコンが見えることを確認

### Implementation

- [X] T020 [US5] `WeekCalendar` の予定カードにカテゴリアイコンと高さ調整を追加する (`src/components/calendar/WeekCalendar.tsx`) — `ScheduleCategory.icon` を `<span className="material-icons text-sm">` で表示、カードに `min-h-[40px]` を設定してアイコン+タイトルが見える高さを確保

**Checkpoint**: 予定カードにアイコンが表示される（US5 完了）

---

## Phase 8: User Story 6 — 終日イベント作成 (Priority: P3)

**Goal**: 「終日」ボタン1クリックで開始 00:00・終了 23:59 が設定され、開始日時入力時に終了日時が自動補完される

**Independent Test**: スケジュール作成フォームで日付を入力 → 「終日」ボタンクリック → 開始が 00:00・終了が 23:59 になることを確認

### Implementation

- [X] T021 [P] [US6] `ScheduleForm` に終日ボタン・終了日時自動補完を追加する (`src/components/calendar/ScheduleForm.tsx`) — 開始日時 `DateTimeInput` の右に「終日」ボタンを設置。startAt の onChange ハンドラーで endAt が未設定 or endAt < startAt の場合に `startAt + 2時間` を自動設定。「終日」クリック時は `startAt.setHours(0,0,0,0)` / `endAt.setHours(23,59,59,999)` を設定
- [X] T022 [P] [US6] `ScheduleDetailModal` に終日ボタン・終了日時自動補完を追加する (`src/components/calendar/ScheduleDetailModal.tsx`) — 同様のロジックを適用
- [ ] T023 [US6] 終日フラグ・endAt 自動補完のユニットテストを追加する (`tests/unit/schedule/allDayLogic.test.ts`) — 終日ボタン動作・2時間後自動補完・既存 endAt がある場合の挙動を検証

**Checkpoint**: 終日ボタンと自動補完が動作する（US6 完了）

---

## Phase 9: User Story 7 — 複数チーム同時所属とチーム切替 (Priority: P3)

**Goal**: 1ユーザーが複数チームに所属でき、チームスイッチャーで切り替えられる

**Independent Test**: 2チームに参加した状態でチームスイッチャーを使い、チームAとチームBのデータが正しく切り替わることを確認

### Implementation

**Cloud Functions（先行）**:

- [X] T024 [P] [US7] `joinTeam` Cloud Function から旧チーム削除ロジックを除去し `teamIds` 配列追加に変更する (`functions/src/teams/joinTeam.ts`) — `tx.delete(oldTeam/members/uid)` を削除、`FieldValue.arrayUnion(teamId)` で teamIds に追加
- [X] T025 [P] [US7] `createTeam` Cloud Function から旧チーム削除ロジックを除去し `teamIds` 配列追加に変更する (`functions/src/teams/createTeam.ts`) — 同様の変更を適用
- [X] T026 [P] [US7] `leaveSpecificTeam` Cloud Function を新規作成する (`functions/src/teams/leaveSpecificTeam.ts`) — 指定チームの `members/{uid}` を削除、`teamIds` から除外、currentTeamId が退出チームなら残りの teamIds[0] に切替、teamIds が空になる場合は solo チームを自動生成
- [X] T027 [P] [US7] `switchActiveTeam` Cloud Function を新規作成する (`functions/src/teams/switchActiveTeam.ts`) — teamIds 所属チェック後に `users/{uid}.currentTeamId` のみ更新する軽量関数
- [X] T028 [US7] `onUserCreate` Cloud Function を `teamIds: [soloTeamId]` で初期化するよう更新する (`functions/src/auth/onUserCreate.ts`)

**フロントエンド（Cloud Functions 完了後）**:

- [X] T029 [US7] `teams.ts` リポジトリに `leaveSpecificTeam`・`switchActiveTeam` の `httpsCallable` を追加する (`src/lib/repositories/teams.ts`)
- [X] T030 [US7] `auth` ストアに `teamIds: string[]` フィールドを追加し `users/{uid}` の onSnapshot から購読する (`src/stores/auth.ts`)
- [X] T031 [US7] `TeamSwitcher` コンポーネントを新規作成する (`src/components/layout/TeamSwitcher.tsx`) — 現在のアクティブチーム名表示、ドロップダウンで全所属チームを一覧、選択時に `switchActiveTeam` を呼び出し
- [X] T032 [US7] `Sidebar` と `BottomNav` にチーム切替手段を統合する — デスクトップ（md以上）: `src/components/layout/Sidebar.tsx` のナビゲーション上部に `TeamSwitcher` ドロップダウンを配置。モバイル（md未満）: `src/components/layout/BottomNav.tsx` にチームアイコン/スイッチャーを追加し、タップでチーム切替できるようにする
- [X] T033 [US7] `team/page.tsx` を複数チーム対応に更新する (`src/app/(protected)/team/page.tsx`) — 所属チーム一覧セクション（チームカード＋「アクティブにする」「退出する」ボタン）を追加、「別のチームに参加する」フォームを既所属ユーザーにも表示（`JoinTeamForm` コンポーネントを `src/components/team/JoinTeamForm.tsx` に分離して実装し、ページに組み込む）
- [ ] T034 [US7] `leaveSpecificTeam` Cloud Function のユニットテストを追加する (`tests/unit/teams/leaveSpecificTeam.test.ts`) — 通常退出・最後のチームからの退出時の solo チーム自動生成・teamIds が未設定の既存ユーザーのフォールバック補完ロジックを検証

**Checkpoint**: 複数チームへの同時所属とチーム切替が動作する（US7 完了）

---

## Phase 10: Polish & 横断的関心事

**Purpose**: 型チェック・Lint・品質確認

- [X] T035 [P] TypeScript の型チェックを実行してエラーをすべて修正する (`pnpm typecheck`)
- [X] T036 [P] ESLint を実行して lint エラーをすべて修正する (`pnpm lint:fix`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし — 即開始可能
- **Foundational (Phase 2)**: Phase 1 完了後 — US3・US4・US6・US7 をブロック
- **US1 (Phase 3)**: Phase 2 完了後 — 他の US に依存しない
- **US2 (Phase 4)**: Phase 2 完了後 — 他の US に依存しない
- **US3 (Phase 5)**: Phase 2（T003 `MarkdownEditor`）完了後
- **US4 (Phase 6)**: Phase 2（T004 `formDraft`）完了後
- **US5 (Phase 7)**: Phase 2 完了後 — 他の US に依存しない
- **US6 (Phase 8)**: Phase 2（T002 `DateTimeInput`、T005 `allDay` 型）完了後
- **US7 (Phase 9)**: Phase 2（T006 `teamIds` 型）完了後
- **Polish (Phase 10)**: 全 US 完了後

### User Story Dependencies

| ストーリー | 前提条件 | 備考 |
|-----------|---------|------|
| US1 | Phase 2 完了 | 独立 |
| US2 | Phase 2 完了 | 独立（US1 と同じファイルに触れるため作業を分離） |
| US3 | T003 完了 | 独立 |
| US4 | T004 完了 | 独立（T003 と同じファイルに触れるため US3 完了後推奨） |
| US5 | Phase 2 完了 | 独立（US1/US2 と同じファイルに触れるため完了後推奨） |
| US6 | T002, T005 完了 | 独立 |
| US7 | T006 完了 | Cloud Functions は先行して並列実装可能 |

### Parallel Opportunities

- T002〜T006 は全て異なるファイルを扱うため並列実行可能
- US1 の T007・T008 は異なるファイルのため並列実行可能
- US2 の T011〜T013 は全て異なるファイルのため並列実行可能
- US3 の T014〜T016 は全て異なるファイルのため並列実行可能
- US7 の Cloud Functions（T024〜T028）は全て異なるファイルのため並列実行可能

---

## Parallel Example: Phase 2（Foundational）

```text
# 全て異なるファイルなので同時実行可能:
T002: src/components/ui/DateTimeInput.tsx を作成
T003: src/components/ui/MarkdownEditor.tsx を作成
T004: src/lib/formDraft.ts を作成
T005: src/types/entities.ts に allDay フィールドを追加
T006: src/types/entities.ts に teamIds フィールドを追加 ← T005 完了後に実行（同一ファイル）
```

## Parallel Example: US7 Cloud Functions

```text
# 全て異なるファイルなので同時実行可能:
T024: functions/src/teams/joinTeam.ts を更新
T025: functions/src/teams/createTeam.ts を更新
T026: functions/src/teams/leaveSpecificTeam.ts を新規作成
T027: functions/src/teams/switchActiveTeam.ts を新規作成
```

---

## Implementation Strategy

### MVP First（User Story 1 のみ）

1. Phase 1: Setup（T001）
2. Phase 2: Foundational（T002〜T006）
3. Phase 3: US1（T007〜T010）
4. **STOP & VALIDATE**: 複数日イベントが正しく表示されることを確認
5. 必要なら Deploy/Demo

### Incremental Delivery

1. Phase 1 + Phase 2 → 共有基盤が完成
2. US1（バグ修正） → テスト → 即デプロイ可能
3. US2（日曜始まり） → テスト → デプロイ
4. US3/US4（マークダウン・ドラフト） → テスト → デプロイ
5. US5/US6（カードアイコン・終日） → テスト → デプロイ
6. US7（複数チーム） → Cloud Functions デプロイ → フロントエンド → テスト

---

## Notes

- `[P]` タスク = 異なるファイルを扱い依存関係がないため並列実行可能
- `[US#]` ラベルはタスクを spec.md のユーザーストーリーに対応付ける
- US1・US2 は同じ `WeekCalendar.tsx` に触れるため、同一ファイルの作業は順次実行すること
- US3・US4 は同じ `ScheduleForm.tsx` / `ScheduleDetailModal.tsx` に触れるため、US3 完了後に US4 を実装すること
- US7 の Cloud Functions は Firebase コンソールまたは `firebase deploy --only functions` でデプロイが必要
- タスク完了後は `pnpm typecheck` と `pnpm lint` を都度実行して品質を維持する
