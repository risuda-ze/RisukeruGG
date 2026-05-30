# Tasks: Discord連携

**Input**: `specs/012-discord-integration/`
**Prerequisites**: spec.md ✅ research.md ✅ data-model.md ✅ *(plan.md は未作成)*
**最終更新**: 2026-05-30 — C1/C2/H1/H2/H3/H4/M4 対応済み

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（異なるファイル、依存なし）
- **[Story]**: 所属ユーザーストーリー（US1=Webhook通知, US2=OAuth2連携, US3=AIボット）
- 各タスクに正確なファイルパスを記載

---

## Phase 1: Setup（共有インフラ）

**目的**: Discord連携全体で必要なセットアップ

- [X] T001 必要なパッケージを追加（`pnpm add discord-interactions @vercel/functions`）。`discord-interactions`: Interactions Endpoint の署名検証・型。`@vercel/functions`: Deferred Response のバックグラウンド処理（`waitUntil`）（✅ H3）
- [X] T002 [P] Sprint 3 で必要な環境変数を `.env.local.example` に追記（`DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `NEXT_PUBLIC_DISCORD_CLIENT_ID`, `DISCORD_APPLICATION_ID`, `DISCORD_PUBLIC_KEY`, `DISCORD_BOT_TOKEN`）
- [X] T003 [P] `scripts/register-discord-commands.mjs` を新規作成 — `/risukerugg` コマンドをDiscord APIに登録するスクリプト（`DISCORD_APPLICATION_ID`, `DISCORD_BOT_TOKEN` 必要）

---

## Phase 2: Foundational（全Sprintのブロッカー）

**目的**: 型定義・セキュリティルール・共有ユーティリティ — US1〜US3 全てに必要

⚠️ **CRITICAL**: このフェーズ完了前はいずれのUSも着手不可

- [X] T004 `src/types/entities.ts` に `DiscordTeamConfig` インターフェースを新規追加（✅ C1: サブコレクション方式のため `Team` インターフェース自体は変更しない）

  ```typescript
  // teams/{teamId}/discord/config サブコレクションの型
  export interface DiscordTeamConfig {
    webhookUrl: string;
    notifyOnCreate: boolean;    // スケジュール作成時に通知
    notifyBefore1h: boolean;    // 1時間前リマインダー
    notifyBefore15min: boolean; // 15分前リマインダー
  }
  ```

- [X] T005 [P] `src/types/entities.ts` の `User` インターフェースに `discord` フィールドを追加

  ```typescript
  discord?: {
    userId: string;
    username: string;
    connectedAt: Date;
  } | null;
  ```

- [X] T006 `firestore.rules` に Discord関連ルールを追記（✅ C1/H5/H2対応）

  ```
  // teams/{teamId}/discord/config — operatorのみ読み書き（Webhook URLをメンバーから隠す）
  match /teams/{teamId}/discord/{doc} {
    allow read, write: if isTeamOwner(teamId);
  }
  // discord_sessions — Admin SDK（Cloud Functions/API Route）のみ。クライアント不可
  match /discord_sessions/{sessionId} {
    allow read, write: if false;
  }
  // discord_link_requests — OAuth2 CSRF用ノンス。Admin SDK のみ。クライアント不可
  match /discord_link_requests/{nonce} {
    allow read, write: if false;
  }
  ```

- [X] T007 [P] `functions/src/discord/sendWebhook.ts` を新規作成 — Webhook送信ユーティリティ

  ```typescript
  export async function sendDiscordWebhook(webhookUrl: string, embed: DiscordEmbed): Promise<void>
  // try/catch でラップ、失敗はlogger.warn()のみ（呼び出し元を失敗させない）
  ```

- [X] T008 [P] `src/lib/firebase/admin.ts` を新規作成 — Next.js API Route 用 Firebase Admin SDK 初期化（✅ C2: US2・US3 両方が依存するため Foundational に配置）

  ```typescript
  import { initializeApp, cert, getApps } from 'firebase-admin/app';
  import { getFirestore } from 'firebase-admin/firestore';
  // FIREBASE_SERVICE_ACCOUNT_KEY 環境変数（JSON文字列）で認証
  // getApps().length チェックで重複初期化を防ぐ
  ```

**チェックポイント**: T004〜T008 完了後、各USの実装を開始できる

---

## Phase 3: US1 — Discord Webhook通知（Sprint 1）🎯 MVP

**目標**: チームのDiscordチャンネルに、スケジュール作成・リマインダー通知を自動送信する

**独立テスト方法**:
1. チーム設定でWebhook URLを登録する
2. スケジュールを新規作成 → Discordチャンネルにメッセージが届く
3. Cloud Functionsログで `scheduleReminders` の送信ログを確認

### US1 実装

- [X] T009 [US1] `functions/src/teams/updateDiscordSettings.ts` を新規作成 — Discord設定を `teams/{teamId}/discord/config` サブコレクションに保存するCallable Function（operatorのみ実行可）（✅ C1: サブコレクション方式）

- [X] T010 [P] [US1] `functions/src/index.ts` に `updateDiscordSettings` を export 追加

- [X] T011 [P] [US1] `src/lib/repositories/teams.ts` に `updateDiscordSettings(teamId, settings)` 関数を追加 — `httpsCallable` で T009 の Cloud Function を呼び出す

- [X] T012 [US1] `src/components/team/DiscordSettingsSection.tsx` を新規作成 — チーム設定画面のDiscordセクションUIコンポーネント
  - Webhook URL テキスト入力
  - 通知タイミング3つのトグル（作成時・1時間前・15分前）
  - 「保存する」ボタン（operatorのみ有効、memberは表示のみ）
  - 保存成功/失敗トースト

- [X] T013 [US1] `src/app/(protected)/team/page.tsx` にDiscordセクションを追加 — `<DiscordSettingsSection>` コンポーネントを既存のチーム設定UIに組み込む（operatorタブ内）

- [X] T014 [US1] `functions/src/schedules/createSchedule.ts` を更新 — スケジュール作成後に Admin SDK で `teams/{teamId}/discord/config` を読み取り、`notifyOnCreate === true` の場合 `sendDiscordWebhook()` を呼び出す（✅ C1）。Embed形式:
  ```
  title: "📅 スケジュールが追加されました"
  color: 0x5865F2
  fields: [タイトル, 日時（開始〜終了）, 参加者]
  ```

- [X] T015 [US1] `functions/src/notifications/scheduleReminders.ts` を更新 — 通知書き込み後、Admin SDK で `teams/{teamId}/discord/config` を読み取り、`notifyBefore1h` / `notifyBefore15min` に応じて `sendDiscordWebhook()` を呼び出す（✅ C1）。Embed形式:
  ```
  title: "⏰ 1時間後 / 15分後にスケジュールが始まります"
  fields: [タイトル, 開始時刻, 参加者]
  ```

**チェックポイント**: Sprint 1 が独立して動作する。Webhook URL未設定時は何も起きないことも確認。

---

## Phase 4: US2 — Discord OAuth2 アカウント連携（Sprint 2）

**目標**: ユーザー設定画面でDiscordアカウントをRisukeruGGに紐付ける。Sprint 3（AIボット）の前提。

**独立テスト方法**:
1. 設定画面 → 「Discordと連携」ボタンが表示される
2. クリックするとDiscord OAuth2画面に遷移する
3. 認証完了後に設定画面に戻り、Discordユーザー名が表示される
4. Firestoreの `users/{uid}.discord.userId` に値が入っている

### US2 実装

- [X] T016 [US2] `src/app/api/discord/link-start/route.ts` を新規作成（✅ H2/H4: CSRF保護・ユーザーID特定）
  - POSTリクエスト: Firebase Auth セッションクッキーからログイン済みユーザーの uid を取得
  - `crypto.randomUUID()` で nonce を生成
  - Firestore Admin SDK で `discord_link_requests/{nonce}` に `{ uid, expiresAt: +10分 }` を保存
  - Discord OAuth2 URL（state=nonce）を組み立てて返却: `{ authUrl: string }`

- [X] T017 [US2] `src/app/api/discord/callback/route.ts` を新規作成（✅ H2/H4対応）
  - GETリクエスト: クエリパラメータ `code`, `state`（nonce）を受け取る
  - `discord_link_requests/{state}` から uid を取得（なし・期限切れは 400 を返す）
  - Discord OAuth2トークン交換 → `/users/@me` でユーザー情報取得
  - Admin SDK で `users/{uid}.discord` を更新（`userId`, `username`, `connectedAt`）
  - `discord_link_requests/{state}` を削除（nonce は使い捨て）
  - 処理後 `/settings?discord=connected` にリダイレクト
  - **注意**: Firebase Admin SDKは `src/lib/firebase/admin.ts`（T008で作成済み）を使用

- [X] T018 [P] [US2] `src/components/settings/DiscordConnectSection.tsx` を新規作成 — ユーザー設定画面のDiscord連携UIコンポーネント
  - 未連携: 「Discordと連携」ボタン → `/api/discord/link-start`（POST）を呼び出し、返却された `authUrl` にリダイレクト
  - 連携済み: Discord ユーザー名表示 + 「連携を解除」ボタン
  - 解除処理: `users/{uid}.discord` を `null` に更新

- [X] T019 [US2] `src/app/(protected)/settings/page.tsx` にDiscordセクションを追加 — `<DiscordConnectSection>` を設定ページに組み込む

- [X] T020 [P] [US2] `src/stores/auth.ts` の User 型読み取りで `discord` フィールドを追加（`toUser` 変換関数に `discord` フィールドのマッピングを追加）

**チェックポイント**: Sprint 2 が独立して動作する。US3はこのUS2で保存された `discord.userId` に依存する。

---

## Phase 5: US3 — `/risukerugg` AI会話ボット（Sprint 3）

**目標**: Discordから自然言語でスケジュール・タスク・コラボを登録できる。WebアプリのAIチャットと同等の体験をDiscord上で提供する。

**独立テスト方法**:
1. Discord で `/risukerugg message:来週月曜に配信入れたい` を実行
2. BotがAIの返答（ephemeral）を返す
3. AIが %%PROPOSAL%% を返すと [✅ 登録する] ボタンが表示される
4. ✅ クリック後、Firestoreにドキュメントが作成される

### US3 実装

**AI共通ロジックのリファクタリング**

- [X] T021 [US3] `src/lib/ai/systemPrompt.ts` を新規作成 — `src/app/api/ai/chat/route.ts` からシステムプロンプト生成ロジックを抽出

  ```typescript
  export function generateSystemPrompt(context: AiChatContext, today: string, todayISO: string): string
  export function formatColumns(columns): string
  export function formatTasks(tasks): string
  export function formatSchedules(schedules): string
  export function formatCollabs(collabs): string
  export function formatMembers(members): string
  export function formatMemberCalendars(events): string
  ```

- [X] T022 [US3] `src/lib/ai/parseProposal.ts` を新規作成 — `%%PROPOSAL%%` ブロックをパースするユーティリティ

  ```typescript
  export function extractProposals(text: string): ProposalData[]
  export function hasProposal(text: string): boolean
  export function stripProposalBlocks(text: string): string  // テキスト部分のみ取得
  ```

- [X] T023 [US3] `src/app/api/ai/chat/route.ts` をリファクタリング — T021/T022 の共通ユーティリティを import して使用するよう変換（動作は変えない）

**Interactions Endpoint**

- [X] T024 [US3] `src/app/api/discord/interactions/route.ts` を新規作成 — Discord Interactions Endpoint（POST）

  ルーティング構造:
  - PING (type 1) → `{ type: 1 }` を返す
  - APPLICATION_COMMAND: `/risukerugg` → T025 の `handleRisukerugg()` を呼ぶ
  - MESSAGE_COMPONENT: ボタンの `custom_id` に応じて T027 の処理を呼ぶ

  **必須**: `discord-interactions` の `verifyKey()` で署名検証（`request.text()` でbody取得 — `request.json()` だと署名が壊れる）。不正リクエストは HTTP 401。  
  **必須**: Zod で Interaction ペイロードをバリデーション（Constitution II 対応）

- [X] T025 [US3] `src/app/api/discord/interactions/handlers/handleRisukerugg.ts` を新規作成 — `/risukerugg` コマンドの処理（✅ H3: `waitUntil` 使用）

  処理フロー:
  1. 即座に `{ type: 5, data: { flags: 64 } }` を返す（Deferred Ephemeral Response）
  2. `waitUntil(handleAiConversation(...))` でバックグラウンド処理（`@vercel/functions`）:
     a. `discord.userId` → RisukeruGGユーザー検索（未連携なら案内メッセージ）
     b. Firestore `discord_sessions/{discordUserId}` から会話履歴取得（T031 の sessionManager を使用）
     c. Admin SDK でチームデータ取得（schedules, tasks, collabs, members, columns）
     d. `generateSystemPrompt()` でシステムプロンプト生成
     e. `generateText()` (AI SDK, non-streaming) で Claude haiku 呼び出し
     f. `hasProposal()` で %%PROPOSAL%% チェック
     g. Firestore セッション更新（会話履歴に追加）
     h. Discord Follow-up API でメッセージ送信（T026）

- [X] T026 [P] [US3] `src/app/api/discord/interactions/discordFollowUp.ts` を新規作成 — Discord Follow-up メッセージ送信ユーティリティ

  ```typescript
  // テキストのみ（AIの質問など）
  sendFollowUp(appId, token, content: string, flags?: number): Promise<void>
  // %%PROPOSAL%% 検出時: Embed + ボタン（✅ H1: 修正ボタンも追加）
  sendProposalMessage(appId, token, proposals: ProposalData[], discordUserId: string): Promise<void>
  ```

  ボタン（3種）:
  - `[✅ 登録する]` — `custom_id: confirm:{discordUserId}`
  - `[✏️ 修正する]` — `custom_id: revise:{discordUserId}`
  - `[❌ キャンセル]` — `custom_id: cancel:{discordUserId}`

- [X] T027 [US3] `src/app/api/discord/interactions/handlers/handleButtonClick.ts` を新規作成 — ボタンクリック処理（✅ H1: revise ハンドラーを含む）

  - `confirm:{discordUserId}`: `pendingProposal` を取得 → 種別に応じて登録（T028〜T030）→ 完了メッセージ → セッション削除
  - `revise:{discordUserId}`: **`pendingProposal` のみ削除**（会話履歴は保持）→「どこを修正する？」ephemeralメッセージ（✅ H1）
  - `cancel:{discordUserId}`: セッション全削除 → 「キャンセルしたよ」ephemeralメッセージ

- [X] T028 [P] [US3] `src/app/api/discord/interactions/register/registerSchedule.ts` を新規作成 — Discord Bot経由のスケジュール登録（Admin SDK → Firestore直接書き込み）

- [X] T029 [P] [US3] `src/app/api/discord/interactions/register/registerTask.ts` を新規作成 — Discord Bot経由のタスク登録（Admin SDK → Firestore直接書き込み）

- [X] T030 [P] [US3] `src/app/api/discord/interactions/register/registerCollab.ts` を新規作成 — Discord Bot経由のコラボ登録（Admin SDK → Firestore直接書き込み）

**セッション管理**

- [X] T031 [US3] `src/app/api/discord/interactions/sessionManager.ts` を新規作成 — Firestoreセッション管理ユーティリティ

  ```typescript
  getSession(discordUserId: string): Promise<DiscordSession | null>
  upsertSession(discordUserId: string, update: Partial<DiscordSession>): Promise<void>
  deleteSession(discordUserId: string): Promise<void>
  isSessionExpired(session: DiscordSession): boolean  // updatedAt から30分経過で true
  ```

- [X] T032 [US3] セッションリセット処理を `handleRisukerugg.ts` に追加 — メッセージが `リセット` または `reset` の場合はセッション削除 → 「会話をリセットしたよ！」返信

**チェックポイント**: `/risukerugg message:テスト` が動作し、会話→提案→修正→登録の全フローが完成している

---

## Phase 6: Polish & Cross-Cutting

**目的**: 品質向上・エラーハンドリング・統合確認

- [X] T033 [P] 未連携ユーザーへのエラーメッセージを統一 — 連携ページへのURL（`https://[DOMAIN]/settings#discord`）を含める
- [X] T034 [P] Webhook URL不正（4xx/5xx）時のエラーログを `sendWebhook.ts` に追加 — URLフォーマット検証（`https://discord.com/api/webhooks/` プレフィックスチェック）
- [X] T035 `firestore.rules` のデプロイ確認 — `firebase deploy --only firestore:rules` の手順をコメントに追記

