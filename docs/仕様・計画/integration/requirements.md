# integration requirements

## 権限・設定画面

- **IN-001**: Discord 連携の設定 UI は `/integrations/discord` に配置し、メンバーのみ設定セクションを表示・操作できる。関連 API（設定取得・保存・招待開始・解除・チャンネル一覧取得・通知チャンネル変更）はすべて Firebase ID トークンで認証し、対象チームのメンバー（ロール）であることをサーバーサイドで検証する
- **IN-002**: Discord 通知設定はチームのメインドキュメントではなくサブコレクション `teams/{teamId}/discord/config` に保存し、Firestore ルールでメンバーのみ読み書き可能に制限する（Webhook URL をスタッフから隠すため）

## 通知配送

- **IN-003**: 通知タイミングは 4 トグル（タスク作成時 / タスク変更時 / コラボ調整作成時 / コラボ調整への回答時）で個別に ON/OFF できる。トグル未設定（旧スキーマ・新規チーム）はデフォルト有効（opt-out）とし、明示的に `false` の場合のみ送信しない
  - **IN-003-1**: タスク作成通知は Firestore トリガーで送信する。ただし Discord Bot（`/risukerugg`）経由の作成は二重通知を避けるためスキップする
  - **IN-003-2**: タスク変更通知は主要フィールド（タイトル / ステータス / 担当 / 締切）の変更時のみ送信する
  - **IN-003-3**: スケジュール作成・開始前リマインダーの Discord 通知は提供しない（アプリ内通知は notification カテゴリの仕様どおり維持する）
- **IN-004**: 通知は Discord Embed 形式で送信する。送信は共通ヘルパー `notifyDiscord` に集約し、`channelId` 設定済みの場合は Bot API（`POST /channels/{channelId}/messages`）で送信し、未設定かつ `webhookUrl` 設定済みの場合は Webhook へフォールバックする（旧 Webhook 方式との後方互換）。Embed は送信が確定した後に遅延生成し、未連携・通知 OFF のチームで余分な Firestore 読み取りを行わない
- **IN-005**: Discord 送信の失敗はログに記録するのみとし、タスク・コラボ処理本体を失敗させない

## Bot 招待フロー

- **IN-006**: メンバーは設定画面の「Botをサーバーに追加」から Discord OAuth2（scope: `bot applications.commands`）で Bot をサーバーへ招待できる
- **IN-007**: 招待フローは CSRF 保護として nonce（`crypto.randomUUID()`）を発行し、`discord_bot_invite_requests/{nonce}` に有効期限 10 分で保存して OAuth の `state` と照合する
- **IN-008**: 1 つの Discord サーバー（guildId）は 1 チームにのみリンクできる。既に他チームが使用中のサーバーへの招待はエラー（`already-linked`）としてブロックする
- **IN-009**: 招待完了後、Bot トークンで取得したチャンネル一覧を `discord_bot_invite_pending/{nonce}` に一時保存し、設定画面で通知チャンネルを選択・保存させる。保存時に `guildId` / `channelId` / 表示用の `channelName` を `teams/{teamId}/discord/config` へ書き込む
- **IN-009-1**: 接続済みチームのメンバーは、Bot 招待フローをやり直さずに設定画面から通知チャンネルを変更できる。チャンネル一覧は Bot トークンで都度取得（`GET /api/discord/guild-channels`）し、変更（`POST /api/discord/update-channel`）時は指定 `channelId` が実在するテキストチャンネルであることをサーバーサイドで照合してから `channelId` / `channelName` を更新する。`channelName` が未保存の旧データは接続済み表示で `channelId` にフォールバックする
- **IN-010**: チャンネル保存時に `/risukerugg` をそのサーバー専用のギルドコマンドとして登録する。グローバルコマンドは使用しない（無関係サーバーへの表示防止）
- **IN-011**: Bot の kick は自動検知しない。接続解除は設定画面の「登録を解除する」による手動操作のみとし、破壊的操作のため実行前に確認を挟む。解除時は Discord 側も一括クリーンアップする: ギルドコマンド削除 → Bot 退出 → AI セッション（`discord_sessions/{guildId}`）削除 → `teams/{teamId}/discord/config` 削除。Discord API 呼び出しは best-effort とし、失敗しても解除処理本体は完了させる（Bot が手動削除済みのサーバーでも解除できる）

## `/risukerugg` AI ボット

