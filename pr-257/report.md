# 最終レポート PR #257（PR B-1 / SHA deb2848）

## 概要
ロール2種化（`member` = 全権限 / `staff` = スタッフ）のサーバー側。Security Rules と Cloud Functions を新しい権限表に合わせた。クライアントは B-2、ブリーフ削除 UI・共通フィールド・正本同期は B-3。

## 変更内容
- ロールの意味: `member` を全権限、`staff` をスタッフ扱い。旧 `operator` / `owner` は移行互換で全権限（PR C で外す）。旧 `rom` / `editor` / `viewer` と未知の値は `staff`。変換は `functions/src/lib/role.ts` の `toTeamRole` の1か所
- ルール（`firestore.rules`）: `isTeamOwner` を `isMemberRole` に変更、`isOwnerOrEditor` は廃止
  - スケジュール・ブリーフ・工程・工程コメント・タスク・コラボ・設定系を権限表どおりに制限
  - `createdBy` は作成時に自分へ固定し、更新では変更不可
  - 工程: 作成・削除はブリーフ作成者かメンバー。担当者本人は `status` / `completedAt` / `completedBy` / `updatedAt` のみ更新可。`waiting` ↔ `ready` の遷移（`status` / `updatedAt` のみ）は所属者に許可。`done` 化や担当変更には使えない
- Functions: `requireMemberRole` に統一（スケジュール作成は全ロール）。新規チーム作成者は `member`、`operatorUids` は読み書きしない。退出・アカウント削除・解散は `members` の `role` から「最後のメンバー」を判定。`deleteAccount` の引数は `memberAssignments`
- `updateMemberRole`: `schemaVersion: 2` と `role: 'member' | 'staff'` 必須。自己変更は不可で、変更後もメンバーが1人以上残る（TE-006）

## 確認結果
- `pnpm verify` 通過（lint 0 error、型、Functions build、ユニット 403 件）
- Emulator ルールチェック3本（`check-role-rules.mjs` / `check-member-rules.mjs` / `check-unavailability-rules.mjs`）すべて exit 0
- CI（Lint / Unit / E2E smoke）はレポート作成時点で実行中。完了を確認してからマージすること
- レビュー: 一次・二次とも現 HEAD に対し scope=full で pass。最終 HEAD はコメント2行の差分のみでコード変更なし

## 画面の変更
なし（`src/` の変更なし）。スクリーンショットは対象外。

## デプロイ順と注意
- B-1 / B-2 / B-3 は同時に反映する。B-1 だけを本番に出さない（クライアントが旧ロール前提のため動かない）
- #258 と一緒に反映する
- 本番作業①（旧ロール → `staff`）は完了済みで、旧 `member` は 0 件を確認済み
- 古いクライアントが旧キー `operatorAssignments` を送ると、最後のメンバーかつ他に所属者がいる場合は `failed-precondition` で明示的に失敗する（黙って成功しない）

## 未解決・追跡
- #259: `updateMemberRole` と最後のメンバー判定のユニットテスト不足（本 PR 範囲外）
- 権限表に無い例外（工程の waiting↔ready 自動遷移、ブリーフの `updatedAt` のみ更新）の正本明記は B-3 で行う
- 非担当者の ready→waiting も許される点は、テストが無く、B-3 で併せて明記する。done にはならないため実害はない

## lint / E2E 定義の変更
なし（eslint 設定・tests/e2e・playwright・.github の変更なし）。
