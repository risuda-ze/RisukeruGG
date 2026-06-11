# Tasks: コラボ調整機能 UI リデザイン

**Input**: Design documents from `specs/015-collab-ui-redesign/`
**Prerequisites**: plan.md ✅, spec.md ✅, data-model.md ✅, contracts/ui-contracts.md ✅, research.md ✅, quickstart.md ✅

**Feature**: 015-collab-ui-redesign  
**Sprint mapping**: Sprint 1 → Phase 2-3、Sprint 2 → Phase 4-6、Sprint 3 → Phase 7-8

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: 並列実行可（別ファイル、依存なし）
- **[Story]**: 対応ユーザーストーリー（US1〜US5）
- 各タスクには実装対象ファイルの絶対パスを記載

---

## Phase 1: Setup（共有インフラ）

**目的**: コラボ UI 専用 CSS の配置と既存コードの確認

- [X] T001 デザインファイル `specs/015-collab-ui-redesign/design/gg-readme/project/collab.css` を `src/app/(protected)/collabs/collab.css` にコピーし、globals.css のトークン変数名に合わせて調整する

---

## Phase 2: Foundational（全 US をブロックする前提条件）

**目的**: データモデルとリポジトリ関数を更新し、全 US の型安全基盤を整える

**⚠️ CRITICAL**: Phase 2 完了前に US 実装開始禁止

- [X] T002a [P] `src/lib/validations/collab.ts` の `collabSessionSchema` を更新する（`title` のみの必須フィールドに整理し、`status: z.enum(['draft','open','confirmed'])` を追加。`partnerName` は任意化。`participants: z.array(z.object({...})).min(1)` / `proposedDates: z.array(z.date()).min(1)` を追加）。`collabResponseSchema` の `dates` 値型を `z.enum(['ok','ng','maybe'])` に拡張する。
- [X] T002 [P] `src/types/entities.ts` の `CollabStatus` 型に `'draft'` を追加し、`COLLAB_STATUS_LABELS` を `{ draft:'準備中', open:'募集中', confirmed:'確定', expired:'終了', cancelled:'終了' }` に更新し、`CollabSession` に `updatedBy?: string` / `updatedAt?: Date` フィールドを追加し、`participantResponses` の値型に `'maybe'` を追加する
- [X] T003 [P] `src/lib/repositories/collabs.ts` の `createCollabSession()` でデフォルト status を `'draft'` 対応させ、`updateCollabSession()` で `updatedBy: currentUser.uid` / `updatedAt: new Date()` を自動セットし、`toCollabSession()` で `updatedBy`・`updatedAt`・`'maybe'` を読み取るよう更新する

**Checkpoint**: `pnpm typecheck` がパスすることを確認してから US 実装へ

---

## Phase 3: US1 — コラボ一覧の閲覧 (Priority: P1) 🎯 MVP

**Goal**: `/collabs` を開いたとき「調整中」「予定確定」の 2 ゾーンに横長カードが振り分け表示される

**Independent Test**: ブラウザで `http://localhost:3000/collabs` を開き、2 ゾーン + 横長カード（タイトル・バッジ・アバター・回答状況・ボタン）が表示されることを目視確認

- [X] T004 [P] [US1] `src/app/(protected)/collabs/page.tsx` に `CollabBadge` コンポーネントを実装する（`.cbbadge .cbbadge--{STATUS_CLASS[status]}` / STATUS_CLASS: `{ draft:'prep', open:'recruit', confirmed:'fixed', expired:'prep', cancelled:'prep' }`）
- [X] T005 [P] [US1] `src/app/(protected)/collabs/page.tsx` に `PartyAvatars` コンポーネントを実装する（`.cbava > .cbava__stack`、最大 4 件重ね + `.cbava__more` で +N バッジ）
- [X] T006 [US1] `src/app/(protected)/collabs/page.tsx` に `CollabRow` コンポーネントを実装する（`.cbrow`・`.cbrow--fixed`、タイトル+バッジ・`PartyAvatars`・残り回答者数+プログレスバー or 確定日時・詳細/削除ボタン）（T004・T005 完了後）
- [X] T007 [US1] `src/app/(protected)/collabs/page.tsx` に `CollabZone` コンポーネントを実装する（`.cbzone`、ヘッダー+件数+空状態メッセージ、`draft`+`open` → 調整中、`confirmed` → 予定確定）（T006 完了後）
- [X] T008 [US1] `src/app/(protected)/collabs/page.tsx` に `CollabBoard` コンポーネントを実装する（`.cbboard > .cbscroll`、コントロールバー（追加ボタン＋?アイコン＋ヒントパネル）・2 ゾーン。バナー `.cbbanner` は不使用）（T007 完了後）
- [X] T009 [US1] `src/app/(protected)/collabs/page.tsx` のルートコンポーネントを完成させる（`useMediaQuery(768)` で `sch--mobile` クラスを付与、モバイル時: ゾーン切替ピルタブ `.mtpills` + コンパクトカード `.mcbcard`、`import './collab.css'` を追加）（T008 完了後）

