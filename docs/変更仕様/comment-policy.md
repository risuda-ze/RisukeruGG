# コメント機能の整理 変更仕様

**作成日**: 2026-11-26
**状態**: 仕様のみ（未実装。Issue #246）
**正本**: [schedule](../仕様・計画/schedule/requirements.md) / [task](../仕様・計画/task/requirements.md) / [collab](../仕様・計画/collab/requirements.md) / [unavailability](../仕様・計画/unavailability/README.md) / [ai](../仕様・計画/ai/requirements.md) / [team](../仕様・計画/team/model.md)

## 変更名

コメント機能の整理（`comment-policy`）

## 目的

アプリ内のコメント機能は、保存先・権限・動作が場所ごとにばらばらで、保存されないもの（スケジュール）や、入力欄は出るのに送信が拒否されるもの（スタッフのタスク・コラボ。#260）がある。所属者が「書いたのに残らない・送れない」状態をなくすため、使いどころが別の手段で足りる 3 か所を廃止し、時間帯の調整に使う対応不可時間のコメントだけを全所属者が書ける形にする。

## 対象範囲

リポジトリ所有者の決定（2026-11-26）は次の 4 点。

| 場所 | 決定 | 理由（所有者） |
| --- | --- | --- |
| スケジュール | コメントを廃止 | やるべきことはタスクに、覚えておくことは詳細（説明）に書く。会話・連絡は Discord で行う |
| タスク | コメントを廃止 | 同上 |
| コラボ調整 | コメントを廃止 | 同上 |
| 対応不可時間 | 「自分の時間帯に本人がコメント」から「全ての参加者が自由にコメント投稿」へ | なぜ対応不可か、場合によっては行ける、ここで会議を入れたい、など時間帯について調整する使い方がある |

- 含む
  - スケジュール詳細モーダルのコメント欄の削除
  - タスク詳細モーダルのコメント欄、`addTaskComment`、`Task.comments`、AI へ渡すタスクのコメントの削除
  - コラボ詳細モーダルのコメント欄（一覧・投稿・返信）の削除と、回答コメントを回答者ごとの回答に添えて表示する「回答」の欄の追加。公開フォームのクライアントからの `comments` 書き込みの削除
  - 対応不可時間のメモを、全所属者が投稿できるコメント（1 件 1 ドキュメント）に置き換える。既存メモの移行を含む
  - 上記に合わせた正本仕様・共通用語の同期（この PR で実施）
- 含まない
  - 工程コメント（ブリーフの工程。Discord からの書き込みを含む）。現状のまま（決定 1）
  - コラボの公開回答フォームで回答者が書くコメント（回答コメント）の入力と保存。現状のまま残す。コラボ詳細での表示だけを変える（決定 2）
  - 既存データの削除（タスク文書の `comments`、コラボ文書の `comments`）（決定 3）
  - 新タスク構造（`taskItems`。#265）へのコメント機能の追加。付けない（決定 8）
  - 対応不可コメントの通知、返信（スレッド）、一覧画面でのコメント有無の表示
  - 旧 `/tasks` 画面そのものの削除（#267）

### 関連 Issue との関係

- **#260**（スタッフにタスク・コラボのコメント入力欄が出るが、送信はルールで拒否される）: 本変更でタスク・コラボとも入力欄そのものが無くなるため解消する（#260 の対応案 C）。廃止側の実装 PR で閉じる
- **#265 / #266**（新タスク構造、ブリーフ置き換え）: `task-items-gantt.md` の仮決定 26「β の新タスクにコメント機能を付けない。#246 の結論に従って後から足す」は、タスクのコメント廃止により「足さない」で確定と読む（決定 8）。#266 の「新タスクのコメント機能」の項目も同じ
- **#267**（旧画面の削除と移行）: 「埋め込みコメントは移行せず捨てる」は決定済みで、本変更と矛盾しない。本変更でタスク文書の `comments` は読まなくなり、データは #267 の移行で捨てられる

## 仕様書変更箇所

仕様変更あり。この PR で次の正本を更新した。正本は実装より先に更新しているため、実装 PR がマージされるまで実装と食い違う（`unavailability/README.md` の「実装状況」にその旨を書いた）。

