# Tasks: AIチャット全画面化

**Input**: `specs/009-ai-chat/plan.md`, `data-model.md`, `research.md`, `quickstart.md`

**Overview**: フローティングパネル形式のAIチャットをChatGPTライクな専用フルページ画面に置き換える。
Zustand によるセッション保持、中央→下部入力欄の切り替え、登録提案カード、ナビゲーション整理を実施する。

---

## Phase 1: Setup（基盤 Store）

**Purpose**: チャット状態の Zustand Store を作成し、ページ間をまたいだ履歴保持の基盤を整える

- [x] T001 `src/stores/aiChat.ts` を新規作成 — ChatMessage[]・isLoading・pendingProposal・proposalStatus・proposalMessageId と各アクション（addMessage / updateLastAssistantMessage / setIsLoading / setPendingProposal / setProposalStatus / setProposalMessageId / clearMessages）を定義する
- [x] T002 `src/app/(protected)/chat/page.tsx` を新規作成 — `AIChatPage` コンポーネントをインポートしてレンダリングするだけのシェルページ

**Checkpoint**: `pnpm typecheck` がエラーなしで通ること ✅

---

## Phase 2: Foundational（ページ骨格）

**Purpose**: `/chat` ページの全画面レイアウト骨格を作成する。この段階でルーター遷移と TopBar が動作する

⚠️ **CRITICAL**: このフェーズが完了するまで US1〜US3 の実装は開始しない

- [x] T003 `src/components/ai/AIChatPage.tsx` を新規作成 — `useAIChatStore` から状態を取得し、全画面レイアウト（TopBar "AIに相談" + messages エリア flex-1 + 入力欄エリア）の骨格のみ実装。メッセージ送信・ストリーミングはまだ不要
- [x] T004 `src/components/ai/AIChatPage.tsx` の入力欄レイアウトを実装 — `messages.length === 0` のとき画面中央配置（`flex-1 flex items-center justify-center flex-col` の中に入力欄と例示チップ）、会話後は下部固定に切り替わるレイアウト。`<textarea>` 自動伸縮・Enter 送信・Shift+Enter 改行の動作も含む

**Checkpoint**: `http://localhost:3000/chat` に遷移すると空の状態の入力欄が中央に表示される ✅

---

## Phase 3: US1 — ストリーミングチャット基盤 (P1) 🎯 MVP

**Goal**: `/chat` ページでマルチターンのAI会話が動作する

**Independent Test**:
1. `/chat` にアクセスし「今週のスケジュールを教えて」と送信 → AIが回答を返す
2. 続けて「もっと詳しく」と送信 → 前の文脈を踏まえた回答が返る（マルチターン）
3. ページを `/schedule` に移動して `/chat` に戻る → 会話履歴が残っている

### Implementation for US1

- [x] T005 [US1] `src/components/ai/AIChatPage.tsx` に `sendMessage` 関数を実装 — `messagesRef`（stale closure 対策 ref）を使い全会話履歴を `/api/ai/chat` に POST する。レスポンスの ReadableStream を読みながら `updateLastAssistantMessage` でチャンクを追記する
- [x] T006 [US1] `src/components/ai/AIChatPage.tsx` にメッセージバブルのレンダリングを実装 — ユーザー（右寄せ・パープル）/ AI（左寄せ・ボーダー付き）・タイピングインジケーター（dots bounce）を表示する
- [x] T007 [US1] `src/components/ai/AIChatPage.tsx` に `useEffect` でのストリーミング完了後の提案解析を実装 — `isLoading` が false になった後、最後のアシスタントメッセージから `parseProposalFromContent` で `%%PROPOSAL%%` ブロックを抽出し `setPendingProposal / setProposalMessageId / setProposalStatus('pending')` を更新する

**Checkpoint**: マルチターン会話が動作し、ページ遷移後も履歴が保持されている ✅

---

## Phase 4: US2 — 登録提案フロー (P1)

**Goal**: AI が提案カードを表示し、ユーザーが確認すると Firestore に登録される

**Independent Test**:
1. 「6月5日20時から2時間コラボ配信を入れて」と送信 → 提案カードが表示される
2. 「登録する」ボタンをクリック → カードが「登録しました！」に変わり確認リンクが出る
3. 「OK」とテキスト入力 → 同様に登録が実行される

### Implementation for US2

- [x] T008 [P] [US2] `src/components/ai/AIChatPage.tsx` 内に `ProposalCard` コンポーネントを実装 — スケジュール・タスク・コラボ各フォーマットの詳細表示、「登録する」/ 「修正する」ボタン、`status === 'done'` のとき「登録しました！」＋確認ページへの `<Link>` を表示する
- [x] T009 [US2] `src/components/ai/AIChatPage.tsx` に `handleRegister` 関数を実装 — `pendingProposal.type` に応じて `createSchedule` / `createTask` / `createCollabSession` を呼び出し、成功時は `setProposalStatus('done')` + 成功アシスタントメッセージを追加する。インポート: `src/lib/repositories/schedules|tasks|collabs`
- [x] T010 [US2] `src/components/ai/AIChatPage.tsx` の `handleSubmit` に確認パターン検出を実装 — `CONFIRM_PATTERN`（OK / はい / うん 等）にマッチ かつ `pendingProposal` 存在 かつ `proposalStatus === 'pending'` のとき、ユーザーメッセージを追加してから `handleRegister()` を呼び出す
- [x] T011 [US2] `src/components/ai/AIChatPage.tsx` の `renderMessageContent` でメッセージ内の `%%PROPOSAL%%` を除去してテキストを表示し、`proposalMessageId` と一致するメッセージには `ProposalCard` をインライン描画する