**Checkpoint**: US1 が独立して動作・目視確認できること。`expired`/`cancelled` は非表示になっていること

---

## Phase 4: US2 — 新規コラボ作成 (Priority: P1)

**Goal**: 「コラボ調整開始」ボタンで詳細ポップアップが開き、必須項目入力→保存で一覧に追加される

**Independent Test**: ボタンクリック → ポップアップ → タイトル+参加者+候補日 入力 → 保存 → 一覧反映を確認

- [X] T010 [US2] `src/components/collab/CollabDetailModal.tsx` のスケルトンを作成する（`.smodal > .smodal__card.smodal__card--collab`（width:1020px）・`.smodal__hd`・`.cbform > .cbform__split > .cbcol--main + .cbcol--chat`・`.cbfooter` の DOM 構造。props: `session: CollabSession | null`, `members: TeamMember[]`, `onClose`, `onSaved`, `onDeleted`）
- [X] T011 [P] [US2] `src/components/collab/CollabDetailModal.tsx` の左ペイン基本フィールドを実装する（タイトル入力 `.sform__title-input`（必須）・ステータスプルダウン（`draft/open/confirmed`・初期値 `draft`）・内容テキストエリア）（T010 完了後）
- [X] T012 [P] [US2] `src/components/collab/CollabDetailModal.tsx` に `CandidateEditor` コンポーネントを実装する（候補日カード `.cbcand__item`（番号・日時・削除ボタン）・インライン追加フォーム `.cbcand__addinline`（date/time input + 追加/キャンセル）・「候補日時を追加」ボタン `.cbcand__addrow`）（T010 完了後）
- [X] T013 [P] [US2] `src/components/collab/CollabDetailModal.tsx` に `ParticipantEditor` コンポーネントを実装する（`.cbpart > .cbpart__addrow`（チームメンバー Dropdown + ゲスト名 input + 追加ボタン）・`.cbpart__list > .cbchip`（アバター+名前+[ゲスト]+削除×））（T010 完了後）
- [X] T014 [US2] `src/components/collab/CollabDetailModal.tsx` に `CollabChat` コンポーネントを実装する（`.tchat > .tchat__list`（空時 `.tchat__empty`）・`.tchat__msg`（Avatar+名前+バブル+日時）・`.tchat__inputrow`（input + 送信ボタン））（T010 完了後）
- [X] T015 [US2] `src/components/collab/CollabDetailModal.tsx` のフッターボタンとバリデーションを実装する（`.cbfooter__note` + キャンセル/削除(isNew=false)/保存ボタン、保存時バリデーション: タイトル必須・参加者 1 人以上・候補日 1 件以上）（T011〜T014 完了後）
- [X] T016 [US2] `src/app/(protected)/collabs/page.tsx` の「コラボ調整開始」ボタンを `CollabDetailModal` の新規モード（`session=null`）を開くよう接続し、保存成功時に一覧を再取得する（T015 完了後）

**Checkpoint**: 新規作成フローが完全動作すること。バリデーションエラーが表示されること

---

## Phase 5: US3 — コラボ編集・ステータス更新 (Priority: P2)

**Goal**: 「詳細」ボタンで編集ポップアップが開き、ステータス変更保存でゾーンが更新される

**Independent Test**: 既存コラボ「詳細」→ステータス「確定」に変更→保存→「予定確定ゾーン」に移動を確認

- [X] T017 [US3] `src/app/(protected)/collabs/page.tsx` の `CollabRow` の「詳細」ボタンを `CollabDetailModal` の編集モード（`session=collab`）を開くよう接続する
- [X] T018 [US3] `src/components/collab/CollabDetailModal.tsx` の削除ボタン（`!isNew` のとき表示）を実装する（確認ダイアログ表示→ `collabs.ts` の削除処理呼び出し→ `onDeleted` コールバック）
- [X] T019 [US3] `src/app/(protected)/collabs/page.tsx` の保存後に Firestore から一覧を再取得してゾーンを再振り分けする（`confirmed` が「予定確定ゾーン」に移動することを確認）
- [X] T020 [US3] `src/components/collab/CollabForm.tsx` を削除し、このファイルを参照している全箇所を `CollabDetailModal` に置換する

**Checkpoint**: 編集・削除・ゾーン移動が完全動作すること

---

## Phase 6: US4 — 候補日の参加可否確認とホバー表示 (Priority: P2)

**Goal**: 候補日カードに `〇N △M ×K` が表示され、数字ホバーで参加者名が表示される

**Independent Test**: 参加者が回答済みのコラボ詳細を開き、候補日カードの `〇N` をホバーして参加者名確認

