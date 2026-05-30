# Tasks: Discord連携 再設計実装

**Input**: `specs/012-discord-integration/plan.md`, `spec.md`, `data-model.md`, `research.md`
**更新**: 2026-05-30 — 再設計（guild_id起点・Bot招待フロー・Webhook→Bot通知移行）

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並行実行可能（別ファイル、依存なし）
- **[Story]**: 対応するユーザーストーリー（US1/US2/US3）
- 全タスクに正確なファイルパスを記載

---

## Phase 1: セットアップ（型定義・旧コード削除）

**目的**: 再設計の基盤となる型変更と、旧Sprint 2（OAuth個人連携）の完全削除

- [X] T001 `src/types/entities.ts` の `DiscordTeamConfig` に `guildId?: string` と `channelId?: string` を追加
- [X] T002 `src/types/entities.ts` の `DiscordSession` を改修: `discordUserId` と `risukeruUserId` を削除し `guildId: string` を追加（セッションキーをguildIdに変更）
- [X] T003 `src/types/entities.ts` の `User` インターフェースから `discord?: { userId, username, connectedAt }` フィールドを削除
- [X] T004 [P] `src/components/settings/DiscordConnectSection.tsx` を削除（OAuth個人連携UI不要）
- [X] T005 [P] `src/app/api/discord/link-start/route.ts` を削除（OAuth個人連携API不要）
- [X] T006 [P] `src/app/api/discord/callback/route.ts` を削除（OAuth個人連携コールバック不要）
- [X] T007 `src/stores/auth.ts` から `discordInfo` 関連フィールド・ロジックをすべて削除
- [X] T008 ユーザー設定画面（`src/app/(protected)/settings/page.tsx` または該当コンポーネント）から `DiscordConnectSection` のimportと使用箇所を削除
- [X] T009 [P] `scripts/register-discord-commands.mjs`（グローバルコマンド登録スクリプト）を削除（ギルドコマンド方式に移行したため不要）

**Checkpoint**: `pnpm typecheck` が通ること。旧OAuth個人連携コードが完全除去されていること。

---

## Phase 2: 基盤整備（全ストーリー共通の前提条件）

**目的**: guild_id起点のアーキテクチャに必要な共通インフラを整備

⚠️ **CRITICAL**: このフェーズ完了前はいずれのUSも着手不可

- [X] T010 `src/app/api/discord/interactions/route.ts` の `InteractionSchema` に `guild_id: z.string().optional()` を追加
- [X] T011 `src/app/api/discord/interactions/route.ts` の DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE レスポンスから `flags: 64` を削除（通常投稿化）
- [X] T012 `src/app/api/discord/interactions/route.ts` で `guild_id` が取得できない場合（DM等）に「サーバー内でコマンドを実行してください」を返す早期リターンを追加
- [X] T013 `src/lib/repositories/teams.ts` に `getTeamIdByGuildId(guildId: string): Promise<string | null>` を追加（`collectionGroup('discord').where('guildId', '==', guildId).limit(1)` クエリ）
- [X] T014 `src/lib/repositories/teams.ts` に `isGuildAlreadyLinked(guildId: string): Promise<boolean>` を追加（1サーバー1チーム制約のバリデーション用）

**Checkpoint**: `pnpm typecheck` が通ること

---

## Phase 3: US1 — Sprint 1完成（Webhook通知 + スキーマ更新）

**Goal**: チームのDiscordチャンネルにスケジュール通知を送信。既存実装にguildId/channelIdフィールドを追加し、Sprint 2後の移行準備を整える。

**Independent Test**:
1. チーム設定でWebhook URLを保存できる
2. スケジュール作成後にWebhookへPOSTが届く
3. Webhook URL未設定時はスキップして通常処理が成功する

### US1 実装

