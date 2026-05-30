# 仕様書: Discord連携

**Branch**: `012-discord-integration` | **Date**: 2026-05-28  
**Status**: Draft

## 概要

RisukeruGGとDiscordを連携する機能を段階的に実装する。

- **Sprint 1**: チームのDiscordチャンネルへスケジュール通知を送信（Webhook）
- **Sprint 2**: Bot招待フロー — operatorがUIからDiscordサーバーにBotを招待し、通知チャンネルを選択（Webhook廃止、ギルドコマンド登録）
- **Sprint 3**: `/risukerugg` AIボット — 自然言語でタスク・スケジュール・コラボを登録（guild_id起点、全員に見える通常投稿）

---

## 対象ユーザー

- RisukeruGGのチームoperator / member
- Discordでチームと連絡を取り合っている配信者

---

## Sprint 1: スケジュール通知（Discord Webhook）

### 概要

チームのDiscordチャンネルに登録したWebhook URLへ、スケジュール通知を自動送信する。Bot不要、Discord OAuth2不要でシンプルに実現する。

### 1-1. チーム設定 — Discord通知設定UI

チーム設定画面（`/team`）にDiscordセクションを追加。**operatorのみ**設定可能。

**設定項目:**

| 項目 | 種別 | 説明 |
|------|------|------|
| Webhook URL | テキスト入力 | DiscordチャンネルのWebhook URL |
| スケジュール作成時に通知 | トグル | 新規スケジュール登録時に送信 |
| 1時間前リマインダー | トグル | 開始1時間前に送信 |
| 15分前リマインダー | トグル | 開始15分前に送信 |

Webhook URLはDiscord側で「サーバー設定 → 連携サービス → ウェブフック → URLをコピー」から取得。

### 1-2. Firestoreスキーマ — サブコレクション方式 ✅ C1対応

Discord設定は `teams/{teamId}` のメインドキュメントではなく、**サブコレクション `teams/{teamId}/discord/config`** に保存する。

**理由**: Firestoreはドキュメント単位でしかセキュリティルールを適用できないため、`discordSettings` フィールドをメインドキュメントに置くと Webhook URL が全チームメンバーに読まれる。サブコレクション方式なら operator のみに制限できる。

```typescript
// src/types/entities.ts に追加（Team インターフェースには追加しない）
export interface DiscordTeamConfig {
  webhookUrl: string;
  notifyOnCreate: boolean;    // スケジュール作成時
  notifyBefore1h: boolean;    // 1時間前リマインダー
  notifyBefore15min: boolean; // 15分前リマインダー
}
```

Firestoreルール:
```
match /teams/{teamId}/discord/{doc} {
  allow read, write: if isTeamOwner(teamId);  // operatorのみ
}
```

Cloud Functions（Admin SDK）はセキュリティルールをバイパスするため、`createSchedule` と `scheduleReminders` は問題なく読み取れる。

### 1-3. Discord通知メッセージ形式

Discordの **Embed** 形式で送信する（色付きカード）。

**スケジュール作成時:**
```
📅 スケジュールが追加されました
━━━━━━━━━━━━━━━━━━
タイトル: 〇〇配信
日時:    2026/06/01 (月) 20:00 〜 22:00
参加者:  ユーザーA、ユーザーB
━━━━━━━━━━━━━━━━━━
RisukeruGGで確認 →
```

**リマインダー（1時間前 / 15分前）:**
```
⏰ 1時間後にスケジュールが始まります
━━━━━━━━━━━━━━━━━━
タイトル: 〇〇配信
開始:    20:00
参加者:  ユーザーA、ユーザーB
━━━━━━━━━━━━━━━━━━
```

### 1-4. 実装箇所（Cloud Functions）

**`functions/src/discord/sendWebhook.ts`** — Webhook送信ユーティリティ（新規）

```typescript
// チームのdiscordSettings.webhookUrl にPOSTするヘルパー
sendDiscordWebhook(webhookUrl: string, embed: DiscordEmbed): Promise<void>
```

**`functions/src/schedules/createSchedule.ts`** — 既存に追記