- [X] T021 [US4] `src/components/collab/CollabDetailModal.tsx` の `CandidateEditor` で `participantResponses` から各候補日の `ok`/`maybe`/`ng`（`pending` は△に含める）の人数を集計して `.cbcand__tally` に `〇N △M ×K` を表示する
- [X] T022 [US4] `src/components/collab/CollabDetailModal.tsx` の `CandidateEditor` にホバーツールチップを実装する（`onMouseEnter`/`onMouseLeave` で React state 切り替え・`position:absolute` のアバター+名前リストを表示・外部ライブラリ不使用）
- [X] T023 [US4] `src/components/collab/CollabDetailModal.tsx` の `CandidateEditor` に「日程確定」トグルボタン（`.cbcand__confirm`）を実装する（クリックで `is-fixed` をトグル・保存時に選択候補日が `is-fixed=true` なら `status:'confirmed'` に移行して Firestore 保存）

**Checkpoint**: ○△× が正しく集計・表示され、ホバーツールチップが動作すること

---

## Phase 7: US5 — コメント/メモの利用 (Priority: P3)

**Goal**: 詳細右ペインでコメント投稿・閲覧ができ、回答フォームのコメントも表示される

**Independent Test**: コメント投稿→右ペインに表示、回答フォームコメント→詳細ポップアップ右ペインに表示を確認

- [X] T024 [US5] `src/components/collab/CollabDetailModal.tsx` の `CollabChat` コンポーネントを `CollabSession.comments[]` の実データで動作させる（コメント一覧表示・自分のコメントは `.tchat__msg--me` クラス付与）
- [X] T025 [US5] `src/components/collab/CollabDetailModal.tsx` の `CollabChat` 投稿処理を実装する（送信時に `CollabComment` 型オブジェクトを生成して `collabs.ts` 経由で Firestore の `comments[]` に追記する）
- [X] T026 [US5] `src/components/collab/CollabResponseForm.tsx` の回答送信時に入力コメントを `CollabComment` 型に変換して Firestore の `comments[]` に追記する処理を実装する（`authorId`: 回答者 UID・`authorName`: 回答者名・アイコンは既定単色アバター）
- [X] T027 [US5] `src/components/collab/CollabDetailModal.tsx` の `CollabChat` で回答フォーム由来コメントが単色アバター（`avatarStyle(name)` 相当）と回答者名で表示されることを確認し、表示崩れがあれば修正する

**Checkpoint**: コメント投稿・表示・回答統合が完全動作すること

---

## Phase 7.5: ユニットテスト — コラボ日程調整ロジック（Constitution III 必須）

**目的**: constitution Principle III が MUST とするコラボ日程調整ロジックの Vitest ユニットテストを整備する

**⚠️ CRITICAL**: constitution 必須。実装（T021〜T027）完了後に実施すること

- [X] T036 [P] `tests/unit/collab/statusTransition.test.ts` を新規作成し、コラボステータス遷移ロジックをテストする（`draft→open→confirmed` の正常遷移・`expired`/`cancelled` への手動変更禁止・`is-fixed` トグル+保存時の `confirmed` 移行ロジック）
- [X] T037 [P] `tests/unit/collab/candidateTally.test.ts` を新規作成し、候補日 ○△× 集計ロジックをテストする（`participantResponses` の `ok`/`maybe`/`ng`/`pending` 集計・`pending` が △ に含まれること・全員 `ok` の場合・参加者 0 件のエッジケース）

**Checkpoint**: `pnpm vitest run tests/unit/collabs/` が全件パスすること

---

## Phase 8: E2E テスト（Sprint 3）

**目的**: 全受け入れ基準をカバーする自動テストを整備する

- [X] T028 [P] `tests/e2e/collabs/collab-ui-redesign.spec.ts` を新規作成し、テストファイルの骨格（Playwright imports・beforeEach でログイン・`http://localhost:3000/collabs` ナビゲーション）を実装する
- [X] T029 [US1] `tests/e2e/collabs/collab-ui-redesign.spec.ts` に SC-001〜SC-004 のテストケースを追加する（2ゾーン表示・横長カード全要素確認・モバイル 390px ビューポートでのコンパクトカード+ピルタブ確認）
- [X] T030 [US2] `tests/e2e/collabs/collab-ui-redesign.spec.ts` に SC-006〜SC-007 のテストケースを追加する（新規作成フロー: バリデーションエラー確認・必須項目入力後の保存・一覧反映）
- [X] T031 [US3] `tests/e2e/collabs/collab-ui-redesign.spec.ts` に SC-008 のテストケースを追加する（ステータス変更→ゾーン移動確認）
- [X] T032 [US5] `tests/e2e/collabs/collab-ui-redesign.spec.ts` に SC-012〜SC-013 のテストケースを追加する（回答フォームコメント→詳細ポップアップ右ペイン表示確認）

