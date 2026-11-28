# 正本仕様の実装への同期 変更仕様

**作成日**: 2026-11-28
**状態**: 文書のみ（コードの変更なし）
**正本**: [risukeru_gg_spec](../仕様・計画/risukeru_gg_spec.md) / [integration](../仕様・計画/integration/requirements.md) / [task](../仕様・計画/task/model.md) / [schedule](../仕様・計画/schedule/model.md) / [collab](../仕様・計画/collab/model.md) / team / plan / ui / user / platform

## 変更名

正本仕様の実装への同期（`spec-sync-implementation`）

## 目的

正本仕様と README が実装と食い違っている 4 件を、実装を正として直す。動作は変えない。

## 対象範囲

| Issue | 食い違い | 直し方 |
| --- | --- | --- |
| #293 | `two-roles.md` の波及箇所が、実装に無い `toMember` を挙げている | 実装の `toTeamRole`（旧ロール値の変換。`src/lib/utils/teamRoles.ts` / `functions/src/lib/role.ts`）に直す |
| #314 | task / schedule / collab の model の表が共通フィールドと実装のフィールドを反映していない | 各表に共通フィールドの行を足して `team/model.md` を参照する。schedule の表は `ScheduleEntry`（`src/types/entities.ts`）と照合し、実装に無い `platform` / `version` を外し、`collabPartnerName` / `linkedTaskIds` を足す |
| #277 | 正本がアプリ内通知・プッシュ通知（FCM）・通知設定・既読管理を現行仕様として書いている。実装は Discord 通知だけ | notification カテゴリを廃止し、通知は integration に寄せる（下記） |
| #276 | README が参照する `.env.local.example` がリポジトリに無い | Emulator 接続用の値と、実装が読む環境変数のキー（値は空）を入れて戻す。秘密値は入れない |

- 含まない
  - 総称「メンバー」→「所属者」の言い換え（#278）
  - README のうち通知・環境変数以外の古い記述（ロール名など）

## #277 の決定

実装（`functions/src/discord/notifyDiscord.ts`・`functions/src/notifications/scheduleReminders.ts`）にそろえて、次のとおりとする。

- 通知はチームの Discord 通知チャンネルへの送信だけとする。アプリ内通知・プッシュ通知・個人単位の通知設定・既読管理は持たない。notification カテゴリ（`docs/仕様・計画/notification/`）は削除し、機能 ID `NO` も一覧から外す
- 通知するのは、タスク作成・タスク変更・コラボ作成・コラボ回答・スケジュール開始 1 時間前 / 15 分前の 6 つ。トグルも 6 つ（`notifyBefore1h` / `notifyBefore15min` を IN-003 と integration の model に足す）。IN-003-3 の「開始前リマインダーを提供しない」は実装と逆だったので改める
- チームの参加・退出・ロール変更・Kick・参加ブロックは通知しない（IN-003-4）。team / plan の flows・requirements から通知の手順を外す。参加ブロックは参加者へのエラー表示だけとする
- LIGHT プランの通知の制限（PL-002）は外す。通知はプランで分けない
- ui の通知ベル・通知ドロップダウン・通知画面（UI-010・UI-011・UI-013〜UI-018）と、user の通知サブリソース（`notificationEndpoints` / `notificationSettings`）を外す
- README の機能一覧・技術スタック・シード・画面一覧・料金表と、`scripts/seed.mjs` のコメントから、アプリ内通知・FCM の記述を外す

## 受入条件

- `docs/仕様・計画/` に notification カテゴリへの参照が残っていない
- IN-003 のトグルが `updateDiscordSettings` の 6 つと一致する
- task / schedule / collab の model の表に共通フィールドの行があり、schedule の表が `ScheduleEntry` と一致する
- `.env.local.example` があり、README の手順どおりに `cp` すると Emulator に接続して起動できる
- `two-roles.md` に `toMember` が残っていない
