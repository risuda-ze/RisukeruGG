# リサーチ: Discord連携

**Date**: 2026-05-28

## Sprint 1: Discord Webhook通知

### Discord Incoming Webhook

Discord Incoming Webhookは最もシンプルなDiscord連携方法。

- チャンネルごとにユニークなURL（例: `https://discord.com/api/webhooks/{id}/{token}`）
- Bot不要・OAuth2不要
- Cloud FunctionsからHTTPのPOSTで送信可能
- 標準 `fetch` のみで実装できる（追加ライブラリ不要）

### Embed形式

```typescript
// POST body
{
  embeds: [{
    title: "📅 スケジュールが追加されました",
    color: 0x5865F2,  // Discord blurple
    fields: [
      { name: "タイトル", value: schedule.title },
      { name: "日時", value: "2026/06/01 20:00 〜 22:00" },
      { name: "参加者", value: "ユーザーA、ユーザーB" },
    ],
    timestamp: new Date().toISOString(),
  }]
}
```

### Cloud Functions での fetch

Firebase Functions v2 はNode.js 18+なので `fetch` がグローバルに使用可能。  
追加ライブラリ不要。

### エラーハンドリング方針

Webhook送信が失敗してもスケジュール作成・通知本体を失敗させない。  
`try/catch` でラップし、失敗はログに記録するのみ。

```typescript
try {
  await sendDiscordWebhook(webhookUrl, embed);
} catch (e) {
  logger.warn('Discord Webhook送信失敗', e);
  // スケジュール作成は成功させる
}
```

---

## Sprint 3: Discord Bot 実装方式の調査

### Discord Interactions Endpoint（推奨）

Discordはスラッシュコマンドの処理方法として2つを提供する：

1. **Webhook方式（Interactions Endpoint URL）** ← 今回採用
   - BotがHTTPサーバーとして動作し、DiscordがPOSTを送ってくる
   - Next.js API RouteとしてそのままホストできるためVercel/Firebase等のサーバーレスと相性◎
   - WebSocketコネクション不要→Botプロセスの常時起動が不要

2. **Gateway方式（WebSocket）**
   - discord.js が使うオーソドックスな方式
   - 常時接続が必要→Next.jsのAPIルートには不向き

### 使用ライブラリ

```
discord-interactions  v3.x
```

- 軽量（~10KB）
- PING/PONG、署名検証、コマンドルーティングをサポート
- discord.js（200KB+）より大幅に軽量でAPIルート向き

### Discordモーダル仕様

- コンポーネントタイプ: `MODAL` (type 9)
- テキスト入力のみサポート（セレクト、日付ピッカーは不可）
- 最大5フィールド
- `custom_id` でモーダルを識別
- モーダルSubmitは `MODAL_SUBMIT` (type 5) として届く

### Discord OAuth2 スコープ

コラボ登録に必要なスコープ：
```
identify   # Discord User ID とユーザー名の取得のみ
```

`bot` スコープは Interactions Endpoint 方式では不要（サーバー参加なしでSlashコマンドが使える）。

### スラッシュコマンド登録

グローバルコマンドは登録後1時間で全サーバーに反映。  
開発中はギルドコマンド（即時反映）を使う。

登録方法：
```bash
# Node.jsスクリプトで一度だけ実行
node scripts/register-discord-commands.mjs
```

### Discord署名検証

Discord は Interactions Endpoint にリクエストを送る際に `X-Signature-Ed25519` と `X-Signature-Timestamp` ヘッダーを付与する。  
`discord-interactions` の `verifyKey()` で検証できる。

Next.js App Routerでは `request.text()` でbodyを文字列として取得する必要がある（`request.json()` でパースすると署名検証が失敗する）。

## Firestore セキュリティルール

Discord Interactionsは**サーバーサイド**（Next.js API Route = サービスアカウント）からFirestoreに書き込むため、  
クライアント側セキュリティルールは適用されない。  
Firebase Admin SDK を使用する。

既存の `src/lib/firebase/client.ts` はクライアントSDKのため、Admin SDKを別途セットアップする必要がある。

```typescript
// src/lib/firebase/admin.ts
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
```

Firebase Admin SDK の認証情報は環境変数 `GOOGLE_APPLICATION_CREDENTIALS` または  
`FIREBASE_SERVICE_ACCOUNT_KEY`（JSON文字列）で管理する。

## 実装上の注意点

### Discord 3秒ルール

Discordは Interactions Endpoint に3秒以内のレスポンスを要求する。  
Firestore書き込みが3秒を超える可能性がある場合：

1. まず `DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE` (type 5) を即座に返す
2. バックグラウンドで処理を続行
3. Discord Webhook URLに `followup` でメッセージを送信

Firestore書き込みは通常100-500ms程度なので、通常は即時レスポンスで問題なし。

### 日付パース

Discordモーダルのテキスト入力から日付をパース。  
受け付ける形式: `YYYY-MM-DD HH:mm` または `YYYY/MM/DD HH:mm`

`date-fns` の `parse()` を使用（既存プロジェクトで使用中か確認要）。
