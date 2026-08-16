# integration flows

## Bot 招待フロー

1. `operator` が `/integrations/discord` で「Botをサーバーに追加」を押す
2. `POST /api/discord/bot-invite-start`（ID トークンで operator 認証）が nonce を発行し、`discord_bot_invite_requests/{nonce}`（期限 10 分）へ保存して Discord OAuth2 URL（scope: `bot applications.commands`、`state=nonce`）を返す
3. ユーザーが Discord 認証画面でサーバーを選択・許可する
4. `GET /api/discord/bot-invite-callback` が `state`（nonce）を検証して teamId を解決し、guildId の重複（他チーム使用中）をチェックする。使用中なら `?discord=error&reason=already-linked` で設定画面へ戻す
5. Bot トークンでチャンネル一覧を取得して `discord_bot_invite_pending/{nonce}` に一時保存し、`?discord=channel-select&nonce=...` で設定画面へリダイレクトする
6. 設定画面がチャンネル選択ドロップダウンを表示し、`operator` が通知チャンネルを選んで保存する
7. `POST /api/discord/save-guild-config`（operator 認証）が `guildId` / `channelId` / `channelName` を `teams/{teamId}/discord/config` へ保存し、`/risukerugg` をギルドコマンドとして登録する
8. 設定画面は「接続済み」表示（通知チャンネル名。旧データはチャンネル ID）に切り替わる

## 通知チャンネル変更フロー（接続済み）

1. `operator` が設定画面の接続済み表示で「通知チャンネルを変更する」を押す
2. `GET /api/discord/guild-channels`（operator 認証）が config の `guildId` を読み、Bot トークンで現在のテキストチャンネル一覧を取得して返す（Bot がサーバーから削除されている等で取得できない場合はエラー）
3. 設定画面がチャンネル選択ドロップダウン（現在の通知チャンネルを初期選択）を表示し、`operator` が新しいチャンネルを選んで保存する
4. `POST /api/discord/update-channel`（operator 認証）が指定 `channelId` を Bot トークンで取得した実チャンネル一覧と照合し、有効なら `channelId` / `channelName` を更新する
5. 設定画面の接続済み表示が新しいチャンネル名に切り替わる（Bot 招待のやり直しは不要）

## 通知配送フロー

1. タスク作成・変更（Firestore トリガー）またはコラボ調整の作成・回答（Cloud Functions）が発火する
2. 共通ヘルパー `notifyDiscord` が `teams/{teamId}/discord/config` を読み、該当トグル（`notifyOnTaskCreate` / `notifyOnTaskUpdate` / `notifyOnCollabCreate` / `notifyOnCollabResponse`）を確認する（未設定はデフォルト有効、`false` のみスキップ）
3. 送信が確定した後に Embed メッセージを遅延生成し、`channelId` 設定済みなら Bot API で、未設定かつ `webhookUrl` 設定済みなら Webhook で送信する
4. 送信失敗はログに記録するのみで、本体処理は成功させる
5. スケジュール作成・開始前リマインダーは Discord 通知の対象外（アプリ内通知のみ）

## `/risukerugg` AI 会話フロー

1. リンク済みサーバーでユーザーが `/risukerugg message:<テキスト>` を実行する
2. Interactions Endpoint が署名検証後、Deferred Response（通常投稿）を即時返却し、AI 処理をバックグラウンドで実行する
3. `message` が「リセット」の場合はセッションを削除して完了する
4. guildId から config を照合してチームを特定する。未連携なら連携手順の案内を返す
5. セッション（`discord_sessions/{guildId}`）を取得し、30 分超過またはチーム変更があればリセットする
6. チームデータ（メンバー・スケジュール・タスク・コラボ・タスク列）を Admin SDK で取得し、ai カテゴリ共通のシステムプロンプトで Claude haiku を呼び出す
7. 応答に `%%PROPOSAL%%` があれば、提案を**全件** `pendingProposals` として発行者 ID とともにセッションへ保存し、確認ボタン（登録する / 修正する / キャンセル）付きメッセージを送信する。なければテキストで返信しセッションを更新する

## 提案確定・修正・キャンセルフロー

1. ボタンクリックを Interactions Endpoint が受け取り、Deferred Update で応答してバックグラウンド処理する
2. 「登録する」「修正する」は発行者本人か検証する（本人以外は拒否メッセージ）
3. **登録する**: 保存済み提案を Zod で全件再検証し（1 件でも無効なら全件拒否）、種別に応じてスケジュール / タスク / コラボを**全件** Admin SDK で登録（表示名 → UID、列名 → 列 ID を解決）。全件分の完了メッセージを送りセッションを削除する
4. **修正する**: `pendingProposals` のみ破棄して会話履歴を保持し、修正点を尋ねるメッセージを返す。ユーザーは次の `/risukerugg` で修正指示を送る
5. **キャンセル**: セッションを削除し、キャンセルした旨を返す

## 接続解除フロー

1. `operator` が設定画面の「登録を解除する」を押し、確認ダイアログで実行を承認する
2. `POST /api/discord/disconnect-guild`（operator 認証）が Discord 側を一括クリーンアップする: ギルドコマンド削除 → Bot 退出 → `discord_sessions/{guildId}` 削除（いずれも best-effort。失敗しても続行）
3. 最後に `teams/{teamId}/discord/config` を削除する
4. 設定画面は未接続状態（Webhook 設定＋招待ボタン）に戻る