スケジュール作成後、Admin SDK で `teams/{teamId}/discord/config` を読み取り、`notifyOnCreate === true` の場合にWebhook送信。

**`functions/src/notifications/scheduleReminders.ts`** — 既存に追記

通知書き込み後、Admin SDK で `teams/{teamId}/discord/config` を読み取り、`notifyBefore1h` / `notifyBefore15min` に応じてWebhook送信。

### 1-5. Webhook URL の保護 ✅ H5対応

- Discord設定はサブコレクション `teams/{teamId}/discord/config` に保存し、Firestoreルールで **operatorのみ読み書き可能** に制限する
- チームメンバー（member / rom ロール）はクライアントから読み取れない
- Cloud Functions（Admin SDK）はルールをバイパスして読み取り可能

---

## Sprint 2: Bot招待フロー・ギルドコマンド登録

### 概要

チームのoperatorが設定画面から「Botをサーバーに追加」ボタンを押すだけで、RisukeruGGのBotが対象のDiscordサーバーに参加し、通知先チャンネルを選択して保存できる。Sprint 1のWebhook URL手動設定をBot経由の通知に置き換え、スラッシュコマンドをそのサーバー専用（ギルドコマンド）として登録する。

**個人のDiscordアカウント連携（OAuth2）は不要。** BotはDiscordサーバー（guild）単位で動作する。

### 2-1. Bot招待フロー ✅ CSRF保護（nonce方式）

```
[チーム設定 → Discord連携 → 「Botをサーバーに追加」ボタン]
    ↓
POST /api/discord/bot-invite-start（operatorのFirebase ID tokenで認証、teamIdをリクエストボディで送信）
  ・crypto.randomUUID() で nonce を生成
  ・Firestore discord_bot_invite_requests/{nonce} に { teamId, expiresAt: +10分 } を保存
  ・Discord OAuth2 URL（scope: bot applications.commands、state=nonce）を返却
    ↓
Discord認証画面（サーバー選択 → 権限確認 → 許可）
    ↓
GET /api/discord/bot-invite-callback?code=...&guild_id=...&state={nonce}
  ・discord_bot_invite_requests/{nonce} からteamIdを取得・検証
  ・isGuildAlreadyLinked(guildId) で重複チェック → 使用中なら /team?discord=error&reason=already-linked へ
  ・Bot token で Discord API GET /guilds/{guildId}/channels を呼び出しチャンネル一覧取得
  ・チャンネル一覧を Firestore discord_bot_invite_pending/{nonce} に一時保存
  ・/team?discord=channel-select&nonce={nonce} にリダイレクト
    ↓
チーム設定画面でチャンネル選択ドロップダウン表示 → 「保存する」ボタン
    ↓
POST /api/discord/save-guild-config（guildId + channelId を保存）
  ・teams/{teamId}/discord/config に guildId と channelId を保存（Admin SDK）
  ・ギルドコマンド登録 API を内部呼び出し → /risukerugg をそのサーバー専用コマンドとして登録
  ・/team?discord=connected にリダイレクト
```

### 2-2. ギルドコマンド登録

`PUT /applications/{appId}/guilds/{guildId}/commands`（Discord REST API）で `/risukerugg` をギルドコマンドとして登録する。**グローバルコマンドは使用しない。** 無関係なDiscordサーバーにコマンドが表示されるのを防ぐ。

### 2-3. Bot通知への移行（Sprint 1のWebhookを廃止）

Bot招待完了後は、スケジュール通知をWebhook URLではなくBot API（`POST /channels/{channelId}/messages`）で送信する。

- `channelId` が設定済み → Bot経由で送信
- `channelId` 未設定かつ `webhookUrl` が設定済み → Webhookで送信（後方互換）
- チーム設定のWebhook URL入力欄は `guildId` 設定済みの場合に非表示に切り替える

### 2-4. 1サーバー1チーム制約

同一のDiscordサーバー（guild_id）は1つのチームにしかリンクできない。他チームが使用中の場合はBot招待をブロックしてエラーを表示する。