---

## 依存関係と実行順序

### フェーズ間依存

- **Phase 1 (Setup)**: 依存なし — 即着手可能
- **Phase 2 (Foundational)**: Phase 1 完了後 — 全USをブロック
- **Phase 3 (US1)**: Phase 2 完了後に着手可能 — US2/US3と並行可
- **Phase 4 (US2)**: Phase 2 完了後に着手可能 — US1/US3と並行可
- **Phase 5 (US3)**: Phase 2 + **US2 完了後**（`discord.userId` が必要）
- **Phase 6 (Polish)**: 全US完了後

### US内依存

```
US1: T007(Foundation) → T009 → T011 → T012 → T013
                              ↘ T014, T015（並列）

US2: T008(Admin SDK, Foundation済み) → T016 → T017
     T018, T019, T020（並列）

US3: T021, T022 → T023（リファクタリング）
     T024（Interactions Endpoint）
       → T025（handleRisukerugg, waitUntil）→ T026（Follow-up）
       → T027（ボタン: confirm/revise/cancel）→ T028, T029, T030（並列）
     T031（セッション管理）→ T032（リセット）
```

### 並列実行例（US3 Phase）

```bash
# T021, T022 は並列
src/lib/ai/systemPrompt.ts 作成
src/lib/ai/parseProposal.ts 作成

# T028, T029, T030 は並列（異なるファイル）
register/registerSchedule.ts 作成
register/registerTask.ts 作成
register/registerCollab.ts 作成
```

