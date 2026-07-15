# integration model

## モデル方針

Discord 連携のデータは、チーム単位の通知設定（サブコレクション）と、サーバーサイド専用のルートコレクション 3 つ（AI セッション・招待ノンス・チャンネル一覧一時保存）で構成する。

登録されるスケジュール・タスク・コラボ本体は各カテゴリの model を参照する。AI の提案データ構造（Proposal）は ai カテゴリの model を参照する。

## DiscordTeamConfig

Firestore コレクション配置: `teams/{teamId}/discord/config`（サブコレクション・単一ドキュメント）

| フィールド          | 型 / 例          | 意味 |
| ------------------- | ---------------- | ---- |
| `webhookUrl`        | string           | Discord Webhook URL。`channelId` 未設定時のフォールバック送信先 |
| `guildId`           | string（任意）   | リンク済み Discord サーバー ID。Bot 招待完了後に書き込む |
| `channelId`         | string（任意）   | Bot 通知先チャンネル ID。Bot 招待完了後に書き込む |
| `notifyOnCreate`    | boolean          | スケジュール作成時に通知するか |
| `notifyBefore1h`    | boolean          | 開始 1 時間前リマインダーを送るか |
| `notifyBefore15min` | boolean          | 開始 15 分前リマインダーを送るか |

## DiscordSession

Firestore コレクション配置: `discord_sessions/{guildId}`（ルートコレクション。キーは Discord サーバー ID）

`/risukerugg` AI ボットの会話セッション。サーバー単位で全メンバー共有。

| フィールド                | 型 / 例                                        | 意味 |
| ------------------------- | ---------------------------------------------- | ---- |
| `guildId`                 | string                                         | Discord サーバー ID（セッションキー） |
| `teamId`                  | string                                         | 対応する RisukeruGG チーム ID |
| `messages`                | Array<{ role: 'user' \| 'assistant'; content: string }> | Claude へ渡す会話履歴（最大 20 件） |
| `pendingProposal`         | object（任意）                                 | 確認待ちの `%%PROPOSAL%%` データ |
| `initiatorDiscordUserId`  | string（任意）                                 | 提案を発行させた Discord ユーザー ID。登録・修正操作を本人に限定するためのバインドキー |
| `updatedAt`               | timestamp                                      | 最終更新日時。30 分無操作で自動リセット判定に使用 |

## 招待フロー一時データ

| コレクション | 内容 | 寿命 |
| --- | --- | --- |
| `discord_bot_invite_requests/{nonce}` | Bot 招待の CSRF 保護用ノンス。`teamId` と `expiresAt`（発行から 10 分）を保持 | 使い捨て。コールバック検証後に削除 |
| `discord_bot_invite_pending/{nonce}` | 招待完了後に取得したチャンネル一覧の一時保存。`teamId` / `guildId` / チャンネル一覧を保持 | チャンネル保存完了まで |

## 制約（アクセス制御）

- `teams/{teamId}/discord/{doc}` は Firestore ルールで `operator` のみ読み書き可（Webhook URL を一般メンバーから隠す）。Cloud Functions / API Route（Admin SDK）はルールをバイパスして読み取る
- `discord_sessions` / `discord_bot_invite_requests` / `discord_bot_invite_pending` はルールで `allow read, write: if false`（Admin SDK 専用。クライアント不可）
- 同一 `guildId` を複数チームの config が持つことは禁止（1 サーバー 1 チーム。招待時に重複チェック）

## 関連する隣接モデル

### schedule / task / collab 側で管理するもの

- Discord から登録される ScheduleEntry / Task / CollabSession の定義
- 通知トリガーとなるスケジュールの開始日時

### ai 側で管理するもの

- `%%PROPOSAL%%` の提案データ構造（Proposal）と解析ルール
- システムプロンプトの対応範囲・フォーマット定義

### team 側で管理するもの

- `operator` ロールの定義と権限境界