| ファイル | 変更 |
| --- | --- |
| `docs/仕様・計画/schedule/requirements.md` | SC-020 を追加（コメント機能を持たない） |
| `docs/仕様・計画/task/requirements.md` | TA-029 を追加（コメント機能を持たない） |
| `docs/仕様・計画/task/model.md` | `Task.comments` の行を削除。制約に「コメントを持たない」を追加。「今後詳細化する項目」からタスクコメントを削除 |
| `docs/仕様・計画/collab/requirements.md` | CO-013（追記は Cloud Function だけ）、CO-018（文言）、CO-029（回答者ごとの「回答」の欄）と CO-030（コメント欄を置かない）を追加 |
| `docs/仕様・計画/collab/model.md` | `CollabComment` を回答コメントとして定義し直し、`parentId` を削除 |
| `docs/仕様・計画/collab/flows.md` | 公開回答フロー・日程確定フロー・再調整フローの文言 |
| `docs/仕様・計画/unavailability/README.md` | 対象範囲・対象外・実装状況 |
| `docs/仕様・計画/unavailability/requirements.md` | UN-004・005・010〜013・022・023、UN-030〜039（メモ → コメント。038・039 は新規）、UN-043・060・064・065・070・071・087・088 |
| `docs/仕様・計画/unavailability/model.md` | `UnavailabilityMonth.notes` と `UnavailabilityNote` を削除し、`UnavailabilityComment` を追加。ルール・読み取り・インデックス |
| `docs/仕様・計画/unavailability/flows.md` | 詳細表示、入力、コメント投稿・編集・削除、月次削除、退出時の削除 |
| `docs/仕様・計画/ai/requirements.md` / `flows.md` | AI-017・AI-019 とタスク照会フローから、タスクのコメントを削除 |
| `docs/仕様・計画/team/model.md` | 権限の表: 「タスク（コメントを含む）」→「タスク」、「対応不可コメント」の行を追加。「対応不可時間」の行に残っていた廃止済みの名前（`memberCalendars`）を `unavailability` に直した |
| `docs/仕様・計画/team/flows.md` / `user/flows.md` | 退出・Kick・アカウント削除で消す対象に対応不可コメントを追加 |
| `docs/仕様・計画/risukeru_gg_spec.md` | カテゴリ一覧とエンティティ一覧（`UnavailabilityComment` を追加、`CollabComment` の説明） |
| `docs/共通用語/共通用語.md` | 「対応不可メモ」→「対応不可コメント」、「回答コメント」を追加 |

`production/*`（工程コメント）と `integration/*`・`notification/*` は変更なし。

### 用語追加候補（この PR で共通用語に反映済み）

- **対応不可コメント**: 「対応不可メモ」を置き換える
- **回答コメント**: コラボの公開回答で回答者が書くコメント。チーム内からは投稿できない

## 設計

### A. スケジュール（廃止）

- データモデル: 変更なし（コメントはもともと保存していない）
- アクセス制御: 変更なし
- インデックス: 変更なし
- 処理の流れ: `ScheduleModal` の右カラム（見出し「コメント / メモ」、一覧、返信、入力欄、新規作成時の案内「予定を保存するとコメントを残せます」）を削除する。`LocalComment` 型、`comments` / `commentText` / `replyingTo` / `replyText` の state、`addComment` / `addReply` を削除する。右カラムが無くなるので、モーダルは左カラム（既存の入力項目）だけの 1 カラムにする
- 再利用: 新規に作るものはない
- 互換性: 保存データが無いため影響なし

### B. タスク（廃止）

- データモデル: `Task.comments`（`src/types/entities.ts`）を型から削除する。`src/lib/repositories/tasks.ts` の変換（`rawComments`）と `addTaskComment` を削除する。既存のタスク文書に残る `comments` 配列は消さず、読まない（決定 3）
- アクセス制御: 変更なし（`tasks` の `update` はメンバーのみのまま）
- インデックス: 変更なし
- 処理の流れ
  - `TaskDetailModal` の右カラム（見出し「コメント / メモ」、一覧、入力欄、送信ボタン）と、`comments` / `commentText` / `sendingComment` の state、`addComment` を削除する
  - AI へ渡すコンテキストからコメントを外す。`src/lib/ai/systemPrompt.ts` の `TaskCommentContext`・`formatCommentsInline`・「コメント（直近）」の行・ピン留めタスクの「コメント（直近 10 件）」の節、`src/components/ai/AIChatPage.tsx` の `comments` の組み立て（タスク一覧とピン留めの 2 か所）、`src/app/api/discord/interactions/handlers/handleRisukerugg.ts` の `rawComments` を削除する
  - `systemPrompt.ts` の案内文からコメントへの言及を外す。詳細文の作成の材料「タスクのタイトル・コメント・会話内容」から「コメント」を除き、編集不可の一覧の「コメントの追加・編集・削除（コメントは読み取りのみ…）」の行を削除する（編集不可の一覧は AI-019 に合わせる）
- 再利用: 新規に作るものはない
- 互換性: `updateTask` は変更したフィールドだけを書くため、既存の `comments` 配列は保存後も残る（AC-5 で確認する）。旧 `/tasks` 画面は #267 で削除される

