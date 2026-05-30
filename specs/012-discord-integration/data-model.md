# データモデル: Discord連携

**Date**: 2026-05-28 (更新: 2026-05-30 — C1対応: サブコレクション方式に統一)

## Firestoreスキーマ

### `teams/{teamId}/discord/config` — 新規サブコレクション ✅ C1

Discord通知設定はメインの `teams/{teamId}` ドキュメントではなく、**サブコレクション**として保存する。
これにより Firestoreルールで operator のみに読み書きを制限できる。

```typescript
// src/types/entities.ts に追加（Team インターフェースとは独立）
export interface DiscordTeamConfig {
  webhookUrl: string;
  notifyOnCreate: boolean;    // スケジュール作成時に通知
  notifyBefore1h: boolean;    // 1時間前リマインダー
  notifyBefore15min: boolean; // 15分前リマインダー
}
```

Firestoreパス: `teams/{teamId}/discord/config`（ドキュメントIDは固定で `config`）

### `users/{uid}` — フィールド追加

```typescript
// src/types/entities.ts の User インターフェースに追加
discord?: {
  userId: string;       // Discord Snowflake ID
  username: string;     // Discord ユーザー名（表示用）
  connectedAt: Date;
} | null;
```

### `discord_link_requests/{nonce}` — 新規コレクション ✅ H2/H4

OAuth2 CSRF保護 + ユーザーID解決のための一時的なリクエスト記録。

```typescript
interface DiscordLinkRequest {
  uid: string;       // RisukeruGG Firebase UID
  expiresAt: Date;   // 生成から10分後に期限切れ
}
```

- nonce は `crypto.randomUUID()` で生成
- コールバック処理後に即座に削除（使い捨て）
- Firestoreルール: Cloud Functions / Admin SDK のみアクセス可能（`allow read, write: if false`）

### `discord_sessions/{discordUserId}` — 新規コレクション

AI会話ボットのセッション管理（Sprint 3）。

```typescript
interface DiscordSession {
  discordUserId: string;
  risukeruUserId: string;  // 紐付けられた RisukeruGG UID
  teamId: string;          // currentTeamId を使用（複数チーム所属の場合も）
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  pendingProposal?: Record<string, unknown>;  // 確認待ちの %%PROPOSAL%% データ
  updatedAt: Date;  // 30分無操作でセッション自動リセット（実装側で判定）
}
```

Firestoreルール: `allow read, write: if false`（Admin SDK / Next.js API Route のみアクセス）

## 新規APIエンドポイント

### `/api/discord/link-start` (POST)

Discord OAuth2 開始エンドポイント。

- **認証**: Firebase Auth セッションクッキー（ログイン済みユーザーのみ）
- **処理**: nonce 生成 → `discord_link_requests/{nonce}` に保存 → Discord OAuth2 URL を返却
- **Response**: `{ authUrl: string }`

### `/api/discord/callback` (GET)

Discord OAuth2 コールバック。

- **クエリパラメータ**: `code`, `state`（state = nonce）
- **処理**:
  1. `discord_link_requests/{state}` から uid 取得（なければ 400）
  2. 期限切れチェック（expiresAt < now なら 400）
  3. Discord API でトークン交換 → `/users/@me` でユーザー情報取得
  4. `users/{uid}.discord` を更新（Admin SDK）
  5. `discord_link_requests/{state}` を削除
  6. `/settings?discord=connected` にリダイレクト

### `/api/discord/interactions` (POST)

Discord Interactions Endpoint（Sprint 3）。

- **認証**: `X-Signature-Ed25519` ヘッダーによる署名検証（Public Key）
- **リクエスト**: Discord Interaction オブジェクト（Zod バリデーション必須）
- **レスポンス**: InteractionResponse オブジェクト

## スクリプト

### `scripts/register-discord-commands.mjs`

開発・デプロイ時に一度だけ実行するスラッシュコマンド登録スクリプト。
環境変数 `DISCORD_APPLICATION_ID` と `DISCORD_BOT_TOKEN` が必要。

登録コマンド:
- `/risukerugg` — `message` (string, required) オプション付き
