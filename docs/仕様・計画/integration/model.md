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
| `channelId`         | string（任意）   | Bot 通知先チャンネル ID。Bot 招待完了後に書き込む。連携後も変更可能（IN-009-1） |
| `channelName`       | string（任意）   | 通知先チャンネル名（表示用）。チャンネル保存・変更時に書き込む。旧データには存在しない場合がある |
| `notifyOnTaskCreate`     | boolean     | タスク作成時に通知するか（Discord Bot 経由の作成は除く） |
| `notifyOnTaskUpdate`     | boolean     | タスク変更時に通知するか（主要フィールドの変更のみ） |
| `notifyOnCollabCreate`   | boolean     | コラボ調整の作成時に通知するか |
| `notifyOnCollabResponse` | boolean     | コラボ調整への回答時に通知するか |

| `briefThreadsEnabled` | boolean（任意） | ブリーフごとにスレッドを立てるか（既定 true。IN-023） |
| `briefChannelId` / `briefChannelName` | string（任意） | スレッドの親チャンネル。未設定は `channelId` |
| `digestEnabled` | boolean（任意） | 朝ダイジェストを送るか（既定 true） |
| `digestChannelId` / `digestChannelName` | string（任意） | ダイジェストの送信先。未設定は `channelId` |
| `digestTime` | string（任意） | `HH:00`（JST）。既定 `09:00` |

トグルはいずれも未設定時デフォルト有効（opt-out）。明示的に `false` の場合のみ送信しない（IN-003）。

ブリーフ側の連携情報（`Brief.discord`・`Step.discordMessageId`）は production カテゴリの model を参照する。

## DiscordSession

Firestore コレクション配置: `discord_sessions/{guildId}`（ルートコレクション。キーは Discord サーバー ID）

`/risukerugg` AI ボットの会話セッション。サーバー単位で全メンバー共有。

| フィールド                | 型 / 例                                        | 意味 |
| ------------------------- | ---------------------------------------------- | ---- |
| `guildId`                 | string                                         | Discord サーバー ID（セッションキー） |
| `teamId`                  | string                                         | 対応する RisukeruGG チーム ID |
| `messages`                | Array<{ role: 'user' \| 'assistant'; content: string }> | Claude へ渡す会話履歴（最大 20 件） |
| `pendingProposals`        | Array\<object\>（任意）                        | 確認待ちの `%%PROPOSAL%%` データ。1 応答に複数ブロックがある場合は全件保持する |
| `initiatorDiscordUserId`  | string（任意）                                 | 提案を発行させた Discord ユーザー ID。登録・修正操作を本人に限定するためのバインドキー |
| `updatedAt`               | timestamp                                      | 最終更新日時。30 分無操作で自動リセット判定に使用 |

## 招待フロー一時データ

| コレクション | 内容 | 寿命 |
| --- | --- | --- |
| `discord_bot_invite_requests/{nonce}` | Bot 招待の CSRF 保護用ノンス。`teamId` と `expiresAt`（発行から 10 分）を保持 | 使い捨て。コールバック検証後に削除 |
| `discord_bot_invite_pending/{nonce}` | 招待完了後に取得したチャンネル一覧の一時保存。`teamId` / `guildId` / チャンネル一覧を保持 | チャンネル保存完了まで |

## 制約（アクセス制御）

- `teams/{teamId}/discord/{doc}` は Firestore ルールでメンバーのみ読み書き可（Webhook URL をスタッフから隠す）。Cloud Functions / API Route（Admin SDK）はルールをバイパスして読み取る
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

- ロール（メンバー / スタッフ）の定義と権限境界
