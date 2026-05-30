# collab model

## モデル方針

CollabSession は外部相手との日程調整単位を表し、CollabComment は調整中のメモ / コメントを表す。

このカテゴリでは、コラボ作成、公開回答、確定、再調整に直接関係する項目だけを正本化する。月次上限判定は plan、確定後に生成されるスケジュール詳細は schedule、通知配送条件は notification を参照する。

## CollabSession

| フィールド | 型 / 例 | 意味 |
| --- | --- | --- |
| `id` | string | コラボセッション ID |
| `title` | string | コラボの件名 |
| `partnerName` | string | 外部相手の表示名 |
| `createdBy` | string | セッション作成者の UID |
| `teamId` | string | 打診側チーム ID |
| `proposedDates` | `Date[]` | 候補日程一覧 |
| `responses` | object \| null | 直近送信の集約回答。`dates`、`alternativeDates`、`respondedAt`、`note` を持つ |
| `expiresAt` | Date | 公開回答の有効期限 |
| `status` | `open` \| `confirmed` \| `expired` \| `cancelled` | 現在状態 |
| `confirmedDate` | Date \| null | 確定日時 |
| `linkedScheduleId` | string \| null | 確定時に自動作成したスケジュール ID |
| `createdAt` | Date | 作成日時 |
| `icon` | string \| null | 任意の表示アイコン |
| `content` | string \| null | コラボ内容メモ |
| `participants` | `CollabParticipant[]` \| undefined | 内部 / 外部の参加者候補 |
| `participantResponses` | `Record<string, Record<string, 'ok' \| 'ng' \| 'pending'>>` \| undefined | 回答者ごとの候補日程回答 |
| `comments` | `CollabComment[]` \| undefined | コメント / メモ一覧 |

## CollabParticipant

| フィールド | 型 / 例 | 意味 |
| --- | --- | --- |
| `id` | string | 参加者識別子 |
| `name` | string | 表示名 |
| `type` | `member` \| `external` | 内部メンバーか外部相手か |

## CollabComment

| フィールド | 型 / 例 | 意味 |
| --- | --- | --- |
| `id` | string | コメント ID |
| `authorId` | string | 投稿者識別子 |
| `authorName` | string | UI 表示名 |
| `text` | string | コメント本文 |
| `createdAt` | Date | 作成日時 |
| `parentId` | string \| undefined | 返信先コメント ID。未設定はルートコメント |

## Firestore コレクション配置

```text
teams/{teamId}/collabSessions/{sessionId}   ← CollabSession ドキュメント
```

- 共有 URL は `sessionId` と `teamId` から公開ページ URL を導出して利用する
- `linkedScheduleId` は `teams/{teamId}/schedules/{scheduleId}` を参照する

## 制約

- `proposedDates` は 1 件以上 5 件以下
- `expiresAt` は作成日時から 1〜30 日の範囲で設定する
- `status === 'confirmed'` のときは `confirmedDate` を持ち、通常は `linkedScheduleId` も保持する
- `status === 'open'` では共有 URL から回答可能、`confirmed` / `expired` / `cancelled` では新規回答を受け付けない
- 候補日程の削除時は `participantResponses` の添字を再マッピングする
- コメント入力時は `comments` に外部回答コメントを追記する

## 状態遷移

```text
open -> confirmed
open -> expired
open -> cancelled
confirmed -> open
confirmed -> cancelled
```

- `confirmed -> open` は再調整でのみ許可する
- 再調整時は `confirmedDate` と `linkedScheduleId` をクリアする

## 関連する隣接モデル

### schedule 側で管理するもの

- 確定時に自動作成される `ScheduleEntry`
- `linkedScheduleId` で参照するスケジュールの詳細項目

### notification 側で管理するもの

- `collab_created`
- `collab_responded`
- `collab_confirmed`
- `collab_cancelled`

### plan 側で管理するもの

- `monthlyCollabCount`
- LIGHT プランの月 3 件上限
