# ai model

## モデル方針

AIチャットのデータは**セッションメモリのみ**で保持し、Firestore コレクションを持たない。チャット履歴・提案状態は Zustand ストア（`src/stores/aiChat.ts`）で管理し、ページ遷移後も同一ブラウザセッション内は保持するが、リロード・セッション終了で消える。

登録実行時に作成されるエンティティ（ScheduleEntry / Task / CollabSession）の正本は各カテゴリの model を参照する。Discord ボット側のセッション（`discord_sessions/{guildId}`）は integration カテゴリの model を参照する。

## ChatMessage（セッション保持・Firestore 永続化なし）

| フィールド | 型 / 例                    | 意味 |
| ---------- | -------------------------- | ---- |
| `id`       | string（UUID）             | メッセージ識別子 |
| `role`     | `user` \| `assistant`      | 発話者 |
| `content`  | string                     | テキスト全文（`%%PROPOSAL%%` ブロックを含む場合あり） |

## Proposal（解析済み提案）

AI 応答の `%%PROPOSAL%%`〜`%%/PROPOSAL%%` ブロック（JSON）を解析して得る。

| フィールド         | 型 / 例                              | 意味 |
| ------------------ | ------------------------------------ | ---- |
| `type`             | `schedule` \| `task` \| `collab` \| `task_update` | 登録対象の種別 |
| `title`            | string（`task_update` では省略）     | タイトル |
| `startAt` / `endAt`| string（ISO 8601）                   | スケジュール用の開始・終了日時 |
| `description`      | string（任意）                       | 説明 |
| `participantNames` | string[]（任意）                     | スケジュール参加者の表示名。登録時に UID へ解決 |
| `dueDate`          | string（YYYY-MM-DD、任意）           | タスク用の締切日 |
| `assigneeName`     | string（任意）                       | タスク担当者の表示名。登録時に UID へ解決 |
| `columnName`       | string（任意）                       | タスクを追加する列名。登録時に列 ID へ解決 |
| `partnerName`      | string（任意）                       | コラボ相手名 |
| `proposedDates`    | string[]（ISO 8601、任意）           | コラボ候補日程 |
| `taskId`           | string（`task_update` のみ必須）     | 更新対象の既存タスク ID |
| `changes`          | object（`task_update` のみ必須）     | 部分更新フィールド（title / description / dueDate / assigneeName / columnName / categoryName のうち最低 1 つ。description・dueDate・assigneeName・categoryName は `null` で「値を外す」） |

## ストア状態（`useAIChatStore`）

| フィールド          | 型                                          | 意味 |
| ------------------- | ------------------------------------------- | ---- |
| `messages`          | ChatMessage[]                               | 会話履歴 |
| `isLoading`         | boolean                                     | AI 応答待ちかどうか |
| `pendingProposals`  | Proposal[]                                  | 確認待ちの提案（複数可） |
| `proposalStatus`    | `pending` \| `loading` \| `done` \| `error` | 提案カードの UI 状態 |
| `proposalMessageId` | string \| null                              | 提案を含むメッセージの ID |
| `pinnedTaskId`      | string \| null                              | タスク詳細画面から「AIに相談」で遷移した際のピン留めタスク ID |

## 制約

- チャット履歴を Firestore へ永続化しない（揮発性。リロードで消える）
- 提案からの登録はクライアント SDK ＋既存リポジトリ関数経由で行い、Firestore セキュリティルールの権限チェックを受ける（サーバーサイドでルールをバイパスしない）
- AI モデルは Anthropic Claude haiku を使用する

## 関連する隣接モデル

### schedule / task / collab 側で管理するもの

- 登録実行時に作成される ScheduleEntry / Task / CollabSession の定義・制約
- コンテキストに含めるスケジュール・タスク・コラボの意味づけ
- `MemberCalendarEvent`（メンバーの予定）の定義

### integration 側で管理するもの

- Discord ボットの会話セッション（`discord_sessions/{guildId}`）
- Discord 経由での提案確定・登録フロー