### C. コラボ調整（コメント欄の廃止と、回答コメントの表示の変更）

現状のコラボ詳細（`CollabDetailModal`）は、左カラムに「参加者」（名前のチップ）と「候補日程」（候補ごとの OK / NG / 未定の人数。名前はホバーで表示）、右カラムに「コメント / メモ」（チーム内コメントと回答コメントが混ざった一覧、入力欄、返信）を持つ。回答者 1 人ぶんの回答をまとめて見る場所は無い。

- データモデル: `CollabSession.comments` は回答コメントの一覧として残す。`CollabComment.parentId` を型と `src/lib/repositories/collabs.ts` の変換から削除する（どこからも書き込まれていない）。`addCollabComment` を削除する
- アクセス制御: 変更なし（`collabSessions` の `update` はメンバーのみのまま。回答コメントは Admin SDK で書く）
- インデックス: 変更なし
- 処理の流れ
  - `CollabDetailModal` の右カラム（見出し「コメント / メモ」、一覧、入力欄、「送信」、`sendComment`、返信の `addReply`・`localReplies`・`replyingTo`・`replyText`）を削除し、モーダルを左カラムだけの 1 カラムにする
  - 左カラムの「候補日程」の下に「回答」の欄を足す（CO-029）。`participantResponses` のキー（回答者）ごとに 1 行で、次を表示する
    - 回答者名。キーから名前への解決は、既存の `getDateAggregates` と同じ対応（参加者の `id`、または名前の記号を `_` に置き換えたもの。どちらにも無ければキーそのまま）を使う
    - 候補日程ごとの回答。日時の昇順に、日時と OK / NG / 未定の印（既存の `ResponseAggregate` と同じアイコン・色。色だけに頼らないよう文言も付ける）。その候補に回答が無ければ「—」
    - その回答者の回答コメント。`comments` のうち `authorId` がその行のキーと一致する要素を、`createdAt` の古い順に、投稿日時（`M/d HH:mm`）と本文で表示する。無ければ何も出さない
  - 行は回答者名の昇順。回答者が 1 人もいなければ「まだ回答はありません」。新規作成中（`isNew`）は欄ごと出さない。閲覧はロールを問わない
  - `comments` の購読（`onSnapshot`）は残し、同じ購読で `participantResponses` の最新も表示に使う（回答が届いたとき、コメントだけが先に出て回答者の行が無い、という状態を作らない）。ただし編集中のローカルの `participantResponses`（候補日程の削除で添字を振り直したもの）がある間は、そちらを優先する
  - 回答コメントとチーム内コメントの区別: `authorId` が `participantResponses` のキーにあるものだけを回答コメントとして表示する（CO-030）。`respondToCollab` は、回答者のキーを `participantResponses` のキーと回答コメントの `authorId` の両方に同じ値で書く。チーム内コメントの `authorId` は投稿者の UID で、`participantResponses` のキーにはならない（`participantResponses` を書くのは `respondToCollab` だけで、キーは回答者名から作る）
  - `CollabResponseForm`: `respondToCollab` の呼び出しの後にある `addCollabComment` の呼び出しを削除する。回答コメントの追記は `functions/src/collab/respondToCollab.ts` だけが行う（CO-013）。現状は Function とクライアントの両方が同じコメントを追記しようとしており、クライアント側の書き込みは未認証のため `firestore.rules`（`update` はメンバーのみ）で拒否され、回答は保存済みなのにフォームにエラーが出ると読める（コード上の確認。実行では未確認）。AC-8 で確認する
  - `respondToCollab` は変更なし
- 再利用: `ResponseAggregate` のアイコンと色、`getDateAggregates` の名前解決、`avatarStyle`。新規に作るのは「回答」の欄の表示だけ
- 互換性: チーム内から投稿された既存のコメントは `comments` に残すが、表示しない（決定 3）。同じ回答者が回答し直してコメントを書いた場合は、その回答者の行に複数の回答コメントが古い順に並ぶ。公開フォームの 3 ステップ構成（CO-025）は変えない

### D. 対応不可時間（メモ → 全所属者が投稿できるコメント）

詳細は正本（[requirements](../仕様・計画/unavailability/requirements.md) UN-030〜039 / [model](../仕様・計画/unavailability/model.md) / [flows](../仕様・計画/unavailability/flows.md)）を参照。ここには要点と、正本に書かない移行だけを書く。

