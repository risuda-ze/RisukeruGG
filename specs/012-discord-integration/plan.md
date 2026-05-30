# 実装計画書: Discord連携 再設計

**Date**: 2026-05-30  
**Status**: 設計完了・実装待ち

---

## 背景・設計見直しの経緯

既存の `spec.md`（2026-05-28）は以下の設計上の問題を含んでいたため、実装前に再設計する。

### 既存仕様の問題点

| 問題 | 詳細 |
|------|------|
| **設計ミス: チームをcurrentTeamIdで特定** | BotはDiscordサーバー（guild）に招待されるのにもかかわらず、チームの特定をFirestoreの `users/{uid}.currentTeamId` で行っていた。ユーザーがRisukeruGGでチームを切り替えるとBotの参照先も変わる競合状態が発生しうる |
| **不要なSprint 2（OAuth個人連携）** | 個人特定・個人DM送信は不要なため、Discord OAuthによる個人アカウント連携は全面削除 |
| **不要なdiscord_sessionsコレクション** | discordUserIdを軸としたセッション管理は個人特定に依存するため削除 |
| **グローバルコマンド** | `/risukerugg` がグローバルコマンドだと無関係なDiscordサーバー全てにコマンドが表示され規約上のリスクがある |
| **ephemeralフラグ** | AIの返答が本人のみ表示（ephemeral）になっていたが、チームへの共有として全員に見える通常投稿にすべき |

### 新しい設計方針

- **チームの特定は `guild_id`（DiscordサーバーID）で行う**
- **Discordサーバー ↔ RisukeruGGチームを1対1でDBに保存**
- **Bot招待フロー（guild OAuth2）でチームとサーバーを紐付ける**
- **ギルドコマンド登録（招待したサーバーのみでコマンドが表示される）**
- **AIの返答は通常投稿（全員に見える）**
- **Discord OAuth個人連携・discord_sessionsは廃止**

---

## Sprint構成（再設計後）

| Sprint | 内容 | 依存 |
|--------|------|------|
| **Sprint 1** | Webhook通知 + guildId保存スキーマ追加 | なし |
| **Sprint 2** | Bot招待フロー・ギルドコマンド登録 | Sprint 1 |
| **Sprint 3** | `/risukerugg` AIボット（guild_id起点） | Sprint 2 |

---

## Sprint 1: Webhook通知 + guildId保存

### 変更点（既存spec.mdとの差分）

`DiscordTeamConfig` に `guildId` と `channelId` フィールドを追加する。Sprint 2のBot招待フローで書き込む。Sprint 1時点ではWebhookは手動入力のまま（Sprint 2でBot通知に完全移行・Webhook廃止）。

### Firestoreスキーマ

```typescript
// teams/{teamId}/discord/config
export interface DiscordTeamConfig {
  webhookUrl: string;        // Sprint 1のみ使用。Sprint 2以降はBot通知に移行
  guildId?: string;          // ← 追加: DiscordサーバーID（Sprint 2で書き込む）
  channelId?: string;        // ← 追加: Bot通知先チャンネルID（Sprint 2で書き込む）
  notifyOnCreate: boolean;
  notifyBefore1h: boolean;
  notifyBefore15min: boolean;
}
```

### 実装内容

既存の `spec.md` Sprint 1 の内容をそのまま実装する。差分は `guildId` / `channelId` フィールドの追加のみ。

---

## Sprint 2: Bot招待フロー・ギルドコマンド登録

### 概要

チームのoperatorがRisukeruGGの設定画面から「Discordサーバーに追加」ボタンを押すと：
1. RisukeruGGのBotが対象のDiscordサーバーに参加する
2. そのサーバー（guild）のIDがFirestoreのチームデータに保存される
3. `/risukerugg` コマンドがそのサーバー専用のギルドコマンドとして登録される

### 2-1. Bot招待フロー

```
[チーム設定 → Discord連携 → 「Botをサーバーに追加」ボタン]
    ↓
/api/discord/bot-invite-start (POST, operator認証)
    ↓
Discord OAuth2 URL生成
  scope: bot + applications.commands
  permissions: 必要最小限（チャンネルへのメッセージ送信のみ）
  redirect_uri: /api/discord/bot-invite-callback
    ↓
Discord認証画面（サーバー選択 → 権限確認 → 許可）
    ↓
/api/discord/bot-invite-callback (GET)
  ・guild_id を取得
  ・既に他チームが使用中の guild_id なら → エラー（1サーバー1チーム制約）
  ・Bot API でそのサーバーのチャンネル一覧を取得
  ・チーム設定画面にリダイレクトし、通知先チャンネルをドロップダウンで選択させる
  ・確定後 guildId + channelId を teams/{teamId}/discord/config に保存（Admin SDK）
  ・/api/discord/guild-commands に guildId を渡してギルドコマンド登録
  ・Sprint 1のWebhook URL設定は非表示に切り替え（Botが通知を担う）
```

