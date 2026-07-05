# schedule model

## モデル方針

ScheduleEntry はチーム単位の予定情報を表す正本モデルである。

このカテゴリでは、スケジュールの表示・編集・同期に直接関係する項目だけを正本化する。チームロールと所属は team、タスク進捗の詳細は task、認証情報の取得元は user / platform を参照する。

## ScheduleEntry

Firestore コレクション配置: `teams/{teamId}/schedules/{scheduleId}`

| フィールド       | 型 / 例                               | 意味 |
| ---------------- | ------------------------------------- | ---- |
| `id`             | string                                | Firestore ドキュメント ID |
| `title`          | string                                | 予定タイトル |
| `categoryId`     | string \| null                        | カテゴリ ID。未分類なら `null`。タスクと共通の Category を参照する（正本は [task/model.md](../task/model.md) の Category） |
| `startAt`        | timestamp                             | 開始日時 |
| `endAt`          | timestamp                             | 終了日時 |
| `allDay`         | boolean                               | 終日予定かどうか |
| `platform`       | YouTube / Twitch / 両方               | 配信プラットフォーム |
| `description`    | string                                | 詳細説明。閲覧時は Markdown 表示対象 |
| `participantIds` | string[]                              | 関連メンバーの UID 一覧 |
| `version`        | number                                | 楽観的ロック用の更新番号 |

## 制約

- `allDay: true` の場合、Google カレンダー仕様に準拠し「開始日の 00:00:00 〜 最終日翌日の 00:00:00」で保存する（終了は排他的境界。終了時刻ちょうどはイベントに含まれない）
- 旧仕様データ（`startAt == endAt` の終日予定）は読み取り時に開始日1日分として解釈する（後方互換）
- 開始日時入力時に終了日時が未設定の場合、UI は 2 時間後を仮設定として補完する
- `version` は競合検知のため更新時に利用する
- カレンダー表示上の週始まりは日曜だが、これは保存値ではなく表示ルールである
- 既存スケジュールを参照した複製新規作成は保存項目を増やさず、`id` と `version` は新規スケジュールとして生成する

## 関連する隣接モデル

### team 側で管理するもの

- 操作権限の根拠となる `operator` / `member` / `rom`
- `participantIds` が参照するメンバー所属

### task 側で管理するもの

- 動画投稿予定に紐付くタスク進捗の意味づけ
- タスク詳細や完了判定のルール
- `categoryId` が参照する Category（タスク・スケジュール共通カテゴリ）の定義・追加・編集・削除

### collab 側で管理するもの

- 確定済みコラボから生成されるスケジュールとの関係
- 再調整時のスケジュール削除条件

## 今後詳細化する項目

- Google カレンダー同期に必要な外部 ID やメタデータ
- コラボ由来のスケジュール関連フィールド
- 動画投稿予定におけるタスク進捗保持方法