- データモデル
  - 新コレクション `teams/{teamId}/unavailabilityComments/{commentId}`（自動採番）。フィールドは `targetUserId`（時間帯の持ち主）/ `authorId`（投稿者）/ `month` / `date` / `start` / `end` / `text` / `createdAt`。用途は model.md の表のとおり
  - 型 `UnavailabilityComment` を `src/types/unavailability.ts` に追加し、`UnavailabilityNote` と `UnavailabilityMonth.notes` を削除する
  - Zod（`src/lib/validations/unavailability.ts`）: `unavailabilityNoteSchema` をコメント用（`unavailabilityCommentSchema`）に置き換え、`MAX_NOTES_PER_MONTH` と保存スキーマの `notes` を削除する。読み取りは同じスキーマで検証し、通らないコメントは捨てる
  - 既存データの移行: 要（下記「既存メモの移行」）
- アクセス制御: `firestore.rules` に `unavailabilityComments` のブロックを追加し、`unavailability` のブロックから `notes` を外す（条件は model.md の「Firestore Security Rules」）。権限はルールで強制する。作成は所属者（ロール不問）、編集は投稿者本人のみ、削除は投稿者本人とメンバー
- インデックス: `firestore.indexes.json` の `fieldOverrides` に、コレクショングループ `unavailabilityComments` の `month`（`COLLECTION` と `COLLECTION_GROUP` の昇順）を追加する。既存の `unavailability` と同じ形
- 処理の流れ
  - 購読: 所属者詳細を開いている間だけ、読み込み済みの月ごとに `month` の等価条件で購読する。表示するのは `targetUserId` が開いている所属者で、投稿者・対象とも現在の所属者であるコメント（UN-039）
  - 投稿・編集・削除: フォームの確定で 1 件ずつ直接書く（`addDoc` / `updateDoc` / `deleteDoc`）。対応不可の「保存」と未保存の変更（`src/lib/unavailability/draft.ts`）からは切り離し、draft のメモの扱い（`notes`、`draftedNotes`、`countNotesInMonth` など）を削除する。失敗時はトーストを出し、フォームを入力内容を保ったまま開いておく
  - 表示: 吹き出しに投稿者の表示名（`TeamMember.displayName`）・時間帯・本文。同じ時間帯は `createdAt` の古い順。自分のコメントを押すと編集フォーム、他人のコメントを押すと全文表示。メンバーには全文表示に「削除」を出す（UN-035）
  - 他の所属者の詳細: 下端の操作は「コメントを追加」だけを出す（「保存」「CSV・定期入力」は出さない）。コメント欄の時間の行は自分・他人の詳細とも押せる
  - 画面文言: 「メモ」を「コメント」に統一する（「コメントを追加」、フォームの見出し・案内、ヘルプ）。入力欄の案内は UN-032 の用途（時間帯についての調整）に合わせる
  - Functions: `functions/src/unavailability/cleanup.ts` の `deleteUserUnavailability` に、`unavailabilityComments` の `targetUserId == userId` と `authorId == userId` の削除を足す（失敗時の扱いは既存と同じ。退出等は成立させ、エラーログに残す）。`purgeOldUnavailability.ts` に、コレクショングループ `unavailabilityComments` の `month < before` の削除を足す
- 再利用: `NoteForm`（コメント用に改名して使う）、`layoutNotes`（`src/lib/unavailability/view.ts`。横並びの段組み）、`deleteInBatches`、`purgeBeforeMonth`、`storageWindow`、`scripts/check-unavailability-rules.mjs`（ルールの自己チェックにコメントの検査を足す）。新規に作るのはリポジトリ関数（購読・作成・更新・削除）と移行スクリプトだけ
- 互換性: 画面は `/unavailability` だけ。一覧の ×・人数・最終更新・時間帯フィルタは変わらない。Emulator のシード（`scripts/seed.mjs`）の `notes` はコメントのドキュメントに置き換え、他の所属者が投稿したコメントを 1 件含める

#### 比較した案（対応不可コメントの保存先）

軸は「既存との関係」。

| 案 | 内容 | 利点 | 欠点 | 判断 |
| --- | --- | --- | --- | --- |
| 1 | 対象者の月ドキュメントの `notes` に、他の所属者も書けるようルールを緩める | 型と画面の変更が最小 | ルールは配列の中身を検証できないため、他人のコメントの書き換え・削除を防げない。他人が `updatedAt`（最終更新）を進める。配列ごと書くため同時の投稿で片方が消える | 不採用 |
| 2 | 投稿者自身の月ドキュメントの `notes` に `targetUserId` を足す | ルール・インデックス・Functions・移行が不要 | コメントを書くだけで投稿者の月ドキュメントができ、未入力の人が「最終更新 今日」と表示される（UN-053 が防ごうとしている誤読）。投稿のたびに配列全体を書く | 不採用 |
| 3 | 1 件 1 ドキュメントの別コレクション | 本人性・値をルールで検証できる。投稿が対応不可の「最終更新」に影響しない。Issue #246 の「権限を分離できる形」に合う | ルール 1 ブロック、インデックス 1 件、Functions 2 か所、移行スクリプトが要る | **採用** |