- [X] T015 [P] [US1] `src/lib/repositories/teams.ts` の `updateDiscordSettings` 関数を拡張: `guildId` と `channelId` フィールドの保存に対応
- [X] T016 [P] [US1] Firestoreルール（`firestore.rules` または相当ファイル）を更新: `discord_link_requests` コレクションのルール（旧OAuth用）を削除し、`discord_sessions/{guildId}` のルール（`allow read, write: if false`）に差し替え
- [X] T017 [US1] Webhook通知ロジックの確認と修正: Cloud Functions（`functions/src/discord/sendWebhook.ts` または相当ファイル）で `webhookUrl` が空文字または未設定の場合に早期リターンする処理が存在することを確認、なければ追加
- [X] T018 [US1] スケジュール作成時Webhook送信（`functions/src/schedules/createSchedule.ts` または相当箇所）で `channelId` が設定されている場合はBot API通知（T024）を優先し、`webhookUrl` のみの場合はWebhookで送信する条件分岐を追加（後方互換）

**Checkpoint**: spec.md Sprint 1 受け入れ基準 #1〜#6 を手動確認

---

## Phase 4: US2 — Bot招待フロー（新規実装）

**Goal**: チームoperatorが「Botをサーバーに追加」ボタンを押すだけで、BotがDiscordサーバーに参加し、通知先チャンネルを選択して保存できる。Webhook手動設定が不要になる。

**Independent Test**:
1. チーム設定のDiscordセクションに「Botをサーバーに追加」ボタンが表示される（operatorのみ）
2. ボタンクリック → Discord OAuth2画面でサーバーを選択・許可
3. コールバック後にチャンネル選択UIが表示される
4. チャンネル選択・保存後に `teams/{teamId}/discord/config` の `guildId` と `channelId` が保存される
5. 招待済み状態がUIに反映される（「接続済み」表示）
6. 対象サーバーに `/risukerugg` ギルドコマンドが登録される（他サーバーには表示されない）

### US2 実装

- [X] T019 [US2] `src/app/api/discord/bot-invite-start/route.ts` を新規作成:
  - operatorのFirebase ID tokenで認証
  - Discord OAuth2 URL生成（scope: `bot applications.commands`、permissions: Send Messages + Embed Links + Use Slash Commands）
  - CSRF保護用のnonceを `discord_bot_invite_requests/{nonce}` に保存（teamIdと有効期限を含む）
  - `{ authUrl: string }` を返す
- [X] T020 [US2] `src/app/api/discord/bot-invite-callback/route.ts` を新規作成:
  - クエリパラメータ `code`, `guild_id`, `state`（nonce）を受け取る
  - `discord_bot_invite_requests/{state}` からteamIdを取得・検証
  - `isGuildAlreadyLinked(guildId)` で重複チェック（既に他チームが使用中なら `/team?discord=error&reason=already-linked` にリダイレクト）
  - Bot tokenで Discord API `GET /guilds/{guildId}/channels` を呼び出しテキストチャンネル一覧を取得
  - チャンネル情報をsessionまたはクエリパラメータで渡して `/team?discord=channel-select&guildId={guildId}` にリダイレクト
- [X] T021 [US2] `src/app/api/discord/save-guild-config/route.ts` を新規作成:
  - operatorが選択した `guildId` + `channelId` を `teams/{teamId}/discord/config` に保存（Admin SDK）
  - ギルドコマンド登録APIを内部呼び出し
  - 成功後 `/team?discord=connected` にリダイレクト
- [X] T022 [US2] `src/app/api/discord/register-guild-commands/route.ts` を新規作成:
  - Discord REST API `PUT /applications/{appId}/guilds/{guildId}/commands` で `/risukerugg`（messageオプション付き）をギルドコマンドとして登録
  - Bot tokenを使用
  - 内部からのみ呼び出し可（認証チェック必須）
- [X] T023 [US2] Bot通知ユーティリティ `src/lib/discord/sendBotMessage.ts` を新規作成:
  - Discord API `POST /channels/{channelId}/messages` でEmbed形式メッセージを送信
  - `try/catch` でラップ、失敗はログのみ（呼び出し元を失敗させない）
