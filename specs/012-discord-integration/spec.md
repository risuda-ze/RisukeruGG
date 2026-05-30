# 仕様書: Discord連携

**Branch**: `012-discord-integration` | **Date**: 2026-05-28  
**Status**: Draft

## 概要

RisukeruGGとDiscordを連携する機能を段階的に実装する。

- **Sprint 1**: チームのDiscordチャンネルへスケジュール通知を送信（Webhook）
- **Sprint 2**: Discord OAuth2でアカウント連携（ユーザー個別）
- **Sprint 3**: `/risukerugg` AIボット — 自然言語でタスク・スケジュール・コラボを登録

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

## Sprint 2: Discord OAuth2 アカウント連携

### 概要

ユーザー個人のDiscordアカウントをRisukeruGGアカウントに紐付ける。Sprint 3の `/collab` コマンドに必要。

### 2-1. 連携フロー ✅ H2（CSRF保護）・H4（ユーザー特定）対応

**CSRF保護とユーザーID特定を nonce 方式で解決する。**

1. ユーザー設定画面に「Discordと連携」ボタンを追加
2. クリック時にクライアントが `/api/discord/link-start`（POST）を呼び出す
   - サーバーサイドで `crypto.randomUUID()` の nonce を生成
   - Firestore `discord_link_requests/{nonce}` に `{ uid, expiresAt: +10分 }` を保存
   - nonce を返却
3. クライアントが Discord OAuth2 URL にリダイレクト
   ```
   https://discord.com/oauth2/authorize
     ?client_id={DISCORD_CLIENT_ID}
     &scope=identify
     &response_type=code
     &redirect_uri={CALLBACK_URL}
     &state={nonce}          ← CSRFトークン兼ユーザーID参照キー
   ```
4. Discord 認証後、`/api/discord/callback?code=...&state={nonce}` にリダイレクト
5. コールバック処理（サーバーサイド）:
   a. `discord_link_requests/{nonce}` を取得して uid を解決（存在しない・期限切れは 400）
   b. Discord `/users/@me` で Discord ユーザー情報取得
   c. Firestore Admin SDK で `users/{uid}.discord` を更新
   d. `discord_link_requests/{nonce}` を削除（nonce は使い捨て）
   e. `/settings?discord=connected` にリダイレクト
6. 連携済みの場合は連携済みDiscordユーザー名と「解除」ボタンを表示

#### `/api/discord/link-start` エンドポイント（新規追加）

- **Method**: POST
- **認証**: Firebase Auth セッションクッキーでログイン済みユーザーを確認
- **Response**: `{ authUrl: string }` — Discord OAuth2 URL を返す（クライアントがリダイレクト）

### 2-2. Firestoreスキーマ変更

`users/{uid}` ドキュメントに追加：

```typescript
discord?: {
  userId: string;     // Discord Snowflake ID
  username: string;   // 表示用ユーザー名
  connectedAt: Date;
} | null;
```

### 2-3. 必要な環境変数（Sprint 2から）