月ドキュメントのサブコレクションにしないのは、対象者が未入力（月ドキュメントなし）でもコメントを付けられ、チームの 1 ヶ月分を 1 クエリで購読できるようにするため。

#### 既存メモの移行

対応不可時間は v0.2.2 で公開済みのため、本番に `notes` を持つ月ドキュメントがありうる。一回性のスクリプト `scripts/migrate-unavailability-notes.mjs` で移行する（決定 6）。`scripts/migration-runbook.md` の方針（既定は dry-run、`--apply` で書き込み、本番適用後に削除して runbook の表に記録）に従う。

- 対象: コレクショングループ `unavailability` のうち `notes` フィールドを持つドキュメント
- 処理: 月ドキュメントごとに 1 バッチで、`notes` の各要素から `unavailabilityComments` のドキュメントを作り（`targetUserId` と `authorId` は月ドキュメントの `userId`、`month` は月ドキュメントの `month`、`date` / `start` / `end` / `text` はそのまま、`createdAt` は月ドキュメントの `updatedAt`）、同じバッチで月ドキュメントの `notes` フィールドを削除する。月ドキュメントの `updatedAt` は変えない
- Zod で形が合わない要素は移行せず、件数をログに出す
- 同じバッチで `notes` を消すため、2 回実行しても重複しない

### 実装 PR の分割

2 本に分ける。触るファイルが重ならず、後者だけが本番作業（ルール・インデックス・Functions のデプロイと移行）を伴うため。

| PR | 内容 | 本番作業 | 閉じる Issue |
| --- | --- | --- | --- |
| 1 | A・B・C（スケジュール・タスク・コラボのコメント廃止、コラボ詳細の「回答」の欄、AI コンテキスト） | なし（アプリのデプロイのみ） | #260 |
| 2 | D（対応不可コメント、移行スクリプト） | あり（下記） | #246 |

## 受入条件