**Checkpoint**: `pnpm test:e2e -- tests/e2e/collabs/collab-ui-redesign.spec.ts` 全件パス

---

## Phase 9: Polish & Cross-Cutting Concerns

**目的**: 品質基準の最終確認

- [X] T033 [P] `pnpm typecheck` を実行して TypeScript エラー 0 件を確認し、エラーがあれば修正する
- [X] T034 [P] `pnpm lint` を実行して ESLint エラー 0 件を確認し、エラーがあれば修正する
- [ ] T035 `specs/015-collab-ui-redesign/quickstart.md` の手順に従い `pnpm dev` でアプリを起動し、PC（1440px）とモバイル（390px）でコラボ画面の全機能を目視確認する

---

## 依存関係と実行順序

### Phase 依存

- **Setup (Phase 1)**: 依存なし — 即座に開始可
- **Foundational (Phase 2)**: Phase 1 完了後 — **全 US をブロック**
- **US1 (Phase 3)**: Phase 2 完了後 — 他 US に依存なし
- **US2 (Phase 4)**: Phase 2 完了後 — US1 と並列実行可
- **US3 (Phase 5)**: US2 完了後 — CollabDetailModal が必要
- **US4 (Phase 6)**: US2 完了後（US3 と並列実行可） — CandidateEditor 骨格が必要
- **US5 (Phase 7)**: US2 完了後 — CollabChat 骨格が必要
- **E2E (Phase 8)**: US1〜US5 完了後
- **Polish (Phase 9)**: E2E 完了後

### US 内の依存

```
T002a, T002, T003 → [全 US 開始可]
Phase 3: T004, T005 → T006 → T007 → T008 → T009
Phase 4: T010 → {T011, T012, T013, T014 [並列]} → T015 → T016
Phase 5: T016 → T017 → T018, T019 [並列] → T020
Phase 6: T012 → T021 → T022, T023 [並列]
Phase 7: T014 → T024 → T025 → T026 → T027
```

### 並列実行の機会

- **Phase 2**: T002 と T003 は別ファイル — 並列可
- **Phase 3**: T004 と T005 は別コンポーネント — 並列可
- **Phase 4 (T010 完了後)**: T011・T012・T013・T014 は独立したサブコンポーネント — 並列可
- **Phase 5**: T018 と T019 は別の関心事 — 並列可
- **Phase 6**: T022 と T023 は別機能 — 並列可
- **Phase 9**: T033 と T034 はコマンド独立 — 並列可

---

## 並列実行例: Phase 4（詳細ポップアップ）

```bash
# T010 スケルトン完了後、以下を並列実行:
Task: "T011 タイトル・ステータス・内容フィールド in CollabDetailModal.tsx"
Task: "T012 CandidateEditor コンポーネント in CollabDetailModal.tsx"
Task: "T013 ParticipantEditor コンポーネント in CollabDetailModal.tsx"
Task: "T014 CollabChat コンポーネント in CollabDetailModal.tsx"
```

---

## 実装戦略

### MVP First（US1 + US2 のみ）

1. Phase 1: CSS セットアップ (T001)
2. Phase 2: データモデル更新 (T002, T003)
3. Phase 3: US1 一覧画面 (T004〜T009) → **Stop & Validate**
4. Phase 4: US2 新規作成 (T010〜T016) → **Stop & Validate**
5. デモ・確認後に US3〜US5 へ

### インクリメンタルデリバリー

1. Setup + Foundational → 基盤完成
2. US1 追加 → 一覧を確認 (MVP!)
3. US2 追加 → 作成を確認
4. US3 追加 → 編集・削除を確認
5. US4 追加 → ホバー確認
6. US5 追加 → コメント確認
7. E2E + Polish → リリース準備完了

---

## Sprint マッピング（plan.md との対応）

| Sprint | phases | Tasks |
|--------|--------|-------|
| Sprint 1 | Phase 1〜3 | T001, T002a, T002, T003〜T009 |
| Sprint 2 | Phase 4〜6 | T010〜T023 |
| Sprint 3 | Phase 7〜9 | T024〜T037 |

---

## Notes

- **[P]** タスクは別ファイル・依存なし → 並列実行推奨
- **[Story]** ラベルはスペックの User Story に対応（US1〜US5）
- 各 Phase 末の Checkpoint で独立テスト実施
- `CollabForm.tsx` の削除（T020）は US3 Phase で実施（US2 で `CollabDetailModal.tsx` が完成してから）
- E2E テストは Sprint 3 (Phase 8) に集約。SC 番号は `spec.md` の受け入れ基準に対応
- CSS は `collab.css` を別ファイルとして管理し、`page.tsx` で `import './collab.css'` で読み込む