### 2-2. ギルドコマンド登録エンドポイント

```
POST /api/discord/register-guild-commands
Body: { guildId: string }
```

Discord REST API `PUT /applications/{appId}/guilds/{guildId}/commands` を呼び出して `/risukerugg` をギルド専用コマンドとして登録する。

**グローバルコマンドは使用しない。**

### 2-3. Discord OAuth2スコープ（Bot招待用）

```
scope: bot applications.commands
bot permissions:
  - Send Messages        (チャンネルへの投稿)
  - Embed Links          (Embed形式の投稿)
  - Use Slash Commands   (スラッシュコマンド応答)
```

個人ユーザー情報は取得しない（`identify` スコープ不要）。

### 2-4. Firestoreへの書き込み

```typescript
// teams/{teamId}/discord/config に追記
{
  guildId: string;   // Discord サーバーID（guild_id）
}
```

### 2-5. Bot招待状態のUI表示

チーム設定のDiscordセクションに状態表示を追加：

| 状態 | 表示 |
|------|------|
| 未招待 | 「Botをサーバーに追加」ボタン |
| 招待済み | 「Botは接続済みです」 + サーバーID表示 + 「解除」ボタン |

### 2-6. 新規APIエンドポイント

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/api/discord/bot-invite-start` | POST | Bot招待OAuth2 URL生成（operator認証必須） |
| `/api/discord/bot-invite-callback` | GET | OAuth2コールバック、guildId保存、ギルドコマンド登録 |
| `/api/discord/register-guild-commands` | POST | 指定guildIdにコマンド登録（内部呼び出しのみ） |

### 2-7. 既存のグローバルコマンド登録スクリプト

`scripts/register-discord-commands.mjs` は削除する（ギルドコマンドへ移行したため不要）。

---

## Sprint 3: `/risukerugg` AIボット（guild_id起点）

### spec.mdからの変更点

| 変更項目 | 旧 | 新 |
|---------|----|----|
| チーム特定方法 | `discordUserId` → `users/{uid}.currentTeamId` | `guild_id` → `teams/{teamId}/discord/config.guildId` |
| セッション管理 | `discord_sessions/{discordUserId}` | `discord_sessions/{guildId}` |
| AIの返答形式 | ephemeral（本人のみ） | 通常投稿（全員に見える） |
| Discord個人認証 | 必要（OAuth2連携済みを確認） | 不要 |
| discordUserId | セッションキー・ボタンcustom_idに使用 | 不使用 |

### 3-1. インタラクションペイロードのguild_id取得

```typescript
// InteractionSchema に guild_id を追加
const InteractionSchema = z.object({
  type: z.number(),
  guild_id: z.string().optional(),   // ← 追加
  id: z.string().optional(),
  token: z.string().optional(),
  application_id: z.string().optional(),
  data: z.object({ ... }).optional(),
  member: z.object({ ... }).optional(),
  user: z.object({ ... }).optional(),
});
```

DMから実行された場合（`guild_id` が undefined）は「サーバー内で実行してください」と返して終了。

### 3-2. チーム特定ロジック（新設計）

```typescript
// guild_id → teamId を解決
const teamsSnap = await db
  .collectionGroup('discord')   // サブコレクション横断クエリ
  .where('guildId', '==', guildId)
  .limit(1)
  .get();

if (teamsSnap.empty) {
  // このサーバーはRisukeruGGと未連携
  return sendResponse('このDiscordサーバーはRisukeruGGと連携されていません。\nチーム設定からBotを招待してください。');
}

const teamId = teamsSnap.docs[0]!.ref.parent.parent!.id;
```

### 3-3. セッション管理（guildId軸）

```typescript
// discord_sessions/{guildId}（コレクション名は維持、キーを変更）
interface DiscordSession {
  guildId: string;          // Discordサーバー（guild）ID
  teamId: string;           // 対応するRisukeruGGチームID
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  pendingProposal?: Record<string, unknown>;
  updatedAt: Date;          // 30分無操作でリセット
}
```

セッションはチームサーバー単位で管理する。「誰が話しているか」は記録しない。

### 3-4. AIの返答（通常投稿）

```typescript
// flags: 64 を削除 → 全員に見える通常投稿
return Response.json({
  type: 5,   // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
  data: {},  // flagsなし = 通常投稿
});