### 2-5. Bot招待状態のUI

| 状態 | チーム設定画面の表示 |
|------|------------------|
| 未招待 | 「Botをサーバーに追加」ボタン（operatorのみ表示） |
| チャンネル選択中 | チャンネル選択ドロップダウン + 「保存する」ボタン |
| 招待済み | 「接続済み」表示 + 通知先チャンネル名 + 「解除」ボタン |

Botがkickされた場合は自動検知しない。「解除」ボタンで手動削除のみ対応。

### 2-6. Firestoreスキーマ変更

`DiscordTeamConfig`（`teams/{teamId}/discord/config`）に追加：

```typescript
export interface DiscordTeamConfig {
  webhookUrl: string;        // Sprint 1のみ使用。guildId設定後は不使用
  guildId?: string;          // DiscordサーバーID（Bot招待完了後に書き込む）
  channelId?: string;        // Bot通知先チャンネルID（Bot招待完了後に書き込む）
  notifyOnCreate: boolean;
  notifyBefore1h: boolean;
  notifyBefore15min: boolean;
}
```

一時データ（`discord_bot_invite_requests/{nonce}`、`discord_bot_invite_pending/{nonce}`）はFirestoreに保存し、Admin SDKのみアクセス可能（`allow read, write: if false`）。

### 2-7. 必要な環境変数（Sprint 2から）

```env
DISCORD_CLIENT_ID=        # OAuth2 Application ID（Bot招待フロー用）
DISCORD_CLIENT_SECRET=    # OAuth2シークレット（Bot招待フロー用）
DISCORD_BOT_TOKEN=        # Bot Token（ギルドコマンド登録・チャンネル投稿用）
```

---

## Sprint 3: `/risukerugg` AI会話ボット

### 概要

`/risukerugg <メッセージ>` コマンドを送ると、WebアプリのAIチャット（「AIに相談」）と**同じAIロジック**が動作し、自然な会話でスケジュール・タスク・コラボを登録できる。

既存の `src/app/api/ai/chat/route.ts` のシステムプロンプト・`%%PROPOSAL%%`フォーマットをそのまま再利用する。

### 3-1. コマンド仕様

```
/risukerugg message:<テキスト>
```

| オプション | 種別 | 必須 | 説明 |
|-----------|------|------|------|
| `message` | テキスト | ✅ | AIへのメッセージ本文 |

各 `/risukerugg` 呼び出しは同じ**Discordサーバーの前の会話を継続**する（Firestoreにサーバー単位のセッションを保存）。

### 3-2. 会話フロー

```
ユーザー: /risukerugg message:来週月曜に配信入れたい
    ↓
Bot: 「考え中...」（Deferred Response — Discordの3秒制限を回避）
    ↓
Firestore からチームデータ取得（Admin SDK）
Firestore から会話履歴取得（セッション）
    ↓
Claude haiku（既存システムプロンプト + チームデータを注入）
    ↓
--- AIが質問した場合 ---
Bot: 「タイトルは何にする？何時から何時まで？」
ユーザー: /risukerugg message:マイクラ配信、20時から2時間
    ↓
--- AIが %%PROPOSAL%% を返した場合 ---
Bot: こんな感じでどう？
┌────────────────────────┐
│ 📅 マイクラ配信         │
│ 6/2 (月) 20:00〜22:00  │
└────────────────────────┘
[✅ 登録する]  [✏️ 修正する]  [❌ キャンセル]
    ↓
ユーザー: ✅ 登録する
    ↓
Firestore に書き込み → 完了メッセージ
```

全てのBotメッセージは**通常投稿（チャンネルの全員に見える）**。チームへの共有情報として全員が確認できる。

### 3-3. 技術アーキテクチャ

#### なぜ `/risukerugg <message>` 形式なのか

Discord Interactions Endpoint（サーバーレス）はスラッシュコマンドとボタン操作のみ受け取れる。通常のメッセージ（ @メンション）を受け取るにはGateway（WebSocket常時接続）が必要で、Firebase Functions / Next.jsとは相性が悪い。

