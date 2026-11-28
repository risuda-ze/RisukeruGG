# production model

## モデル方針

Brief は動画・配信 1 本を表す親、Step はその工程、Playbook はチーム固有の工程の型、BriefEvent は変更の記録を表す。

型定義の正本は `src/types/briefs.ts`、入力スキーマは `src/lib/validations/briefs.ts`。

## Firestore コレクション配置

```
teams/{teamId}/playbooks/{playbookId}                                 ← Playbook
teams/{teamId}/briefs/{briefId}                                       ← Brief
teams/{teamId}/briefs/{briefId}/steps/{stepId}                        ← Step
teams/{teamId}/briefs/{briefId}/steps/{stepId}/comments/{commentId}   ← StepComment
teams/{teamId}/briefs/{briefId}/briefEvents/{eventId}                 ← BriefEvent
```

`steps` はコレクショングループ検索（`teamId ==`）のため `firestore.indexes.json` に COLLECTION_GROUP の単一フィールド索引を持つ。

## FieldDef（入力項目の定義）

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `key` | string | 項目キー（英小文字・数字・`_`） |
| `label` | string | 表示名 |
| `type` | `text` \| `url` \| `number` \| `date` \| `select` | 入力の型 |
| `options` | string[]（任意） | `select` の選択肢 |
| `required` | boolean | 必須か（入力待ち判定に使う） |
| `ownerRoleLabel` | string \| null | この情報を出す人の役割（催促先） |

## Playbook（進め方）

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `id` | string | ドキュメント ID |
| `name` | string | 例: 「YouTube 動画（編集あり）」 |
| `version` | number | 更新のたびに +1 |
| `origin` | `dialogue` \| `manual` \| `derived` | 対話で作成 / 手で作成 / ブリーフから作成 |
| `headerFields` | FieldDef[] | 見出しに置く項目 |
| `steps` | StepDef[] | 工程の型（順序どおり） |
| `createdBy` / `createdAt` / `updatedBy` / `updatedAt` | | 作成者・作成日時・最終更新者・最終更新日時。[team/model.md](../team/model.md) の共通フィールド |

`StepDef`:

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `key` | string | 進め方内で一意 |
| `title` | string | 工程名 |
| `roleLabel` | string \| null | 役割（例: 編集） |
| `defaultAssigneeId` | string \| null | 既定の担当 UID |
| `leadDays` | number | 公開予定日の何日前を締切とするか |
| `dependsOn` | string[] | 先行工程の key |
| `requiredFields` | FieldDef[] | 始めるのに必要な情報 |
| `reminderDaysBefore` | number | 締切の何日前にメンションするか（既定 1） |
| `optional` | boolean | 飛ばせる工程か |

## Brief（ブリーフ）

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `id` | string | |
| `teamId` | string | |
| `title` | string | |
| `playbookId` / `playbookVersion` | string \| null / number \| null | 生成元の進め方と版 |
| `publishAt` | Date \| null | 公開予定日（日付のみ）。締切の基準 |
| `status` | `planning` \| `in_progress` \| `published` \| `archived` | |
| `performerIds` | string[] | 出演者 UID |
| `headerFields` | FieldDef[] | 見出し項目の定義（生成時に複製） |
| `fields` | Record<string, unknown> | 見出し項目の値 |
| `linkedScheduleId` | string \| null | 公開予定スケジュールとのリンク |
| `discord` | `{ threadId, summaryMessageId, channelId }` \| null | Discord スレッド（integration）。この項目の記録は最終更新に数えず、`updatedBy` / `updatedAt` を進めない |
| `createdBy` / `createdAt` / `updatedBy` / `updatedAt` | | 作成者・作成日時・最終更新者・最終更新日時。[team/model.md](../team/model.md) の共通フィールド。工程の変更でも `updatedBy` / `updatedAt` を進める |

## Step（工程）

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `id` | string | |
| `briefId` / `teamId` | string | 親ブリーフ・チーム（コレクショングループ用） |
| `key` | string | StepDef の key。手追加は `custom_N` |
| `title` | string | |
| `order` | number | 表示順 |
| `status` | `waiting` \| `ready` \| `in_progress` \| `done` \| `skipped` | |
| `assigneeId` | string \| null | |
| `dueDate` | Date \| null | 締切（0 時） |
| `dueDateOverridden` | boolean | 手で固定したか |
| `leadDays` | number | 生成時に複製 |
| `dependsOn` | string[] | 先行工程の key |
| `requiredFields` | FieldDef[] | 生成時に複製 |
| `fields` | Record<string, unknown> | 工程固有の項目の値 |
| `reminderDaysBefore` | number | |
| `optional` | boolean | |
| `completedAt` / `completedBy` | timestamp \| null / string \| null | |
| `discordMessageId` | string \| null | 着手可能通知の ID（integration）。この項目の記録は最終更新に数えず、`updatedBy` / `updatedAt` を進めない |
| `createdBy` / `createdAt` / `updatedBy` / `updatedAt` | | 作成者・作成日時・最終更新者・最終更新日時。[team/model.md](../team/model.md) の共通フィールド。`createdBy` は工程を追加した人（ブリーフ作成時はブリーフの作成者） |

## StepComment

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `authorId` | string \| null | Discord 由来は null |
| `authorName` | string | |
| `body` | string | 2,000 文字以内 |
| `source` | `web` \| `discord` | |
| `discordMessageId` | string \| null | |
| `createdAt` | timestamp | |

## BriefEvent（差分）

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `type` | string | `brief.created` / `brief.title_changed` / `brief.publishAt_changed` / `brief.status_changed` / `brief.field_changed` / `step.status_changed` / `step.assignee_changed` / `step.dueDate_changed` / `step.field_filled` / `step.added` / `step.removed` |
| `stepId` / `stepKey` | string \| null | 対象工程 |
| `before` / `after` | unknown | 変更前後 |
| `actorId` | string \| null | 操作者 UID。システム由来・Discord 由来は null |
| `source` | `web` \| `discord` \| `system` \| `ai` | |
| `createdAt` | timestamp | |

## 制約

- 工程の状態は 5 値固定。列（`TaskStatus`）は使わない
- `briefEvents` は追記のみで、改変しない。削除するのはブリーフの削除に伴うときだけ
- ブリーフの作成・削除と工程の変更はすべて操作層（`src/lib/briefs/operations`）を経由し、1 操作 = 1 writeBatch。ブリーフの削除は配下の工程・工程コメント・差分とブリーフ本体を同じ writeBatch で消す
- `steps` の書き込み時は必ず `teamId` と `briefId` を持たせる（コレクショングループのルール評価に必要）

## 関連する隣接モデル

### team 側で管理するもの

- `assigneeId` / `performerIds` / `createdBy` が参照するメンバー情報とロール
- `TeamMember.discordUsername` / `discordUserId`（メンション解決）

### integration 側で管理するもの

- `Brief.discord` の生成と更新、`Step.discordMessageId` の投稿、ダイジェスト