// Follow-up も flags なし
await fetch(`https://discord.com/api/webhooks/${appId}/${token}/messages/@original`, {
  method: 'PATCH',
  body: JSON.stringify({ content: aiReply }),  // flags 削除
});
```

### 3-5. ボタンcustom_idの変更

旧: `confirm:{discordUserId}` / `revise:{discordUserId}` / `cancel:{discordUserId}`  
新: `confirm:{guildId}` / `revise:{guildId}` / `cancel:{guildId}`

ボタンをクリックした際も `guild_id` でセッションを取得する。

### 3-6. 削除するコード・データ

| 削除対象 | 理由 |
|---------|------|
| `src/components/settings/DiscordConnectSection.tsx` | OAuth個人連携UI不要 |
| `src/app/api/discord/link-start/route.ts` | OAuth個人連携API不要 |
| `src/app/api/discord/callback/route.ts` | OAuth個人連携API不要 |
| `users/{uid}.discord` フィールド | 個人連携データ不要 |
| `discord_link_requests` コレクション | OAuth個人連携不要 |
| `DiscordSession.discordUserId` | discordUserId不要 |
| `DiscordSession.risukeruUserId` | 個人特定不要 |
| セッションキー `discord_sessions/{discordUserId}` | `{guildId}` に変更 |

---

## 環境変数（最終）

```env
# Sprint 1（Webhook）: 追加不要

# Sprint 2（Bot招待）
DISCORD_CLIENT_ID=            # OAuth2 Application ID
DISCORD_CLIENT_SECRET=        # OAuth2 シークレット（Bot招待フロー用）

# Sprint 3（AIボット）
DISCORD_APPLICATION_ID=       # = DISCORD_CLIENT_ID と同値
DISCORD_PUBLIC_KEY=           # Interactions Endpoint 署名検証用
DISCORD_BOT_TOKEN=            # Bot Token（ギルドコマンド登録・Follow-up送信用）
NEXTAUTH_URL=                 # コールバックURL生成用（既存）
```

`NEXT_PUBLIC_DISCORD_CLIENT_ID` は削除（クライアント側でOAuth URLを生成しないため不要）。

---

## Firestoreルール変更

```
// discord_sessions は guildId キーに変更
// discord_link_requests コレクション削除
match /discord_sessions/{guildId} {
  allow read, write: if false;  // Admin SDK のみ
}

// discord_link_requests は削除（個人OAuth廃止）
```

---

## 受け入れ基準（再設計後）

### Sprint 1（既存spec.mdから変更なし、guildIdフィールド追加のみ）

既存 spec.md の Sprint 1 テスト項目（#1〜#6）をそのまま使用。

### Sprint 2: Bot招待フロー

| # | テスト | 合格条件 |
|---|--------|---------|
| S2-1 | チーム設定にBot招待ボタンが表示される（operatorのみ） | ボタンが存在、memberには非表示 |
| S2-2 | Bot招待フロー完了後に `guildId` がFirestoreに保存される | `teams/{teamId}/discord/config.guildId` に値が入る |
| S2-3 | 招待済み状態がUIに反映される | 「接続済み」表示に切り替わる |
| S2-4 | 招待後、対象サーバーに `/risukerugg` コマンドが登録される | Discord Developer Portal または API で確認 |
| S2-5 | 別のサーバーに同じコマンドが表示されない | グローバルコマンドが存在しないこと |

### Sprint 3: AIボット（guild_id起点）

| # | テスト | 合格条件 |
|---|--------|---------|
| S3-1 | PING疎通確認 | HTTP 200 + `{"type":1}` |
| S3-2 | 署名不正リクエストを拒否 | HTTP 401 |
| S3-3 | 未連携サーバーから `/risukerugg` を実行すると案内メッセージが返る | 連携手順が含まれる通常投稿 |
| S3-4 | `/risukerugg message:来週月曜に配信入れたい` でAI返答が全員に見える投稿で届く | ephemeralではない通常投稿 |
| S3-5 | 2ターン以上の会話で文脈が維持されている | guildIdのセッションに履歴が保存される |
| S3-6 | AIが `%%PROPOSAL%%` を返すと確認ボタン付きメッセージが表示される | [✅ 登録する] ボタンが表示される |
| S3-7 | [✅ 登録する] クリック後、Firestoreにスケジュールが登録される | ドキュメントが存在する |
| S3-8 | [✅ 登録する] クリック後、Firestoreにタスクが登録される | ドキュメントが存在する |
| S3-9 | [✅ 登録する] クリック後、Firestoreにコラボが登録される | ドキュメントが存在する |
| S3-10 | [❌ キャンセル] クリックでguildIdのセッションが削除される | Firestoreのセッションが消える |
| S3-11 | `/risukerugg message:リセット` でセッションがリセットされる | 「会話をリセットしたよ」メッセージが返る |

---

## 既存spec.mdとの対応

| spec.md Sprint | plan.md Sprint | 状態 |
|---------------|---------------|------|
| Sprint 1: Webhook通知 | Sprint 1 | guildIdフィールド追加のみで内容は維持 |
| Sprint 2: OAuth2個人連携 | **廃止** | 個人特定不要のため全削除 |
| Sprint 3: AIボット | Sprint 3 | guild_id起点に再設計 |
| （新規） | Sprint 2: Bot招待フロー | 新規追加 |