| ID | 入力・操作 | 期待結果 |
| --- | --- | --- |
| AC-1 | 所属者が `/schedule` で既存の予定を開く | 詳細モーダルに「コメント / メモ」の見出し・コメント一覧・入力欄・「返信」が無い。タイトル・日時・説明などの既存の項目は表示・編集・保存できる |
| AC-2 | 所属者が予定の新規作成モーダルを開く | 「予定を保存するとコメントを残せます」の案内が無い |
| AC-3 | メンバーが `/tasks` でタスクを開く | 詳細モーダルに「コメント / メモ」の見出し・コメント一覧・入力欄（「コメントを入力...」）・送信ボタンが無い。ステータス・カテゴリ・担当者・期限・説明を編集して保存できる |
| AC-4 | スタッフが `/tasks` でタスクを開く、またはコラボ詳細を開く | コメントの入力欄が無い（#260 の再現手順で入力欄が出ない） |
| AC-5 | `comments` 配列を持つ既存のタスクを開き、説明を変えて保存する | 保存が成功する。タスク文書の `comments` 配列は保存前と同じ値で残る |
| AC-6 | コメントを持つタスクがある状態で、AI チャットと Discord の AI コマンドのコンテキストを組み立てる | システムプロンプトのタスク一覧・ピン留めタスクに「コメント」の行が無い（`tests/unit/ai/systemPrompt.test.ts` で確認する） |
| AC-7 | メンバーが `open` のコラボ詳細を開く | 「コメント / メモ」の見出し・コメント一覧・入力欄・「送信」ボタン・「返信」が無い（右カラムが無い）。「候補日程」の下に「回答」の欄がある |
| AC-8 | 外部の回答者が公開フォームで名前・日程・コメント「X」を入力して送信する | 完了画面が表示され、エラーが出ない。コラボ文書の `comments` に、`text` が「X」・`authorName` が回答者名の要素が 1 件だけ増える |
| AC-9 | AC-8 の後、メンバーまたはスタッフがそのコラボ詳細を開く | 「回答」の欄にその回答者の行があり、回答者名、候補日程ごとの OK / NG / 未定（日時の昇順）、その下に投稿日時と「X」が表示される。編集・削除・返信の操作は無い |
| AC-10 | 回答が 1 件も無いコラボ詳細を開く。コメントを書かずに回答した回答者がいるコラボ詳細を開く | 前者は「回答」の欄に「まだ回答はありません」と表示される。後者はその回答者の行に回答だけが表示され、コメントの枠は出ない |
| AC-11 | `tests/e2e/collabs/collab-ui-redesign.spec.ts` を実行する | 「コメント入力・送信ができる」のテストは削除され、コラボ詳細にコメントの入力欄が無いことを確認するテストが通る |
| AC-12 | スタッフ A が他の所属者 B の詳細を開き、コメント欄の時間の行（例: 当日 20:00）を押して本文を入力し、確定する | フォームが閉じ、B の詳細のその時間帯に、A の表示名・時間帯・本文の吹き出しが出る。`unavailabilityComments` に `targetUserId` = B、`authorId` = A、`start` = 20、`end` = 21 のドキュメントが 1 件できる |
| AC-13 | AC-12 の前後で、B の月ドキュメントと一覧を見る | B の月ドキュメントの `updatedAt` は変わらない。一覧の B の「最終更新」表示も変わらない |
| AC-14 | 月ドキュメントが 1 つも無い所属者 A がコメントを投稿する | 投稿できる。一覧の A は「未入力」のまま |
| AC-15 | B と別の所属者 C が、別のブラウザで B の詳細を開いている間に、A が AC-12 の投稿をする | B・C の画面に、リロードなしで吹き出しが出る |
| AC-16 | A が、自分が投稿したコメントの吹き出しを押し、本文を変えて確定する。もう一度押して削除する | 編集フォームが開く。確定で吹き出しの本文が変わる。削除で吹き出しが消え、ドキュメントが無くなる |
| AC-17 | スタッフ B が、自分の時間帯に A が付けたコメントの吹き出しを押す | 全文が表示されるだけで、編集フォーム・「削除」は出ない |
| AC-18 | 他の所属者の詳細を開く | 下端に「コメントを追加」が出る。「保存」「CSV・定期入力」は出ない。対応不可の列はドラッグしても塗れない |
| AC-19 | 自分の詳細で対応不可を塗り、「保存」を押さずにコメントを投稿する | コメントは保存される。塗った内容は破線のまま残り、「未保存の変更があります」が表示されたままになる |
| AC-20 | コメントのフォームで、本文を空・101 字にする、または終了時を開始時以前にする | 確定できない |
| AC-21 | コメントの書き込みが失敗する（リポジトリ関数が reject する。ユニットテストで確認） | トーストで失敗を知らせる。フォームは開いたままで、入力した日付・時間帯・本文が残る |
| AC-22 | 「日単位で表示」に切り替える | コメントは表示されない（従来どおり） |
| AC-23 | Emulator で `scripts/check-unavailability-rules.mjs` を実行する（作成） | 所属者が `authorId` = 自分で作成 → 許可。`authorId` = 他人、`targetUserId` がチームの所属者でない、`text` が 0 字・101 字、`start >= end`、`end` = 25、`month` が `date` の先頭 7 文字と違う、定義外のフィールドを含む、`createdAt` がリクエスト時刻でない、他チームの所属者 → いずれも拒否 |
| AC-24 | 同上（編集・削除・閲覧） | 投稿者本人の `text` の更新と削除 → 許可。本人でも `targetUserId` / `authorId` / `createdAt` の変更 → 拒否。他人のコメントの更新 → メンバーでも拒否。他人のコメントの削除 → メンバーは許可、スタッフは時間帯の持ち主でも拒否。同一チームの所属者の read → 許可、他チームの所属者の read・削除 → 拒否 |
| AC-25 | 同上（月ドキュメント） | `notes` を含む月ドキュメントの書き込み → 拒否。`userId` / `month` / `days` / `updatedAt` だけの書き込み → 従来どおり許可 |
| AC-26 | 所属者 X が退出する、Kick される、またはアカウントを削除する | X の時間帯に付いたコメント（`targetUserId` = X）と X が投稿したコメント（`authorId` = X）が、そのチームから無くなる。他の所属者同士のコメントは残る |
| AC-27 | 月次削除を実行する（当月が 2026-12 の場合） | `month` が 2026-10 以前のコメントが削除され、2026-11 以降のコメントは残る |
| AC-28 | 投稿者または対象が所属者一覧にいないコメントが残っている状態で詳細を開く | そのコメントは表示されない |
| AC-29 | `notes` を 2 件持つ月ドキュメントがある状態で、移行スクリプトを `--apply` なしで実行する | Firestore は変わらない。移行対象の件数（月ドキュメント 1、メモ 2）が出力される |
| AC-30 | 同じ状態で `--apply` を付けて実行し、続けてもう一度実行する | 1 回目で `unavailabilityComments` に 2 件できる（`targetUserId` = `authorId` = 月ドキュメントの `userId`）。月ドキュメントから `notes` が消え、`updatedAt` は変わらない。2 回目は対象 0 件で、コメントは増えない |
| AC-31 | 移行後、その所属者の詳細を開く | 移行したコメントが本人の表示名つきで表示され、本人は編集・削除できる |
| AC-32 | `/unavailability` の一覧・詳細・フォーム・ヘルプを表示する | 「メモ」の文言が無く、「コメント」になっている。ヘルプに、コメントは全員が投稿できることが書かれている |
| AC-33 | `pnpm verify` と `pnpm test:e2e:smoke` を実行する | どちらも成功する。`tests/e2e/unavailability/` の「メモ」のシナリオは、コメント（自分の詳細と他の所属者の詳細の両方での投稿、他人のコメントは編集できないこと）に置き換わっている |
| AC-34 | チーム内から投稿された既存のコメント（`authorId` が UID）と回答コメントの両方を `comments` に持つコラボ詳細を開く | チーム内から投稿されたコメントはどこにも表示されない。回答コメントは回答者の行に表示される。コラボ文書の `comments` は開く前と同じ値で残る |
| AC-35 | 回答者が回答した後に候補日程を 1 件追加して保存し、コラボ詳細を開き直す。同じ回答者がコメントを変えて回答し直す | 追加した候補日程の回答は「—」と表示される。回答し直した後は、その回答者の行に回答コメントが古い順に 2 件並ぶ |
| AC-36 | メンバー M が、スタッフ A が投稿したコメント（M 以外の時間帯に付いたものを含む）の吹き出しを押し、「削除」を押す | 全文と「削除」が表示される（編集フォームは開かない）。「削除」で吹き出しが消え、ドキュメントが無くなる |