- [X] T024 [US2] スケジュール通知処理（Cloud Functions相当箇所）を更新: `channelId` が設定されていればBotメッセージ（`sendBotMessage`）で送信し、`webhookUrl` のみの場合はWebhookで送信（後方互換維持）
- [X] T025 [US2] `src/components/team/DiscordSettingsSection.tsx` を更新:
  - 未招待: 「Botをサーバーに追加」ボタン → `/api/discord/bot-invite-start` (POST) を呼び出し `authUrl` にリダイレクト
  - channel-selectモード（クエリパラメータ `?discord=channel-select` 検出時）: チャンネル選択ドロップダウン + 「保存する」ボタン
  - 招待済み（`guildId` 設定済み）: 「接続済み」表示 + チャンネル名 + 「解除」ボタン。Sprint 1のWebhook URL入力欄を非表示に切り替え
  - 解除ボタン: `guildId` と `channelId` をFirestoreからクリア

**Checkpoint**: spec.md（再設計版）Sprint 2 受け入れ基準 S2-1〜S2-5 を手動確認

---

## Phase 5: US3 — AIボット再設計（guild_id起点）

**Goal**: `/risukerugg` コマンドをDiscordサーバーで打つと、そのサーバーに対応するチームのAIアシスタントが全員に見える通常投稿で返答する。セッションはサーバー全体で共有。個人認証不要。

**Independent Test**:
1. 連携済みサーバーで `/risukerugg message:来週月曜に配信入れたい` を実行
2. チャンネルに全員が見える通常投稿で返答が届く
3. 別のメンバーが `/risukerugg message:タイトルはマイクラにして` を実行すると文脈が継続している
4. AIが提案すると全員が見えるボタン付きメッセージが表示される
5. 誰でもボタンをクリックして登録・キャンセルできる
6. 未連携サーバーから実行すると連携案内メッセージが届く

### US3 実装

- [X] T026 [US3] `src/app/api/discord/interactions/sessionManager.ts` を改修:
  - `getSession(guildId)`, `upsertSession(guildId, ...)`, `deleteSession(guildId)` にシグネチャ変更
  - `DiscordSession` の型を更新（`guildId: string`, `teamId: string`, `messages`, `pendingProposal`, `updatedAt` のみ。`discordUserId`/`risukeruUserId` 削除）
- [X] T027 [US3] `src/app/api/discord/interactions/handlers/handleRisukerugg.ts` を全面改修:
  - 引数を `(guildId: string, userMessage: string, appId: string, token: string)` に変更
  - `discordUserId` → Firestoreでの個人ユーザー解決ロジックを削除
  - `getTeamIdByGuildId(guildId)` でチームを特定（未連携なら「チーム設定からBotを招待してください」メッセージ）
  - `currentTeamId` への依存を完全削除
  - セッションキーを `guildId` で操作するよう変更（T026のsessionManager利用）
- [X] T028 [US3] `src/app/api/discord/interactions/handlers/handleButtonClick.ts` を改修:
  - `discordUserId` の参照をすべて `guildId` に変更
  - ボタン `custom_id` のキー形式を `{action}:{guildId}` に変更（`{action}:{discordUserId}` から変更）
  - ボタン押下者の同一性チェックを削除（誰でも押せる）
  - セッション取得を `getSession(guildId)` に変更
- [X] T029 [US3] `src/app/api/discord/interactions/route.ts` を改修:
  - `discordUserId`（`interaction.member?.user?.id`）の取得・使用を削除
  - `guild_id` を取得し各ハンドラーに渡す
  - `handleAiConversation` の呼び出しを `(discordUserId, ...)` から `(guildId, ...)` に変更
  - ボタン照合ロジックを `targetUserId === discordUserId` から `targetGuildId === guildId` に変更
- [X] T030 [US3] `src/app/api/discord/interactions/discordFollowUp.ts` を確認・修正:
  - `flags: 64` が含まれていれば削除（通常投稿化）
  - `sendProposalMessage` のボタン `custom_id` を `{action}:{guildId}` 形式に更新

**Checkpoint**: spec.md（再設計版）Sprint 3 受け入れ基準 S3-1〜S3-11 を手動確認

---

## Phase 6: Polish & 横断的対応

**目的**: セキュリティ・環境変数・ビルド確認・ドキュメント

