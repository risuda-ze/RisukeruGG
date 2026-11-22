# production flows

## ブリーフ作成フロー

1. 所属者が `/briefs` の「新しいブリーフ」からタイトル・公開予定日・進め方・出演者を入力する
2. 操作層 `createBrief` が進め方の `steps` から工程を生成する。先行工程のない工程は `ready`、それ以外は `waiting`。締切は `publishAt − leadDays`、担当は `defaultAssigneeId`
3. ブリーフ・工程・`brief.created` の差分を 1 つの writeBatch で書き込む
4. 作成後は 1枚紙（`/briefs/{briefId}`）へ遷移する
5. 進め方が 0 件のチームでは、工程 0 件の `planning` として作成し、1枚紙から工程を手で追加する（対話による引き出しは ai カテゴリで後続）

## 工程の完了フロー

1. 工程行の完了チェック、または工程パネルの「完了にする」を押す
2. 操作層 `changeStepStatus` が遷移可否（PD-032）を検査し、`done` と完了日時・完了者を記録する
3. 変更後の状態で `deriveReadiness` を評価し、先行が揃った後続工程を `ready` に自動遷移する（差分は `system` 由来）
4. 1 つの writeBatch で書き込み、画面は購読で反映する
5. Discord 連携中は integration のフローに従い、要約メッセージの更新と後続工程の着手可能通知を行う

## 公開予定日の変更フロー

1. 1枚紙の見出しで公開予定日を選ぶ
2. 画面は保存前に `planDueDateRecalc` の結果（固定していない工程の変更前 → 変更後）を差分プレビューとして表示する
3. 「変更する」で操作層 `updateBriefHeader` が公開予定日と各工程の締切を更新し、`brief.publishAt_changed` と工程ごとの `step.dueDate_changed`（`system` 由来）を記録する
4. 手で固定した工程（`dueDateOverridden`）は変更しない

## 締切の手動変更フロー

1. 工程パネルの締切を変える → `setStepDueDate` が 0 時に正規化して保存し、`dueDateOverridden = true` にする
2. 「固定を解除して自動計算に戻す」→ `setStepDueDate(null)` が公開日から再計算し、`dueDateOverridden = false` に戻す

## 入力待ちの検出フロー

1. `ready | in_progress` の工程で `requiredFields` の必須項目が未入力なら「入力待ち」バッジを表示する
2. 工程パネルには未入力の項目名と、`ownerRoleLabel` があれば「（役割 が入力）」を示す
3. 項目を入力して「情報を保存する」→ `setStepFields` が部分更新し、`step.field_filled` を記録する

## 工程の追加・削除フロー

1. 「工程」ボタンから工程名・担当・公開日からの日数・先行工程・任意かを入力 → `addStep` が `custom_N` キーで末尾（または指定工程の直後）に追加する
2. 工程パネルの「この工程を削除する」→ `removeStep` が削除し、他工程の先行指定から外して依存関係を再評価する

## 進め方の作成・更新フロー

1. `/briefs/playbooks` の「進め方を作る」で名前・工程・見出し項目を入力し保存する（`version = 1`、`origin = manual`）
2. 編集して保存すると `version` が +1 される。既存ブリーフは生成時の版を保持したまま影響を受けない
3. 1枚紙の「この流れを進め方にする」→ 現在の工程から `origin = derived` の進め方を作る