## 影響ファイル（想定）

PR 1（廃止）

- `src/components/calendar/ScheduleModal.tsx`
- `src/components/kanban/TaskDetailModal.tsx`、`src/lib/repositories/tasks.ts`、`src/types/entities.ts`
- `src/lib/ai/systemPrompt.ts`、`src/components/ai/AIChatPage.tsx`、`src/app/api/discord/interactions/handlers/handleRisukerugg.ts`
- `src/components/collab/CollabDetailModal.tsx`、`src/components/collab/CollabResponseForm.tsx`、`src/lib/repositories/collabs.ts`
- `tests/unit/ai/systemPrompt.test.ts`、`tests/unit/tasks/taskOrdering.test.ts`、`tests/e2e/collabs/collab-ui-redesign.spec.ts`、`tests/e2e/tasks.spec.ts`（コメントアウトされたコメント欄のテスト）

PR 2（対応不可コメント）

- `src/types/unavailability.ts`、`src/lib/validations/unavailability.ts`、`src/lib/repositories/unavailability.ts`
- `src/lib/unavailability/draft.ts`、`src/lib/unavailability/view.ts`
- `src/components/unavailability/MemberDetail.tsx`、`NoteForm.tsx`、`UnavailabilityBoard.tsx`（ヘルプの文言）
- `firestore.rules`、`firestore.indexes.json`
- `functions/src/unavailability/cleanup.ts`、`functions/src/unavailability/purgeOldUnavailability.ts`
- `scripts/check-unavailability-rules.mjs`、`scripts/seed.mjs`、`scripts/migrate-unavailability-notes.mjs`（新規）、`scripts/migration-runbook.md`
- `tests/unit/unavailability/draft.test.ts`、`validation.test.ts`、`board.test.tsx`、`view.test.ts`、`tests/e2e/unavailability/unavailability-edit.spec.ts`

## 制約・注意

- **権限**: 対応不可コメントの投稿はロール不問（メンバー・スタッフ）。編集は投稿者本人だけ。削除は投稿者本人とメンバー（工程コメントの TE-024 と同じ扱い）。ルールで強制する（UN-013）
- **プラン**: 制限なし（PL-002 の「対応不可時間の入力は無制限」のまま。正本の変更なし）
- **JST**: `date` / `month` は JST（NFR-010）。投稿できる範囲は前月 1 日〜翌月末日
- **通知**: 対応不可コメントは Discord を含め通知しない（UN-005）
- **本番反映（PR 2）**: 次の順で行う
  1. `firebase deploy --only firestore`（rules + indexes）、Functions の再デプロイ、アプリのデプロイ
  2. 直後に移行スクリプトを dry-run → `--apply`
  - 1 と 2 の間は、既存のメモが画面に出ない。また `notes` を持つ月ドキュメントへの対応不可の保存はルールで拒否され、保存失敗のトーストが出て変更は未保存のまま画面に残る（移行後にもう一度「保存」すれば通る）。失われるデータはない
  - デプロイ前から開いたままの古い画面でメモを保存すると、ルールで拒否される（保存失敗として表示される）
  - 月次削除は `unavailabilityComments` のコレクショングループのインデックスが無いと失敗する。初回実行（翌月 1 日）までに有効になっていることを確認する