- **IN-012**: Discord Interactions Endpoint はすべてのリクエストに対し Ed25519 署名検証を行い、不正な署名は HTTP 401 で拒否する。PING には pong（`{"type":1}`）を返す
- **IN-013**: AI 処理は Discord の 3 秒制限を回避するため Deferred Response を即時返却し、バックグラウンドで実行する。応答はすべて通常投稿（チャンネル全員に見える。ephemeral は使用しない）
- **IN-014**: `/risukerugg` は Discord サーバー内でのみ使用可能とし、DM からの実行には案内メッセージを返す
- **IN-015**: チームの特定は guildId → `teams/{teamId}/discord/config` の照合（コレクショングループクエリ）で行う。個人 Discord ユーザーの RisukeruGG アカウントへのログイン連携は行わない。未連携サーバーからの実行には連携手順への案内を返す
  - **IN-015-1**（2026-09 改定）: 担当者へのメンション用に、メンバーが登録した Discord ユーザー名（team TE-012 の `discordUsername`）を送信時に Discord ユーザー ID へ解決する。解決は Bot トークンによる Search Guild Members API（`GET /guilds/{guildId}/members/search?query=`。特権 Intent 不要）で行い、ユーザー名が**完全一致**するメンバーのみ採用する（前方一致の候補は使わない）
  - **IN-015-2**: 解決した ID は `teams/{teamId}/members/{uid}.discordUserId` にキャッシュし、以後は検索を省く。キャッシュ済みならそれを使い、解決できなければ表示名の文字列を本文に用いる（通知は飛ばないが送信は成立させる）
  - **IN-015-3**: ボタン等の Discord 側操作について「誰が押したか」は記録しない。サーバーに居ることを信頼境界とする（`/risukerugg` と同じ考え方）
- **IN-016**: 会話セッションは Discord サーバー単位（`discord_sessions/{guildId}`）で全メンバー共有とし、30 分無操作で自動リセットする。会話履歴は最大 20 件に制限する。`message` に「リセット」（または `reset`）を送るとセッションを手動リセットできる
- **IN-017**: プロンプトインジェクション対策として、`%%PROPOSAL%%` マーカーを含むユーザーメッセージは処理を拒否し、メッセージ長は 2,000 文字に制限する
- **IN-018**: AI が提案（`%%PROPOSAL%%`）を返した場合、Embed とボタン（登録する / 修正する / キャンセル）付きメッセージを表示する。ボタンの `custom_id` は `{action}:{guildId}` 形式とする。`task_update` 提案の Embed には対象タスクの現在値と比較した変更前 → 変更後の差分を表示する
- **IN-019**: 「登録する」「修正する」は提案を発行させた Discord ユーザー本人のみ操作できる（`initiatorDiscordUserId` と照合）。「キャンセル」は誰でも操作できる
- **IN-030**（2026-09 追加）: `/risukerugg` は `message`（任意）と `preset`（任意・オートコンプリート）の 2 オプションを持つ。`preset` はチームの定型指示（ai AI-023）を候補として出し、選ばれた本文を `message` の前に置いて AI へ送る。オートコンプリート（Interaction type 4）は guildId からチームを解決して `teams/{teamId}/ai/settings.presets` を最大 25 件返し、失敗時は空配列を返す。両方とも空の実行には使い方を案内する。チームの追加指示（AI-022）は Discord 側でもシステムプロンプトに注入する。コマンド定義の変更は通知チャンネル保存時の再登録（IN-010）で反映されるため、既存サーバーは通知チャンネルの保存し直し、または Bot 再招待で更新する
- **IN-020**: 登録確定時は保存済み提案データを Zod スキーマで全件再検証してから（1 件でも無効なら全件拒否）、Admin SDK でスケジュール・タスク・コラボの登録およびタスクの部分更新（`task_update`）を全件実行し、完了後にセッションを削除する。「修正する」は確認待ち提案のみ破棄し、会話履歴は保持する

## タスク管理 v2（ブリーフ）との連携（2026-09 追加）

