# Tasks: チーム権限バグ修正 & メンバースケジュール閲覧機能

**Input**: Design documents from `specs/011-team-permission-member-schedule/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1〜US7)
- Include exact file paths in descriptions

---

## Phase 1: Setup (共通準備)

**Purpose**: 型定義・Firestore ルールなど、全ストーリーに共通する基盤を整備する

- [X] T001 `MemberCalendarEvent` インターフェースを `src/types/entities.ts` に追加する（`id, title, startAt, endAt, allDay, sourceEventId, syncedAt` フィールド）
- [X] T002 `src/lib/repositories/memberCalendars.ts` を新規作成し、`saveMemberCalendarEvents`, `subscribeMemberCalendarEvents`, `getMemberCalendarEvents` 関数の骨格（型シグネチャのみ）を定義する
- [X] T003 `firestore.rules` に `teams/{teamId}/memberCalendars/{userId}/events/{eventId}` のルールを追加する（read: isTeamMember、write: request.auth.uid == userId）

**Checkpoint**: 型定義と Security Rules が揃った状態。ここから各ストーリーを独立して実装できる

---

## Phase 2: Foundational (共通確認)

**Purpose**: バグ修正の前提となる既存コードの動作を確認・整理する

- [X] T004 `src/components/team/RoleChangeDialog.tsx` の現在の実装を読み、`currentOperatorId` prop とその利用箇所を全て特定する
- [X] T005 [P] `src/app/(protected)/team/page.tsx` の `RoleChangeDialog` へ渡している `currentOperatorId={myMember?.userId}` と `member.role !== 'operator'` フィルタの箇所を特定する
- [X] T006 [P] `src/components/team/TeamJoinForm.tsx` の現在の実装を読み、チームコード送信フロー全体を把握する

**Checkpoint**: 修正が必要な全箇所を特定済み

---

## Phase 3: US1 - オペレーター権限バグ修正 (Priority: P1) 🎯 最優先

**Goal**: チーム内に複数のオペレーターを設定可能にし、カテゴリ/カラム作成失敗を解消する

**Independent Test**: チーム管理画面でメンバーBをオペレーターに変更した後、メンバーAのオペレーター権限が維持され、両者がカンバンカラム/カテゴリを作成できる

### Implementation for US1

- [X] T007 [US1] `src/components/team/RoleChangeDialog.tsx` から `currentOperatorId` prop を削除し、`if (newRole === 'operator' && currentOperatorId)` の強制降格ブロックを削除する
- [X] T008 [US1] `RoleChangeDialog` の「オペレーターへ昇格すると現在のオペレーターはメンバーに降格されます」という警告メッセージを削除する
- [X] T009 [US1] `src/app/(protected)/team/page.tsx` のロール変更UI表示条件 `member.role !== 'operator'` を削除し、オペレーターのロール変更も可能にする
- [X] T010 [US1] `src/app/(protected)/team/page.tsx` の `<RoleChangeDialog>` に渡している `currentOperatorId={myMember?.userId}` prop を削除する
- [X] T011 [US1] `src/components/team/RoleChangeDialog.tsx` の `RoleChangeDialogProps` インターフェースから `currentOperatorId?: string` フィールドを削除し、型チェックを通す

**Checkpoint**: オペレーター複数設定が可能になり、カテゴリ/カラム作成失敗も解消されていること

---

## Phase 4: US2 - 別チーム参加時の脱退確認 (Priority: P1)

**Goal**: 別チームのチームコードで参加する前に、現在のチームから脱退するか確認する

**Independent Test**: チームAに所属した状態でチームBのコードを入力すると「現在のチームから脱退しますか？」ダイアログが表示され、「脱退して参加」を選んだ場合はチームAから脱退後チームBに参加できる

### Implementation for US2

- [X] T012 [US2] `src/components/team/TeamJoinForm.tsx` にチームコード送信後の確認ダイアログ状態を追加する（`pendingTeamCode` state と確認ダイアログ表示ロジック）
- [X] T013 [US2] 確認ダイアログ「現在のチームに所属したままにしますか？」を実装する（Modalコンポーネントを利用、「はい（そのまま参加）」「いいえ（脱退して参加）」2択）
- [X] T014 [US2] 「いいえ（脱退して参加）」選択時の処理を実装する：`leaveSpecificTeam({ teamId: currentTeamId })` を先に呼び出した後 `joinTeam({ teamCode })` を呼ぶ
- [X] T015 [US2] 現在チームに所属していない状態（`currentTeamId === null` または `teamIds.length === 0`）では確認なしに `joinTeam` を直接呼ぶ条件分岐を追加する
- [X] T016 [US2] `src/app/(protected)/team/page.tsx` の「別のチームに所属する」セクションの説明文を「現在のチームから脱退して参加することもできます」に更新する

**Checkpoint**: 別チーム参加時に確認ダイアログが表示され、脱退→参加のフローが動作すること

---

## Phase 5: US3 - サイドバーのチーム切り替え修正 (Priority: P1)

**Goal**: サイドバーのチーム切り替えボタンでチームを選択すると、全データが新チームに切り替わる

**Independent Test**: 複数チームに所属したユーザーがサイドバーでチームBを選択すると、スケジュール・タスク・メンバー一覧が全てチームBのデータに更新される

### Implementation for US3

- [X] T017 [US3] `src/components/layout/TeamSwitcher.tsx` の `handleSwitch` 関数で `switchActiveTeam` 呼び出し完了後に `router.refresh()` を追加し、Next.js のルーターキャッシュを無効化する
- [X] T018 [US3] `src/components/layout/TeamSwitcher.tsx` に `useRouter` を import し、切り替え完了時にページ全体を再フェッチする
- [X] T019 [US3] 切り替え中の視覚フィードバック（`switching` state）が正しく機能することを確認し、必要であればローディング表示を改善する

**Checkpoint**: サイドバーでチームを切り替えると、全ページのデータが新チームに更新されること

---

## Phase 6: US4 - ログイン時 Google カレンダー同期 (Priority: P1)

**Goal**: ユーザーがログインした時、Googleカレンダーの予定（時間のみ、タイトル=「{name} の予定」）をチームのFirestoreに保存する

**Independent Test**: Googleカレンダー連携済みユーザーがログインすると `teams/{teamId}/memberCalendars/{userId}/events` にイベントが書き込まれる（Firebase コンソールで確認）

### Implementation for US4

- [X] T020 [US4] `src/lib/repositories/memberCalendars.ts` に `saveMemberCalendarEvents` 関数を実装する（`writeBatch` を使い、`sourceEventId` をドキュメントIDとして使用、`title = "{displayName} の予定"`、`startAt/endAt/allDay/sourceEventId/syncedAt` のみ保存）
- [X] T021 [US4] `src/stores/auth.ts` の `onSnapshot` コールバック内（`currentTeamId` 確定後）に Google カレンダー同期ロジックを追加する：`googleAccessToken` が存在する場合のみ `fetchGCalEvents()` を呼び出す
- [X] T022 [US4] 取得したイベントを `saveMemberCalendarEvents(currentTeamId, uid, events)` で保存する処理を `src/stores/auth.ts` に追加する（今日〜14日先のイベントを対象、タイトルは displayName から生成）
- [X] T023 [US4] `src/lib/googleCalendar.ts` の `fetchGCalEvents` が返す `ScheduleEntry` から `start.dateTime/date` と `end.dateTime/date` を `Timestamp` に変換するユーティリティを `src/lib/repositories/memberCalendars.ts` に追加する
- [X] T024 [US4] `src/stores/auth.ts` でエラー発生時（Google API 失敗）はサイレントに無視し、ユーザー体験を妨げないエラーハンドリングを実装する

**Checkpoint**: ログイン後にFirebase コンソールで `memberCalendars/{userId}/events` にデータが書き込まれていること

---

## Phase 7: US5 - スケジュール画面でメンバー予定を表示 (Priority: P1)

**Goal**: スケジュール画面で「メンバーの予定」トグルをONにすると、チームメンバーが同期した予定がカレンダーに表示される

**Independent Test**: スケジュール画面の「メンバーの予定」トグルをONにすると、他のメンバーがFirestoreに同期した「{name} の予定」エントリがカレンダーに表示される

### Implementation for US5

- [X] T025 [US5] `src/lib/repositories/memberCalendars.ts` に `subscribeMemberCalendarEvents(teamId, callback)` を実装する（全メンバーのサブコレクションをコレクショングループクエリで購読）
- [X] T026 [US5] `src/app/(protected)/schedule/page.tsx`（または該当するカレンダーコンポーネント）に「メンバーの予定」表示トグルを追加する（デフォルト: OFF）
- [X] T027 [US5] トグルが ON の場合、`subscribeMemberCalendarEvents` でリアルタイム取得し、`ScheduleEntry` 形式に変換してカレンダーイベントリストに追加する
- [X] T028 [US5] メンバーの予定を視覚的に区別するために色・ラベルを設定する（例: 半透明の別色、「{name} の予定」ラベル表示）

**Checkpoint**: スケジュール画面でメンバーの予定トグルをONにすると、Firestoreに保存されたメンバーの予定が表示されること（ログアウト中のメンバーの予定も表示される）

---

## Phase 8: US6 - 自分の予定の重複排除 (Priority: P2)

**Goal**: Googleカレンダーから直接取得した自分の予定と、Firestoreに保存された「自分の予定」が重複表示されない

**Independent Test**: 自分のGoogleカレンダーと「メンバーの予定」トグルを両方ONにしても、同一のイベントが1件のみ表示される

### Implementation for US6

- [X] T029 [US6] `src/app/(protected)/schedule/page.tsx` のイベント一覧構築ロジックで、`source: 'google'` のイベントと `memberCalendars` から取得した `currentUser.uid` のイベントを突き合わせる処理を追加する
- [X] T030 [US6] `memberCalendars` から取得したイベントのうち、`userId === currentUser.uid` のものは `source: 'google'` が有効な場合は除外するフィルタロジックを実装する

**Checkpoint**: 自分のGoogleカレンダーとメンバー予定を両方ONにしても重複が表示されないこと

---

## Phase 9: US7 - AI へのメンバー・チームスケジュールコンテキスト追加 (Priority: P3)

**Goal**: AIチャットがFirestoreのメンバーカレンダーとチームスケジュールを参照して予定に関する質問に回答できる

**Independent Test**: AIに「今週チームメンバーの予定を教えて」と聞くと、Firestoreのデータを基にした具体的な回答が返ってくる

### Implementation for US7

- [X] T031 [US7] `src/components/ai/AIChatPage.tsx` の `buildContext()` に `memberCalendars` フィールドを追加する：`subscribeMemberCalendarEvents` で取得した全メンバーの予定を `{ userId, displayName, startAt, endAt, allDay }[]` 形式で渡す（今日〜14日先、各ユーザー最大20件にトリミング）
- [X] T032 [US7] `src/app/api/ai/chat/route.ts` の `context` 型定義に `memberCalendars?: Array<{ userId: string; displayName: string; startAt: string; endAt: string; allDay: boolean }>` フィールドを追加する
- [X] T033 [US7] `src/app/api/ai/chat/route.ts` に `formatMemberCalendars()` 関数を追加し、`context.memberCalendars` を「メンバーの予定（2週間以内）:\n- {name}: {date} {時間}」形式に整形してシステムプロンプトの末尾に追加する
- [X] T034 [US7] `AIChatPage.tsx` の `buildContext()` で `memberCalendars` を渡す際、今日〜14日先のイベントのみに絞り、`userId === currentUser.uid` のイベントは重複防止のため除外する

**Checkpoint**: AIチャットで「メンバーの予定は？」と聞くとFirestoreのデータを参照した回答が返ること

---

## Phase 10: Polish & 検証

**Purpose**: 全体の動作確認、型チェック、リント

- [X] T035 [P] `pnpm typecheck` を実行し、TypeScript エラーがないことを確認する（エラーがあれば修正）
- [X] T036 [P] `pnpm lint` を実行し、ESLint エラーがないことを確認する（エラーがあれば修正）
- [X] T037 `docs/progress.md` を更新し、各スプリントの完了状態と起動方法・テストシナリオを記録する

---

## Phase 11: Sprint 0 - 権限スキーマ完全統一

**Purpose**: 旧ロール名（`owner`/`editor`/`viewer`）をコードベース・Firestore・Security Rules から完全に除去し、`operator`/`member`/`rom` に統一する

**Independent Test**: オペレーターが別メンバーをオペレーターに昇格させ、元のオペレーターを降格させることなく正常に完了する

### Setup (Phase 11)

- [X] T038 `functions/src/admin/migrateRoles.ts` を新規作成する：Admin SDK を使い全チームの全メンバードキュメントをスキャンして `role: 'owner'→'operator'`/`'editor'→'member'`/`'viewer'→'rom'` へ更新する `onCall` CF
- [X] T039 `functions/src/index.ts` に `export * from './admin/migrateRoles';` を追加する

### updateMemberRole CF 化

- [X] T040 `src/lib/repositories/teams.ts` の `updateMemberRole` を再度 CF 呼び出しに戻す（直接書き込みより Admin SDK 経由の方がセキュリティ上安全）

### normalizeRole の廃止

- [ ] T041 [P] `functions/src/lib/validateAuth.ts` の `normalizeRole` から `'owner'→'operator'`/`'editor'→'member'`/`'viewer'→'rom'` の旧→新変換を削除する（移行完了後は全ドキュメントが新スキーマのため不要。T044 実行後に対応）
- [ ] T042 [P] `src/lib/repositories/teams.ts` の `normalizeRole` から同様の旧→新変換を削除する（T044 実行後に対応）

### Firebase デプロイ

- [X] T043 `functions/src/teams/updateMemberRole.ts` と `functions/src/admin/migrateRoles.ts` の 2 CF を Firebase にデプロイする
- [X] T047 `src/app/(protected)/team/page.tsx` にオペレーター向け「ロールデータ移行」ボタンを追加し、`migrateRoles` CF をアプリ内から呼び出せるようにする
- [ ] T044 オペレーターとして本番アプリにログインし、チーム設定の「ロール移行」ボタンを押して Firestore 全メンバーを新スキーマへ移行する
- [ ] T045 `firestore.rules` を更新する：`isTeamOwner` → `role == 'operator'`、`isOwnerOrEditor` → `role in ['operator', 'member']`（旧ロール名を除去）
- [ ] T046 更新した `firestore.rules` を Firebase にデプロイする

**Checkpoint**: Security Rules に旧ロール名が存在せず、Firestore データが全て新スキーマで normalizeRole が identity 関数になっていること

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし → 即時開始可能
- **Foundational (Phase 2)**: Phase 1 完了後 → 並行で進行可能
- **US1〜US3 (Phase 3〜5)**: Phase 2 完了後 → バグ修正は相互独立、並行可能
- **US4〜US7 (Phase 6〜9)**: Phase 1（型定義/Security Rules）完了後 → US4→US5→US6の順に依存（US4のFirestore書き込みがUS5の表示の前提）
- **Polish (Phase 10)**: 全実装完了後

### User Story Dependencies

- **US1（バグ1&2）**: Phase 2 完了後に独立して実装可能
- **US2（バグ3）**: Phase 2 完了後に独立して実装可能
- **US3（バグ4）**: Phase 2 完了後に独立して実装可能
- **US4（GCal同期）**: T001〜T003（型定義・Security Rules）完了後
- **US5（メンバー予定表示）**: US4 完了後（Firestoreにデータが必要）
- **US6（重複排除）**: US5 完了後
- **US7（AI拡張）**: US4 および US5 完了後（T031 の `buildContext()` 拡張は T025 の `subscribeMemberCalendarEvents` 完了が前提。T032/T033 は T031 と並行可）

### Within Each User Story

- バグ修正（US1〜3）はシンプルな変更のため内部依存は少ない
- US4: T020（リポジトリ）→ T021〜T022（auth store に統合）→ T023〜T024
- US5: T025（リポジトリ）→ T026（UI）→ T027（データ結合）→ T028（スタイル）

### Parallel Opportunities

- T004, T005, T006（Phase 2）は並行実行可能
- US1（T007〜T011）と US2（T012〜T016）と US3（T017〜T019）は並行実行可能
- US4 の T020 と US7 の T031 は並行実行可能

---

## Parallel Example: バグ修正フェーズ

```bash
# バグ修正は3ストーリーを並行で実装可能（相互に依存しないファイル）:
Task: "US1: RoleChangeDialog の強制降格ロジック削除 (T007〜T011)"
Task: "US2: TeamJoinForm に確認ダイアログ追加 (T012〜T016)"
Task: "US3: TeamSwitcher に router.refresh() 追加 (T017〜T019)"
```

---

## Implementation Strategy

### MVP First (バグ修正のみ)

1. Phase 1: Setup（T001〜T003）
2. Phase 2: Foundational（T004〜T006）
3. Phase 3: US1 バグ修正（T007〜T011）
4. Phase 4: US2 バグ修正（T012〜T016）
5. Phase 5: US3 バグ修正（T017〜T019）
6. **STOP and VALIDATE**: 全バグが修正されていることを確認
7. Phase 10: Polish（T035〜T037）

### Incremental Delivery（全機能）

1. Setup + Foundational → 基盤完成
2. US1〜US3（バグ修正）→ テスト → 動作確認（MVP）
3. US4（GCal同期）→ Firestoreへの書き込み確認
4. US5（表示）→ メンバー予定がカレンダーに表示
5. US6（重複排除）→ UX 改善
6. US7（AI）→ AIコンテキスト拡張
7. Polish → 型チェック・リント

---

## Notes

- [P] tasks = 異なるファイル、依存なし
- [Story] ラベルがタスクを特定のユーザーストーリーに紐づける
- 各バグ修正ストーリーは独立して完了・テスト可能
- `pnpm typecheck` と `pnpm lint` でエラーがないことを各フェーズ後に確認推奨
- `docs/progress.md` は Generator が最終フェーズで記録する
