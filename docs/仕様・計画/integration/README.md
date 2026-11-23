# integration

外部サービス連携カテゴリの詳細仕様です。

このディレクトリを、Discord 連携（通知配送・Bot 招待・`/risukerugg` AI ボット）に関する唯一の詳細仕様として扱います。

## 対象範囲

- Discord 連携設定画面（`/integrations/discord`）
- チームごとの Discord 通知設定（`teams/{teamId}/discord/config`）
- スケジュール通知の Discord 配送（Bot API / Webhook フォールバック）
- Bot 招待フロー（OAuth2・CSRF 保護・チャンネル選択）
- ギルドコマンド登録と接続解除
- `/risukerugg` スラッシュコマンドによる AI 会話・登録（Discord 側の受け口とセッション管理）

## 対象外

- Google カレンダー書き出し（schedule カテゴリを参照）
- AI のシステムプロンプト・提案フォーマットの定義（ai カテゴリを参照。Discord ボットは ai の共通ユーティリティを再利用する）
- アプリ内通知・プッシュ通知（notification カテゴリを参照）
- 通知のトリガーとなるスケジュール自体の定義（schedule を参照）

## 他カテゴリとの境界

### notification との境界

- integration はチーム単位の Discord チャンネルへの配送を扱う。ユーザー単位のアプリ内通知・プッシュ通知は notification を参照する

### ai との境界

- `/risukerugg` の AI 応答生成・`%%PROPOSAL%%` 解析は ai カテゴリの共通ユーティリティ（`src/lib/ai/`）を使用する。Discord 固有のセッション管理・Deferred Response・ボタン操作は integration が持つ

### team との境界

- Discord 設定の操作はメンバー（ロール）に限定する。ロール定義・チーム所属は team を参照する

### schedule / task / collab との境界

- Discord から登録されるエンティティの定義・制約は各カテゴリを参照する。integration は登録の受け口と配送のみを扱う

## 読む順番

1. この README: integration カテゴリが持つ責務と境界を把握する
2. [requirements.md](./requirements.md): Discord 連携の規範要件を確認する
3. [model.md](./model.md): 連携設定・セッションデータの保持方針を確認する
4. [flows.md](./flows.md): Bot 招待、通知配送、AI ボット会話の流れを確認する

## 採用する後続仕様

- 現時点で integration カテゴリ固有の後続仕様分割はない
- 後続仕様が追加されるまでは、このディレクトリ内の最新記述を正とする