**`/risukerugg message:...` 方式のメリット:**
- Interactions Endpoint のみで動く（追加インフラ不要）
- 会話履歴をFirestoreに保存することで複数ターンの会話を継続できる
- 既存のNext.js APIルート構成に自然に組み込める

#### Firestoreセッション管理

セッションはDiscordサーバー（guild）単位で管理する。個人ユーザーの特定は行わない。

```typescript
// discord_sessions/{guildId}  ← キーはDiscordサーバーID
{
  guildId: string;              // DiscordサーバーID
  teamId: string;               // 対応するRisukeruGGチームID
  messages: Array<{             // Claude に渡す会話履歴（サーバー全体で共有）
    role: 'user' | 'assistant';
    content: string;
  }>;
  pendingProposal?: object;     // 確認待ちの %%PROPOSAL%% データ
  updatedAt: Timestamp;         // 30分無操作でセッション自動リセット
}
```

#### Deferred Response パターン ✅ H3対応

Next.js + Vercel 環境では `@vercel/functions` の `waitUntil()` を使ってバックグラウンド処理を実行する。これにより、レスポンス送信後も関数が実行継続される。

```typescript
import { waitUntil } from '@vercel/functions';

export async function POST(req: NextRequest) {
  // 署名検証 ...

  // 1. まず即座に Deferred Response を返す（3秒以内）— flagsなし = 通常投稿
  const deferredResponse = Response.json({
    type: 5,   // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
    data: {},  // flags:64（ephemeral）は使用しない
  });

  // 2. バックグラウンドで処理（Vercel waitUntil — レスポンス後も実行継続）
  waitUntil(handleAiConversation(guildId, userMessage, appId, token));

  return deferredResponse;
}

// 3. 処理完了後、Discord Follow-up API でメッセージを更新（通常投稿）
await fetch(
  `https://discord.com/api/webhooks/${appId}/${token}/messages/@original`,
  { method: 'PATCH', body: JSON.stringify({ content: aiReply }) }  // flagsなし
);
```

> **注意**: `@vercel/functions` は `pnpm add @vercel/functions` で追加する。`fire-and-forget`（`void asyncFn()`）はサーバーレスでは関数終了時に中断されるため使用禁止。

#### AIロジックの再利用

既存の `/api/ai/chat/route.ts` のシステムプロンプトとフォーマット関数を切り出してユーティリティ化する。

```
src/lib/ai/
├── systemPrompt.ts    # generateSystemPrompt(context) — chat/route.ts から抽出
└── parseProposal.ts   # %%PROPOSAL%% ブロックをパース（chat/route.ts から抽出）
```

Discord Bot と Web の両方がこれを使う。

### 3-4. %%PROPOSAL%% → Discordボタン変換 ✅ H1（✏️修正ボタン定義）対応

AIが `%%PROPOSAL%%` を返したとき、内容を解析してDiscord Embedとボタンに変換する。

**スケジュールの例:**
```
📅 スケジュール登録の提案
タイトル : マイクラ配信
日時     : 2026/06/02 (月) 20:00〜22:00
参加者   : なし

[✅ 登録する]  [✏️ 修正する]  [❌ キャンセル]
```

ボタンの `custom_id` は `{action}:{guildId}` 形式。クリック時に Firestore のサーバー単位セッションから `pendingProposal` を取り出して処理する。ボタンはサーバー内の誰でも押せる（コマンド実行者への制限なし）。

#### ✏️ 修正する ボタンの動作定義

「修正する」は **Firestoreのセッションは保持したまま、AI に修正依頼を投げ直す**フロー。

```
ユーザー: [✏️ 修正する] クリック
    ↓
セッションの pendingProposal を削除（確認待ち状態を解除）
    ↓
Bot: 「どこを修正する？（例: 時間を変えたい、タイトルを変えたい）」
    ↓
ユーザー: /risukerugg message:時間を21時からにして
    ↓