- **範囲外のリファクタを混ぜない**: `ScheduleModal` / `TaskDetailModal` / `CollabDetailModal` はコメントに関する部分だけを削る

## ユーザーへの質問

### 根拠

- 廃止 3 か所と対応不可の変更は、リポジトリ所有者の決定（2026-11-26。「対象範囲」の表）による
- 決定に含まれていなかった点は、同日の所有者の回答による（下記「決定」）
- 現状の把握は Issue #246 の表と、`origin/develop`（f2573a2）のコードによる

### 決定（2026-11-26 の所有者の回答）

| # | 点 | 決定 |
| --- | --- | --- |
| 1 | 工程コメント（ブリーフの工程。Discord からの書き込みあり） | 現状維持。ブリーフの置き換え（#266）で扱う |
| 2 | コラボの外部回答者のコメント | 残す。コラボ詳細に表示するが、現在のコメント一覧とは別の形式にする。本書では、回答者ごとの回答（候補日程ごとの OK / NG / 未定）に添えて、その回答者の回答コメントを表示する「回答」の欄とした（設計 C、CO-029） |
| 3 | 既存データ（タスク文書の `comments`、コラボ文書の `comments`） | 消さない。タスクは読まない（#267 の移行で捨てる）。コラボは、チーム内から投稿された既存のコメントを表示しない。区別は「`authorId` が `participantResponses` のキーにあるものだけが回答コメント」（CO-030） |
| 4 | 対応不可コメントの範囲・編集・削除・通知 | 投稿は全所属者（メンバーとスタッフ）。編集は投稿者本人のみ。削除は投稿者本人とメンバー。通知はしない |
| 6 | 本番にある既存の対応不可メモ | スクリプトで、本人が自分の時間帯に投稿したコメントとして移行する |
| 8 | 新タスク構造（`taskItems`）のコメント機能 | 付けない。`task-items-gantt.md` の仮決定 26 と #266 の該当項目は「付けない」で確定 |

### 置いた仮定

- コラボ詳細の「回答」の欄の具体的な形（回答者ごとに 1 行、候補日程ごとの回答、その下に回答コメント、回答者名の昇順）は、決定 2 の「現在とは別の形式」を本書で具体化したもの。所有者は形式の細部までは指定していない
- 同じ回答者の回答コメントが複数あるときは、すべてを古い順に表示する（回答し直してコメントを空にした場合も、前のコメントは残って表示される）
- 対応不可コメントに書く内容は、所有者の挙げた使い方（対応不可の理由、条件つきで行ける、会議を入れたい）に合わせた。従来の「予定の中身ではなく補足を書く」（旧 UN-032）と「予定の内容は保存しない」（旧 UN-004）は、「予定の内容を入力する項目は持たない」に改めた
- 対応不可コメントは、フォームの確定で即時に書き込む。`unavailability.md` の決定 15（メモは「保存」でまとめて書く）は、月ドキュメントに配列で持つ前提だったため、1 件 1 ドキュメントにした本変更では引き継がない。他の所属者の詳細には「保存」が無いことも理由
- メンバーが他人の対応不可コメントを削除するときも、投稿者本人の削除と同じく確認は出さない
- 対応不可コメントに返信（スレッド）は付けない。同じ時間帯にコメントを並べれば足りる
- 対応不可コメントは所属者詳細を開いている間だけ購読する（一覧はコメントを表示しないため）
- 一覧画面には、コメントの有無を表示しない

### 要確認（回答が無かった点。推奨案で仕様と正本を書いた。違う場合は該当箇所を直す）

| # | 確認したい点 | 推奨案（本書の前提） | 別の案を選んだ場合の影響 |
| --- | --- | --- | --- |
| 5 | 画面と用語の名前を「メモ」から「コメント」に変えてよいか | 変える（所有者の決定の言い方に合わせる）。共通用語は「対応不可コメント」 | 「メモ」のままにする場合は、正本の文言と共通用語を戻す。データモデルは変わらない |
| 7 | コメントの件数の上限（従来は 1 人 1 ヶ月 200 件） | 上限なし。200 件は月ドキュメントの大きさを抑えるための値で、1 件 1 ドキュメントでは理由が無くなる。ルールは件数を数えられない | 上限を置く場合は、件数を数えて作成する Cloud Function 経由に変える必要がある |
