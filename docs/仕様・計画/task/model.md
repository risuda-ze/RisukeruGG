# task model

## モデル方針

Task は制作作業の個票を表し、TaskStatus は表示列と完了判定、Category は分類情報を表す。Category はタスクとスケジュールで共通利用する統合カテゴリであり、正本は本ドキュメントとする。

このカテゴリでは、タスク表示・編集・集計に直接関係する項目だけを正本化する。チームロールと所属は team、紐付くスケジュール本体は schedule、通知配送は integration を参照する。

## Task

Firestore コレクション配置: `teams/{teamId}/tasks/{taskId}`

| フィールド         | 型 / 例         | 意味                                                                                                                  |
| ------------------ | --------------- | --------------------------------------------------------------------------------------------------------------------- |
| `id`               | string          | Firestore ドキュメント ID                                                                                             |
| `title`            | string          | タスク名                                                                                                              |
| `columnId`         | string          | 所属列を表す `TaskStatus.id`                                                                                          |
| `categoryId`       | string \| null  | タスクカテゴリ ID。未分類なら `null`                                                                                  |
| `description`      | string \| null  | 詳細説明                                                                                                              |
| `assigneeId`       | string \| null  | 担当者のメンバー UID                                                                                                  |
| `dueDate`          | Date \| null    | 締切日                                                                                                                |
| `dueDateAllDay`    | boolean（任意） | 締切が終日かどうか。`true` または未設定は日付のみ、`false` は `dueDate` の時刻まで使う                                |
| `linkedScheduleId` | string \| null  | 関連する動画投稿予定スケジュール ID                                                                                   |
| `createdBy` / `createdAt` / `updatedBy` / `updatedAt` | | 作成者・作成日時・最終更新者・最終更新日時。[team/model.md](../team/model.md) の共通フィールド |

## TaskStatus

Firestore コレクション配置: `teams/{teamId}/taskStatuses/{columnId}`

| フィールド  | 型 / 例          | 意味                                        |
| ----------- | ---------------- | ------------------------------------------- |
| `id`        | string           | Firestore ドキュメント ID                   |
| `name`      | string           | 列名                                        |
| `order`     | number           | 左からの表示順                              |
| `color`     | string           | 列色                                        |
| `icon`      | string \| null   | 表示用アイコン。任意設定（未設定は `null`） |
| `role`      | `'done'` \| null | 完了列なら `'done'`、それ以外は `null`      |
| `createdBy` / `createdAt` / `updatedBy` / `updatedAt` | | 作成者・作成日時・最終更新者・最終更新日時。[team/model.md](../team/model.md) の共通フィールド |

## Category（タスク・スケジュール共通）

Firestore コレクション配置: `teams/{teamId}/categories/{categoryId}`

タスクとスケジュールの両方が同一のカテゴリセットを参照する統合カテゴリ。旧仕様では `taskCategories` / `scheduleCategories` として個別管理していたが、単一コレクションに統合した。schedule 側の `ScheduleEntry.categoryId` もこの Category を参照する（詳細は [schedule/model.md](../schedule/model.md) を参照）。

| フィールド  | 型 / 例        | 意味                                        |
| ----------- | -------------- | ------------------------------------------- |
| `id`        | string         | Firestore ドキュメント ID                   |
| `name`      | string         | カテゴリ名                                  |
| `color`     | string         | カテゴリ表示色                              |
| `icon`      | string \| null | 表示用アイコン。任意設定（未設定は `null`） |
| `order`     | number         | 表示順                                      |
| `createdBy` / `createdAt` / `updatedBy` / `updatedAt` | | 作成者・作成日時・最終更新者・最終更新日時。[team/model.md](../team/model.md) の共通フィールド |

## 制約

- タスク状態の正本は `columnId` であり、独立した status フィールドは持たない
- タスクはコメントを持たない（TA-029）
- `TaskStatus.role` は 1 チームにつき 0 列以上で `'done'` を取りうる
- 列は最低 1 つ、最大 10 個まで管理する
- カテゴリ削除時は関連する全タスクおよび全スケジュールの `categoryId` を `null` に更新する
- カテゴリの追加・編集・削除はメンバーのみ可能とする
- ボード表示時の並び順は列の `order`、列内タスクは締切優先のソートルールに従う
- 既存タスクを参照した複製新規作成は保存項目を増やさず、`id`、`createdBy`、`createdAt`、`updatedAt` は新規タスクとして生成する

## 関連する隣接モデル

### team 側で管理するもの

- `assigneeId` が参照するメンバー情報
- ロール（メンバー / スタッフ）による操作権限

### schedule 側で管理するもの

- `linkedScheduleId` が参照する動画投稿予定スケジュール
- スケジュール側の時間管理やカレンダー表示

## 今後詳細化する項目

- 列削除時のタスク再配置ルール
- タスク履歴の保持方針
- CSV エクスポートの列定義詳細
