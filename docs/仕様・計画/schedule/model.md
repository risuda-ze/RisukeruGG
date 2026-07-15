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

## MemberCalendarEvent

Firestore コレクション配置: `teams/{teamId}/memberCalendars/{userId}/events/{eventId}`

各メンバーの Google カレンダー予定をチーム内で相互閲覧するためのミラーモデル。`ScheduleEntry`（チーム共有の予定）とは別物で、各メンバー個人の外部カレンダー予定を写したもの。ログイン時・チーム切り替え時に本人が書き込み、他メンバーは閲覧のみ行う。

| フィールド        | 型 / 例                   | 意味 |
| ----------------- | ------------------------- | ---- |
| `id`              | string                    | Firestore ドキュメント ID |
| `teamId`          | string                    | 所属チーム ID（コレクショングループ購読時の認可・絞り込みに使用） |
| `title`           | string / `{名前} の予定`  | 表示名。プライバシー配慮のため元イベント名ではなく所有者名で表す |
| `startAt`         | timestamp                 | 開始日時 |
| `endAt`           | timestamp                 | 終了日時 |
| `allDay`          | boolean                   | 終日予定かどうか |
| `sourceEventId`   | string                    | 同期元 Google カレンダーイベント ID（再同期時の重複排除に使用） |
| `syncedAt`        | timestamp                 | 同期日時 |

## 制約

- `allDay: true` の場合、Google カレンダー仕様に準拠し「開始日の 00:00:00 〜 最終日翌日の 00:00:00」で保存する（終了は排他的境界。終了時刻ちょうどはイベントに含まれない）。旧仕様（終了時刻を包含的に解釈）で保存された既存データは `scripts/migrate-allday-schedule-encoding.mjs` で本仕様に一括移行済み
- `MemberCalendarEvent` の書き込みは所有者本人（`userId == request.auth.uid`）のみ、閲覧は同一チームメンバーに限定する
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