- [X] T031 [P] Firestoreルール最終確認: `discord_bot_invite_requests/{nonce}` コレクションに `allow read, write: if false` を追加
- [X] T032 [P] `.env.local.example`（または環境変数ドキュメント）を更新:
  - 削除: `NEXT_PUBLIC_DISCORD_CLIENT_ID`（クライアント側OAuth不要になったため）
  - 追加コメント: `DISCORD_CLIENT_SECRET` は「Bot招待OAuth2シークレット」、`DISCORD_BOT_TOKEN` は「ギルドコマンド登録・チャンネル投稿」に用途明記
- [X] T033 `pnpm typecheck` を実行してエラーがないことを確認、あれば修正
- [X] T034 `pnpm build` を実行してビルドが成功することを確認、あれば修正
- [X] T035 `docs/progress.md` に実装内容・起動方法・テストシナリオを記録

---

## 依存関係・実行順序

### フェーズ依存関係

```
Phase 1（型定義・削除）
    ↓
Phase 2（基盤整備）← Phase 1完了が必要
    ↓
Phase 3 (US1), Phase 4 (US2), Phase 5 (US3) ← Phase 2完了後に並行着手可
    ↓
Phase 6（Polish）← 全ストーリー完了後
```

### ユーザーストーリー依存関係

- **US1 (Sprint 1)**: Phase 2完了後に着手可能。US2/US3への依存なし
- **US2 (Sprint 2)**: Phase 2完了後に着手可能（`getTeamIdByGuildId` T013が前提）
- **US3 (Sprint 3)**: Phase 2完了後に着手可能。US2の `guildId` 保存が先に動いていると理想的だが、未連携ケースを実装すれば単体テスト可能

### US2 内の依存関係

```
T019 (bot-invite-start) → T020 (bot-invite-callback) → T021 (save-guild-config) → T022 (register-guild-commands)
T023 (sendBotMessage) → T024 (Cloud Functions通知更新)
T021 + T023 → T025 (DiscordSettingsSection UI更新)
```

### US3 内の依存関係

```
T026 (sessionManager改修) → T027 (handleRisukerugg改修)
T027 → T029 (route.ts改修)
T028 (handleButtonClick改修) → T029
T030 (discordFollowUp確認) → T029
```

---

## 並行実行の例

### Phase 1 並行実行

```
グループA（削除タスク）: T004, T005, T006, T009
グループB（型・コンポーネント更新）: T001, T002, T003, T007, T008
```

### Phase 3 + 4 + 5 並行実行（Phase 2完了後）

```
開発者A: Phase 3 (US1) T015〜T018
開発者B: Phase 4 (US2) T019〜T025
開発者C: Phase 5 (US3) T026〜T030
```

---

## 実装戦略

### MVP（最小実施）

1. Phase 1: 不要コード削除（T001〜T009）
2. Phase 2: 基盤整備（T010〜T014）
3. Phase 5: AIボット再設計（T026〜T030）← 最もインパクト大

### 段階的デリバリー

1. Phase 1 + 2 → ビルド確認（旧コード除去完了）
2. Phase 5 (US3) → AIボットのguild_id起点化・通常投稿化
3. Phase 4 (US2) → Bot招待フロー（理想UXの実現）
4. Phase 3 (US1) → Sprint 1動作確認・スキーマ更新
5. Phase 6 → Polish

---

## 注意事項

- `[P]` タスク = 異なるファイル・依存なし・並行実行可能
- `discord_sessions` コレクション名は維持、キーのみ `discordUserId` → `guildId` に変更
- グローバルコマンドが既に登録されている場合は Discord Developer Portal から手動で削除する（APIでの自動削除は不要）
- Bot通知（T023〜T024）はCloud FunctionsとNext.jsの両方から参照するため、`src/lib/discord/sendBotMessage.ts` を共有ライブラリとして配置するか、Functions内に別途作成する
- Bot招待OAuth2はユーザー個人のトークンではなくアプリ（Bot）をサーバーに追加するフロー。`guild_id` はOAuth2コールバックのクエリパラメータとして自動的に渡される