AIが修正済み %%PROPOSAL%% を返す → 再度確認ボタン表示
```

- `pendingProposal` は削除するが `messages`（会話履歴）は保持する
- ユーザーへの返答は修正点を聞くメッセージ（通常投稿）

### 3-5. セッションリセット

```
/risukerugg message:リセット   # 会話をリセット
```

または30分間操作がなければ自動リセット。

### 3-6. Firestoreスキーマ変更（Sprint 3追加）

```typescript
// discord_sessions/{guildId}（新規コレクション、キーはDiscordサーバーID）
interface DiscordSession {
  guildId: string;              // DiscordサーバーID（セッションキー）
  teamId: string;               // 対応するRisukeruGGチームID
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  pendingProposal?: Record<string, unknown>;
  updatedAt: Date;
}
```

`discordUserId`・`risukeruUserId` フィールドは**使用しない**。個人ユーザーの特定は行わない。

### 3-7. 必要な環境変数（Sprint 3から追加）

```env
DISCORD_APPLICATION_ID=   # Developer Portal のアプリID
DISCORD_PUBLIC_KEY=       # Interactions Endpoint の署名検証用
DISCORD_BOT_TOKEN=        # Bot Token（コマンド登録・Follow-up送信用）
```

---

## 技術スタック

| レイヤー | 技術 | Sprint |
|---------|------|--------|
| Webhook送信（Sprint 1のみ） | 標準 `fetch`（ライブラリ不要） | S1 |
| Discord通知ユーティリティ | `functions/src/discord/sendWebhook.ts`（S1）/ `src/lib/discord/sendBotMessage.ts`（S2以降） | S1, S2 |
| Bot招待フロー | Next.js API Route `/api/discord/bot-invite-start`, `/api/discord/bot-invite-callback` | S2 |
| ギルドコマンド登録 | Next.js API Route `/api/discord/register-guild-commands`（Discord REST API使用） | S2 |
| Interactions Endpoint | `discord-interactions` + Next.js `/api/discord/interactions` | S3 |
| AIチャット | Claude haiku（既存 `chat/route.ts` のロジックを共通化） | S3 |
| 会話セッション管理 | Firestore `discord_sessions/{guildId}`（サーバー単位で共有） | S3 |
| AIユーティリティ共通化 | `src/lib/ai/systemPrompt.ts`, `parseProposal.ts`（実装済み） | S3 |

---

## 非機能要件

- Webhook URLはFirestoreのセキュリティルールでoperatorのみアクセス可能にする
- Discord Interactions（Sprint 3）はリクエストから **3秒以内** にレスポンスを返す（Discord仕様）
- 全シークレット（Webhook URL除く）は環境変数で管理し、コードに直書きしない
- Webhook送信が失敗してもスケジュール作成・通知本体は成功させる（非同期、エラーはログのみ）

---

## 受け入れ基準（Evaluator テスト項目）

### Sprint 1: Webhook通知

| # | テスト | 合格条件 |
|---|--------|---------|
| 1 | チーム設定画面（operator）にDiscordセクションが表示される | セクション・入力欄が存在する |
| 2 | Webhook URLを保存するとFirestoreの `teams/{teamId}/discord/config` ドキュメントの `webhookUrl` フィールドに値が入る | Firestoreドキュメントに保存される |
| 3 | member権限ではDiscord設定が変更できない | 保存ボタンが非表示または無効 |
| 4 | スケジュール作成時に通知ONの場合、Webhook URLにPOSTが送信される | Cloud Functions ログで確認 |
| 5 | Webhook URLが未設定の場合、Discord送信をスキップして通常処理は成功する | エラーなしで完了 |
| 6 | 15分前リマインダーONのチームで、スケジュール開始15分前にWebhookにPOSTが送信される | Cloud Functions ログで確認 |

### Sprint 2: Bot招待フロー

| # | テスト | 合格条件 |
|---|--------|---------|
| 7 | チーム設定にBot招待ボタンが表示される（operatorのみ） | ボタンが存在、memberには非表示 |
| 8 | Bot招待フロー完了後に `teams/{teamId}/discord/config` の `guildId` と `channelId` が保存される | Firestoreドキュメントに値が入る |
| 9 | 招待済み状態がUIに反映される | 「接続済み」表示とチャンネル名が表示される |
| 10 | 同一Discordサーバーを別チームがリンクしようとするとエラーになる | エラーメッセージが表示され保存されない |
| 10a | Bot招待後、対象サーバーに `/risukerugg` コマンドが登録される（他サーバーには表示されない） | ギルドコマンドとして存在することを確認 |

### Sprint 3: `/risukerugg` AI会話ボット

| # | テスト | 合格条件 |
|---|--------|---------|
| 11 | `/api/discord/interactions` がDiscordのPINGに正しく応答する | HTTP 200 + `{"type":1}` |
| 12 | 署名が不正なリクエストを拒否する | HTTP 401 |
| 13 | `/risukerugg message:来週月曜に配信入れたい` を送るとBotがAIの返答を通常投稿で返す | チャンネルの全員に見える投稿が届く（ephemeralではない） |
| 14 | 未連携サーバーから `/risukerugg` を使うと案内メッセージが返る | チーム設定へのURL（連携方法の説明）が含まれる通常投稿 |
| 15 | 2ターン以上の会話で文脈が維持されている | 2回目の `/risukerugg` で前の発言を踏まえた返答が来る |
| 16 | AIが `%%PROPOSAL%%` を返すと確認ボタン付きメッセージが表示される | [✅ 登録する] ボタンが表示される |
| 17 | [✅ 登録する] クリック後、Firestoreにスケジュールドキュメントが作成される | ドキュメントの存在と内容を確認 |
| 18 | [✅ 登録する] クリック後、Firestoreにタスクドキュメントが作成される | ドキュメントの存在と内容を確認 |
| 19 | [✅ 登録する] クリック後、Firestoreにコラボドキュメントが作成される | ドキュメントの存在と内容を確認 |
| 20 | [❌ キャンセル] クリックでセッションがリセットされる | Firestoreのセッションが削除される |
| 21 | `/risukerugg message:リセット` でセッションがリセットされる | 「会話をリセットしたよ」メッセージが返る |

---

## Clarifications

### Session 2026-05-30

- Q: 同一Discordサーバーを複数チームがリンクしようとした場合の挙動 → A: 拒否（エラー）。既にいずれかのチームにリンクされているサーバーへのBot招待はブロックし、ユーザーに「このサーバーは別のチームが使用中です」と通知する。1サーバー1チームを強制する。
- Q: BotがDiscordサーバーからkickされた場合の処理 → A: 自動検知なし。チーム設定の「解除」ボタンで手動削除のみ対応。Webhook送信失敗時はログに記録するがguildIdは自動クリアしない。
- Q: AIの提案ボタン（✅登録する / ❌キャンセル）を押せる対象 → A: サーバー内の誰でも押せる。チームメンバーなら誰でも登録・キャンセル可能。コマンドを打ったユーザーへの制限なし。
- Q: AIセッション（会話履歴）のスコープ → A: サーバー全体で1セッション共有。`discord_sessions/{guildId}` をキーにし、全メンバーが同じ会話の流れで操作できる。
- Q: Bot招待後、スケジュール通知はWebhookとBotのどちらで送るか → A: Sprint 2以降はBot経由に移行。Webhook URL手動設定を廃止し、Bot招待時に通知先チャンネルをドロップダウンで選択する形に変更。Sprint 1はWebhookで先行リリース、Sprint 2でBot通知に完全移行する。

---

## スコープ外（今回は実装しない）

- 1つのDiscordサーバーへの複数チームリンク（1サーバー1チームを強制。重複リンクはエラー）
- Sprint 2以降のWebhook URL手動設定（Bot経由の通知チャンネル指定に完全移行）
- タスク・スケジュールの通知の個人単位ON/OFF（チーム単位のみ）
- `@メンション` でのボット呼び出し（Gateway WebSocket が必要）
- Discord Activityによるembeddedアプリ
- AIによる既存データの更新・削除（登録のみ）
- ロール別コマンド制限（全チームメンバーが使用可能）
