# schedule model

## モデル方針

ScheduleEntry はチーム単位の予定情報を表す正本モデルである。

このカテゴリでは、スケジュールの表示・編集・書き出しに直接関係する項目だけを正本化する。チームロールと所属は team、タスク進捗の詳細は task、認証情報の取得元は user / platform を参照する。

## ScheduleEntry

Firestore コレクション配置: `teams/{teamId}/schedules/{scheduleId}`

| フィールド       | 型 / 例                               | 意味 |
| ---------------- | ------------------------------------- | ---- |
| `id`             | string                                | Firestore ドキュメント ID |
| `title`          | string                                | 予定タイトル |
| `categoryId`     | string \| null                        | カテゴリ ID。未分類なら `null`。タスクと共通の Category を参照する（正本は [task/model.md](../task/model.md) の Category） |
| `startAt`        | timestamp                             | 開始日時 |
| `endAt`          | timestamp                             | 終了日時 |
| `allDay`         | boolean（任意）                       | 終日予定かどうか。未設定は `false` 扱い |
| `description`    | string                                | 詳細説明。閲覧時は Markdown 表示対象 |
| `participantIds` | string[]                              | 関連メンバーの UID 一覧 |
| `collabPartnerName` | string \| null                    | コラボ相手の表示名。コラボ確定で作ったスケジュールは `CollabSession.partnerName`、それ以外は `null`。Google カレンダー書き出しの説明欄に使う |
| `linkedTaskIds`  | string[]                              | 紐付くタスク ID の一覧。作成時は空配列で保存する |
| `createdBy` / `createdAt` / `updatedBy` / `updatedAt` | | 作成者・作成日時・最終更新者・最終更新日時。[team/model.md](../team/model.md) の共通フィールド |

## Google カレンダー書き出しの対応づけ

書き出し（SC-008 系）は ScheduleEntry に保存項目を追加しない。

- `users/{uid}.googleCalendarExports.{teamId}` に `calendarId` と `exportedAt` を保持する（正本は [user/model.md](../user/model.md)）
  - `calendarId`: 再書き出し時に同じ専用副カレンダーへ書き込むために使う（端末やブラウザが変わっても副カレンダーを重複して作らない）
  - `exportedAt`: スケジュール画面の最終書き出し日時の表示（SC-008-7）に使う。一度も書き出しが完了していない間は `null`
- 予定単位の対応は Google イベント側の `extendedProperties.private.risukeruScheduleId` に `scheduleId` を持たせて行う。Firestore に対応表は持たない

## 制約

- `allDay: true` の場合、Google カレンダー仕様に準拠し「開始日の 00:00:00 〜 最終日翌日の 00:00:00」で保存する（終了は排他的境界。終了時刻ちょうどはイベントに含まれない）。旧仕様（終了時刻を包含的に解釈）で保存された既存データは移行スクリプトで本仕様に一括移行済み（適用済みスクリプトは削除方針に従い除去。Git 履歴の `scripts/migrate-allday-schedule-encoding.mjs` を参照）
- 開始日時入力時に終了日時が未設定の場合、UI は 2 時間後を仮設定として補完する
- カレンダー表示上の週始まりは日曜だが、これは保存値ではなく表示ルールである
- 既存スケジュールを参照した複製新規作成は保存項目を増やさず、`id` と共通フィールドは新規スケジュールとして生成する

## 関連する隣接モデル

### team 側で管理するもの

- 操作権限の根拠となるロール（メンバー / スタッフ）と作成者の定義
- `participantIds` が参照するメンバー所属

### task 側で管理するもの

- 動画投稿予定に紐付くタスク進捗の意味づけ
- タスク詳細や完了判定のルール
- `categoryId` が参照する Category（タスク・スケジュール共通カテゴリ）の定義・追加・編集・削除

### collab 側で管理するもの

- 確定済みコラボから生成されるスケジュールとの関係
- 再調整時のスケジュール削除条件

## 今後詳細化する項目

- コラボ由来のスケジュール関連フィールド
- 動画投稿予定におけるタスク進捗保持方法
