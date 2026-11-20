# 動画依頼用Discordワーカー

リスケるGGと同じリポジトリで管理し、チームごとに1プロセスを常時起動する。Webサーバーとは別に動く。ほかの用途のBotは不要。

1. WebとFunctions、Firestoreルール・索引を同じFirebaseプロジェクトに反映する。「カテゴリ設定 → 動画依頼の設定」で列とサムネの有無を保存する。
2. このディレクトリで `npm ci` を実行する。ローカルの `.env` に下表の設定を用意する。
3. 旧Botで動作中の動画依頼同期を停止してから `npm start` を実行する。既存依頼のボタン・スレッドを引き継ぐ場合は同じDiscordアプリを使用する。
4. Discordで対象チャンネルの閲覧・公開スレッド作成・スレッドへの送信・履歴閲覧を許可する。画像読み取りに使うMessage Content Intentを有効にする。テストチャンネルで作成から納品・承認まで確認する。

| 設定 | 用途 |
|---|---|
| `DISCORD_TOKEN`、`GUILD_ID` | Bot認証と対象サーバー |
| `RISUKERU_TEAM_ID` | 対象のリスケるGGチーム |
| `SOURCE_CHANNEL_ID`、`EDITOR_CHANNEL_MAP` | 編集依頼の既定チャンネル、任意の編集者ID別チャンネル対応表（JSON） |
| `TARGET_CHANNEL_ID`、`THUMBNAIL_MENTION_IDS_LONG`、`THUMBNAIL_MENTION_IDS_SHORT` | サムネ依頼チャンネルと形式別の担当者ID（複数はカンマ区切り） |
| `RISUKERU_USE_EMULATOR=true` | テスト用。必要なら `RISUKERU_FIREBASE_PROJECT_ID` と `FIRESTORE_EMULATOR_HOST` を指定する |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | 本番接続に使うサービスアカウントJSON。本番ではエミュレーター指定を外す |

ワーカー停止中は未処理依頼が待機する。Firestoreの制作状態とDiscordの送信状態は別々に確認する。処理中断で `creating` / `sending` が残った場合や失敗時は、DBと実際のスレッドを照合してから再処理する。