---

## 実装戦略

### MVP（US1のみで価値提供）

1. Phase 1: Setup 完了
2. Phase 2: Foundational 完了（T004〜T007）
3. Phase 3: US1 完了（T008〜T014）
4. **リリース**: チームWebhook通知が動作する ← Discord Developer Portal不要で即使える

### インクリメンタルデリバリー

1. US1（Webhook通知）→ Bot不要・最も簡単 → MVPリリース
2. US2（OAuth2連携）→ Discord Appの設定が必要
3. US3（AIボット）→ US2完了後・Discord Application IDが必要

### Discord側の事前準備（実装前に手動）

Sprint 2/3 を実装する前に以下が必要:
- Discord Developer Portal でアプリ作成
- Application ID / Public Key / Client Secret / Bot Token を取得
- OAuth2 リダイレクト URI に `https://[DOMAIN]/api/discord/callback` を追加
- Bot: `applications.commands` スコープを有効化（Botスコープは不要）

---

## Notes

- `[P]` タスク = 異なるファイル、依存なし、並列実行可能
- US3 は US2 完了（`users.discord.userId` の存在）に依存する唯一の依存関係
- Webhook送信失敗はログのみ（スケジュール作成・通知本体を失敗させない）
- Discord Interactions Endpoint の署名検証は必須（T023の最初に実装）
- `request.text()` vs `request.json()` の落とし穴: 署名検証には必ず `text()` を使う
- セッションは30分タイムアウト（Firestoreの `updatedAt` で判定）