**Checkpoint**: 登録提案→確認→Firestore登録 の全フローが動作する ✅

---

## Phase 5: US3 — ナビゲーション整理 (P2)

**Goal**: 既存ナビを整理し、AIチャットへの導線を統一する

**Independent Test**:
1. モバイルの BottomNav 中央ボタンをタップ → `/chat` に遷移する
2. サイドバーの「AIに相談」をクリック → `/chat` に遷移する
3. TopBar に「AIで登録」ボタンが存在しない
4. 画面右下のフローティングボタンをクリック → `/chat` に遷移する

### Implementation for US3

- [x] T012 [P] [US3] `src/components/layout/BottomNav.tsx` を修正 — 中央の「追加」ボタン（アンバー色）を `/chat` へのリンクボタン（パープル色・`auto_awesome` アイコン・ラベル「AI」）に置き換える
- [x] T013 [P] [US3] `src/components/layout/Sidebar.tsx` を修正 — `NAV_SECTIONS` のメインセクションに `{ href: '/chat', label: 'AIに相談', icon: 'auto_awesome' }` を追加する
- [x] T014 [P] [US3] `src/components/layout/TopBar.tsx` を修正 — 「AIで登録」ボタンの JSX と `useAIStore` の `openExtract` インポートを削除する
- [x] T015 [P] [US3] `src/components/ai/AIChatWidget.tsx` を修正 — フローティングパネル（`{chatOpen && <div>...`）部分を削除し、フローティングボタンを `<Link href="/chat">` ベースに書き換える。`usePathname` で `/chat` のときはボタンを非表示にする
- [x] T016 [US3] `src/components/layout/AppShell.tsx` を修正 — `AIExtractModal` のインポートと `<AIExtractModal />` の描画を削除する
- [x] T017 [US3] `src/components/ai/AIExtractModal.tsx` を削除する（`git rm`）
- [x] T018 [US3] `src/stores/ai.ts` を修正 — `extractOpen / openExtract / closeExtract` を削除する。`chatOpen / toggleChat / closeChat` も不要になるため store 全体を削除するか、ファイルが空になる場合は `src/stores/ai.ts` ごと削除して参照元のインポートを整理する

**Checkpoint**: ナビゲーションが整理され、AIExtractModal が消えた状態で TypeScript エラーがない ✅

---

## Phase 6: Polish & 品質確認

**Purpose**: 型・Lint・動作の最終確認

- [x] T019 [P] `pnpm typecheck` を実行してエラーゼロを確認する ✅
- [x] T020 [P] `pnpm lint` を実行して警告・エラーゼロを確認する（新規・変更ファイルのみ）✅
- [ ] T021 quickstart.md のテスト手順（6ステップ）をすべて手動確認する
- [ ] T022 モバイル幅（375px）で `/chat` を確認 — 入力欄・メッセージバブル・提案カードが崩れないこと

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし — 即開始可能
- **Foundational (Phase 2)**: Phase 1 完了が必須 — T001 (store) が存在しないと AIChatPage がビルドできない
- **US1 (Phase 3)**: Phase 2 完了が必須
- **US2 (Phase 4)**: US1 完了が必須（store と sendMessage に依存）
- **US3 (Phase 5)**: Phase 2 完了後、US1・US2 と並行可能
- **Polish (Phase 6)**: US1・US2・US3 全完了後

### User Story Dependencies

- **US1**: Phase 2 完了後すぐ開始
- **US2**: US1 (T005〜T007) 完了後
- **US3**: Phase 2 完了後、US1/US2 と **並行実施可能**

### Parallel Opportunities（US3 内）

T012・T013・T014・T015 は互いに別ファイルのため並行実施可能:

```bash
# US3 並行例:
Task: "T012 BottomNav 修正"
Task: "T013 Sidebar 修正"
Task: "T014 TopBar 修正"
Task: "T015 AIChatWidget 修正"
```

---

## Implementation Strategy

### MVP スコープ（US1 のみ）

1. Phase 1 完了
2. Phase 2 完了
3. **US1 (Phase 3) 完了 → チャットが動作する状態で検証**
4. US2 追加 → 登録フロー検証
5. US3 追加 → ナビゲーション整理

### タスク完了の判断基準

- 各フェーズ末の Checkpoint を必ず確認する
- `pnpm typecheck` は最低 Phase 1, Phase 2, Phase 6 で実行する
- ストリーミングが動作しない場合は `/api/ai/chat` の `ANTHROPIC_API_KEY` 設定を確認する

---

## Notes

- `[P]` タスクは別ファイルを触るため並行実施可能
- `[Story]` ラベルはトレーサビリティのためタスクをユーザーストーリーに紐付ける
- `AIExtractModal` 削除前に `AppShell` の参照を先に外すこと（ビルドエラー防止）
- `ai.ts` store の削除は `AIChatWidget`・`TopBar` の修正が完了した後に行う（T015・T014 より後）