```env
DISCORD_CLIENT_ID=              # OAuth2用（= Application ID）
DISCORD_CLIENT_SECRET=          # OAuth2シークレット
NEXT_PUBLIC_DISCORD_CLIENT_ID=  # クライアント側リダイレクト用
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

各 `/risukerugg` 呼び出しは同じユーザーの**前の会話を継続**する（Firestoreにセッションを保存）。

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

全てのBotメッセージは **ephemeral（本人のみ見える）**。チャンネルを汚さない。

### 3-3. 技術アーキテクチャ

#### なぜ `/risukerugg <message>` 形式なのか

Discord Interactions Endpoint（サーバーレス）はスラッシュコマンドとボタン操作のみ受け取れる。通常のメッセージ（ @メンション）を受け取るにはGateway（WebSocket常時接続）が必要で、Firebase Functions / Next.jsとは相性が悪い。

**`/risukerugg message:...` 方式のメリット:**
- Interactions Endpoint のみで動く（追加インフラ不要）
- 会話履歴をFirestoreに保存することで複数ターンの会話を継続できる
- 既存のNext.js APIルート構成に自然に組み込める

#### Firestoreセッション管理

```typescript
// discord_sessions/{discordUserId} 
{
  discordUserId: string;
  risukeruUserId: string;       // 紐付けられた RisukeruGG UID
  teamId: string;
  messages: Array<{             // Claude に渡す会話履歴
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

  // 1. まず即座に Deferred Ephemeral Response を返す（3秒以内）
  const deferredResponse = Response.json({
    type: 5,           // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
    data: { flags: 64 }, // flags:64 = ephemeral（本人のみ）
  });

  // 2. バックグラウンドで処理（Vercel waitUntil — レスポンス後も実行継続）
  waitUntil(handleAiConversation(interaction, appId, token));

  return deferredResponse;
}

// 3. 処理完了後、Discord Follow-up API でメッセージを更新
await fetch(
  `https://discord.com/api/webhooks/${appId}/${token}/messages/@original`,
  { method: 'PATCH', body: JSON.stringify({ content: aiReply, flags: 64 }) }
);
```

> **注意**: `@vercel/functions` は `pnpm add @vercel/functions` で追加する（T001 に含める）。`fire-and-forget`（`void asyncFn()`）はサーバーレスでは関数終了時に中断されるため使用禁止。

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

ボタンの `custom_id` は `{action}:{discordUserId}` 形式。クリック時に Firestore セッションから `pendingProposal` を取り出して処理する。

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
- ユーザーへの返答は修正点を聞くメッセージ（ephemeral）

### 3-5. セッションリセット

```
/risukerugg message:リセット   # 会話をリセット
```

または30分間操作がなければ自動リセット。

### 3-6. Firestoreスキーマ変更（Sprint 3追加）

```typescript
// discord_sessions/{discordUserId}（新規コレクション）
interface DiscordSession {
  discordUserId: string;
  risukeruUserId: string;
  teamId: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  pendingProposal?: Record<string, unknown>;
  updatedAt: Date;
}
```

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
| Webhook送信 | 標準 `fetch`（ライブラリ不要） | S1 |
| Discord通知ユーティリティ | `functions/src/discord/sendWebhook.ts` | S1 |
| OAuth2フロー | Next.js API Route `/api/discord/callback` | S2 |
| Interactions Endpoint | `discord-interactions` + Next.js `/api/discord/interactions` | S3 |
| AIチャット | Claude haiku（既存 `chat/route.ts` のロジックを共通化） | S3 |
| 会話セッション管理 | Firestore `discord_sessions/{discordUserId}` | S3 |
| AIユーティリティ共通化 | `src/lib/ai/systemPrompt.ts`, `parseProposal.ts`（新規抽出） | S3 |

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

### Sprint 2: OAuth2連携

| # | テスト | 合格条件 |
|---|--------|---------|
| 7 | ユーザー設定画面に「Discordと連携」ボタンが表示される | ボタンが存在し、クリック可能 |
| 8 | Discord OAuth2フロー完了後にFirestoreに `discord.userId` が保存される | Firestoreドキュメントに値が入る |
| 9 | 連携済みの場合、Discordユーザー名と「解除」ボタンが表示される | 表示が正しい |
| 10 | 連携解除するとFirestoreの `discord` フィールドが削除される | フィールドが消える |

### Sprint 3: `/risukerugg` AI会話ボット

| # | テスト | 合格条件 |
|---|--------|---------|
| 11 | `/api/discord/interactions` がDiscordのPINGに正しく応答する | HTTP 200 + `{"type":1}` |
| 12 | 署名が不正なリクエストを拒否する | HTTP 401 |
| 13 | `/risukerugg message:来週月曜に配信入れたい` を送るとBotがAIの返答を返す | ephemeralメッセージが届く |
| 14 | 未連携ユーザーが `/risukerugg` を使うとephemeralエラーメッセージが返る | 連携URLが含まれる |
| 15 | 2ターン以上の会話で文脈が維持されている | 2回目の `/risukerugg` で前の発言を踏まえた返答が来る |
| 16 | AIが `%%PROPOSAL%%` を返すと確認ボタン付きメッセージが表示される | [✅ 登録する] ボタンが表示される |
| 17 | [✅ 登録する] クリック後、Firestoreにスケジュールドキュメントが作成される | ドキュメントの存在と内容を確認 |
| 18 | [✅ 登録する] クリック後、Firestoreにタスクドキュメントが作成される | ドキュメントの存在と内容を確認 |
| 19 | [✅ 登録する] クリック後、Firestoreにコラボドキュメントが作成される | ドキュメントの存在と内容を確認 |
| 20 | [❌ キャンセル] クリックでセッションがリセットされる | Firestoreのセッションが削除される |
| 21 | `/risukerugg message:リセット` でセッションがリセットされる | 「会話をリセットしたよ」メッセージが返る |

---

## スコープ外（今回は実装しない）

- タスク・スケジュールの通知の個人単位ON/OFF（チーム単位のみ）
- `@メンション` でのボット呼び出し（Gateway WebSocket が必要）
- Discord Activityによるembeddedアプリ
- AIによる既存データの更新・削除（登録のみ）
- ロール別コマンド制限（全チームメンバーが使用可能）