- **IN-023**: ブリーフ連携の設定は `teams/{teamId}/discord/config` に `briefThreadsEnabled`（既定 true）/ `briefChannelId` / `briefChannelName`（スレッドの親チャンネル。未設定は `channelId`）/ `digestEnabled`（既定 true）/ `digestChannelId` / `digestChannelName`（未設定は `channelId`）/ `digestTime`（`HH:00`、JST、既定 `09:00`）として保持する。メンバーが `/integrations/discord` の「タスク管理 v2（ブリーフ）」から設定し、更新 API（`POST /api/discord/update-brief-settings`）はチャンネル ID を Bot トークンで取得した実チャンネル一覧と照合する
- **IN-024**: ブリーフ作成時（Firestore トリガー）に、親チャンネルへ**公開スレッド**（名前 = ブリーフのタイトル、7 日で自動アーカイブ）を作り、先頭に**要約メッセージ**（タイトル・状態・公開予定日・進捗・工程ごとの状態/担当/締切/超過/入力待ち・Web の URL）を投稿して `Brief.discord = { threadId, summaryMessageId, channelId }` に記録する。以後、ブリーフのタイトル・公開予定日・状態、工程の状態・担当・締切・タイトルが変わるたびに Bot が同じメッセージを編集する。Discord はスレッドの入れ子を持たないため、工程ごとのスレッドは作らない
- **IN-025**: 工程が `ready` になったとき、スレッドへ**着手可能通知**を投稿する。本文は「【工程名】@担当 着手できます。締切 M/D」に必要情報の未入力一覧を添え、ボタンは **完了**（`step_done:{teamId}:{briefId}:{stepId}`）/ **着手**（`step_start:...`）/ **Web で開く**（リンク）。二重投稿を避けるため、投稿前にトランザクションで `Step.discordMessageId` を予約する。担当者のメンションは IN-015-1 の解決を使い、未解決なら表示名に「個人設定で Discord ユーザー名を登録するとメンションで届きます」を添える
  - **IN-025-1**: ボタンはサーバーの誰でも押せる。Interactions Endpoint は `custom_id` の teamId とサーバーの guildId が連携済みであることを確認してから、操作層（`changeStepStatus`）を Discord 由来（`actorId: null`、role なし、`source: discord`）で実行する。誰が押したかは記録しない（IN-015-3）
  - **IN-025-2**: 成功時は元メッセージを即時に書き換え（完了はボタンなし、着手は完了ボタンのみ残す）、要約の更新と後続工程の通知は Firestore トリガーが行う。遷移できない場合（待機中の工程を完了にする等）は理由をフォローアップで返す
  - **IN-025-3**: 工程が `done` / `skipped` になったら通知メッセージを書き換えてボタンを外す
- **IN-026**: Bot 招待の権限は `VIEW_CHANNEL + SEND_MESSAGES + READ_MESSAGE_HISTORY + CREATE_PUBLIC_THREADS + SEND_MESSAGES_IN_THREADS`（`309237713920`）とする。旧権限（`2048`）で招待済みのサーバーは「Botをサーバーに追加」の再実行で権限を更新する。設定画面にその旨を案内する
- **IN-027**: **朝ダイジェスト**は Cloud Scheduler（毎時 0 分、JST）で起動し、チームの `digestTime` の時と一致するチームだけに 1 日 1 回送る。内容は「今日が締切 / 締切を過ぎています（超過日数付き） / 担当が決まっていません / 入力待ち（未入力項目付き） / 昨日からの変更（新規ブリーフ・公開日変更・完了数・担当変更数）」で、該当なしの節は省略し、すべて該当なしなら投稿しない。対象は `planning` / `in_progress` のブリーフの `ready` / `in_progress` の工程
- **IN-028**: **締切前リマインド**はダイジェストと同時刻に、`daysUntilDue === Step.reminderDaysBefore` の未完了工程について担当者へメンションで送る。送信先はブリーフのスレッド（未作成ならダイジェストの送信先）。担当未定は「担当未定」と表示する（メンバーへのメンションは行わない）
- **IN-029**: ブリーフ関連の投稿はスレッド・ダイジェスト先で完結させ、既存の通知チャンネル向けトグル（IN-003）には影響しない。Discord への送信失敗はログのみで、ブリーフ・工程の処理本体を失敗させない（IN-005 と同じ）

## セキュリティ・運用条件

- **IN-021**: `discord_sessions` / `discord_bot_invite_requests` / `discord_bot_invite_pending` はいずれも Admin SDK（サーバーサイド）専用とし、Firestore ルールでクライアントからのアクセスを全面禁止する
- **IN-022**: Discord 関連シークレットは環境変数（`DISCORD_CLIENT_ID` / `DISCORD_BOT_TOKEN` / `DISCORD_APPLICATION_ID` / `DISCORD_PUBLIC_KEY`）で管理する。AI 応答には `ANTHROPIC_API_KEY` が必要で、未設定時は明示的な案内メッセージを返す
