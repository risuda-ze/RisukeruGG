# ロールを 2 種類にする（メンバー / スタッフ） 変更仕様

**作成日**: 2026-11-18（2026-11-21 改訂）
**状態**: PR A・B は develop へマージ済み、本番作業②は適用済み。PR C を実装中（Issue #219）
**正本**: [docs/仕様・計画/team/](../仕様・計画/team/README.md)（機能識別 ID `TE`）

## 背景・目的

現行の権限ロールは 3 種類（オペレーター / メンバー / ROM専）。これを **メンバー / スタッフ の 2 種類に置き換える**（Issue #219）。あわせて、ロール名と保存値を一致させ、コード上の旧名（`operator` など）も残さない。

当初案は「保存値は `operator` のまま、表示名だけ変える」だったが、「保存値も新名称に揃えて完全にきれいにする」方針に改訂した（下記「保存値」「移行」）。

## 全体方針

- **保存値・コード名・表示名を一致させる。** ロールは `member`（メンバー）/ `staff`（スタッフ）。`operator` / `rom` はコードから無くす
- **スタッフの権限は「自分が作ったものの管理」に絞る。** コンテンツの種類ごとに、スタッフが触れる範囲を下の「権限」で定める
- **作成者を共通フィールドとして持つ。** 「自分が作ったもの」の判定に使う
- **仕様の詳細は正本に書く。** 本書は経緯・仮決定・移行・実装の分割を管理する

## 現状（実コードで確認。2026-11-18、`origin/develop` 1977a93。ロールまわりは 2026-11-21 の `origin/develop` 0177c9e でも変わらない）

| 項目 | 現状 | 根拠 |
| --- | --- | --- |
| 型 | `UserRole = 'operator' \| 'member' \| 'rom'` | `src/types/entities.ts`、`functions/src/lib/validateAuth.ts`、`functions/src/teams/updateMemberRole.ts`（3 か所に重複定義） |
| 管理者判定 | `role == 'operator'` | `firestore.rules` の `isTeamOwner`、Functions の `requireOperator`、`/api/discord/*` の各 Route、画面の `isOperator` |
| 編集者判定 | `role in ['operator', 'member']` | `firestore.rules` の `isOwnerOrEditor`、Functions の `requireOperatorOrMember`、操作層 `src/lib/briefs/operations/index.ts`、画面の `canEdit` |
| `rom` | どちらにも入らない＝閲覧のみ。本番に該当者はいない | `src/app/(protected)/team/page.tsx`、`RoleChangeDialog.tsx` |
| 作成時のロール | `operator` | `createTeam.ts`、`onUserCreate.ts` ほか |
| 参加時のロール | `member`（旧正本は「ROM専」と書いており食い違っていた） | `joinTeam.ts` |
| ロール変更 | `operator` のみ実行可。自分自身は `operator` 以外へ変更不可。**`operatorUids` は更新していない** | `updateMemberRole.ts` |
| `operatorUids` | ルールは参照しない。読むのは退出・アカウント削除・解散・Kick の Functions のみ | `leaveTeam.ts` / `leaveSpecificTeam.ts` / `deleteAccount.ts` ほか |
| 旧値の読み替え | 共通の変換層は無い | `src/lib/repositories/teams.ts` ほか |
| 作成者 | `schedules` / `tasks` / `collabSessions` / `briefs` が `createdBy` を持つ。Discord 経由は `'discord-bot'` 固定。`steps` / `playbooks` / `categories` / `taskStatuses` は持たない | `src/types/entities.ts`、`src/types/briefs.ts` |
| 削除の権限 | `schedules` / `briefs` / `steps` / `playbooks` は `allow write` に削除を含む。ブリーフの削除 UI は無い | `firestore.rules` |
| 工程コメント | 作成は編集者、更新・削除は `operator` か本人（`authorId`）。Discord 由来は `authorId: null` | `firestore.rules` |

## 決定事項

### 確定（ユーザー回答済み）

| # | 項目 | 決定 |
| --- | --- | --- |
| 1 | ロール | 現行 3 ロールを廃止し、メンバー / スタッフ の 2 種類に置換 |
| 2 | 保存値・コード名 | 保存値は `member` / `staff`。コード上の `operator` / `rom` も無くす（`operatorUids`・`requireOperator` なども改名・廃止） |
| 3 | `operatorUids` | 廃止。「最後のメンバー」判定は `members` の `role` から都度求める |
| 4 | 旧 `rom` | 本番に該当者はいない。旧値の読み替えでは `staff` に倒す |
| 5 | 所属者のコレクション名 | `teams/{teamId}/members` と `TeamMember` 型は変えない（ロールを問わない所属者の総称） |
| 6 | コラボ参加者の `type: 'member' \| 'external'` | 変えない（`member` はロール値と同じ意味） |
| 7 | Discord・AI・コラボ等 | Discord 由来の操作は従来どおりロールを見ない |
| 8 | `deleteCompletedTasks`（完了タスクの自動削除） | 維持。完了タスクの一括削除 UI は作らない |
| 9 | Google カレンダー連携 | 当初想定していた整理（サーバー同期など）は、develop で書き出し方式へ転換済みのため対象外。ロールには影響しない（書き出しは利用者自身の操作で、全ロールが行える） |
| 10 | コメント機能の要否 | 別 Issue（#246）。今回はロールの扱いだけ定める |

### 仮決定（レビューで覆す場合は正本と本書を直す）

| # | 項目 | 仮決定 | 代替案 |
| --- | --- | --- | --- |
| 1 | 作成・参加時の既定ロール | 作成者＝メンバー、チームコード参加＝スタッフ（現行実装の写像） | 参加時もメンバー |
| 2 | 最後の 1 人 | 現行制約を維持（メンバーは 1 人以上。自分は降格不可。唯一のメンバーは他に所属者がいる間は退出不可） | — |
| 3 | ロール変更 UI | 選択肢を 2 つに。ROM専の注意文は削除。昇格時の警告は足さない | 昇格時に確認文を足す |
| 4 | 総称 | ロールを問わない総称は、仕様書では「所属者」、画面では「メンバー・スタッフ」 | — |
| 5 | AI へ渡すロール | コード値ではなく表示名（メンバー / スタッフ）を渡す | コード値のまま |
| 6 | 規約・ポリシー | 「オペレーター」→「メンバー」の置換のみ。改定通知なし | 改定として通知する |
| 7 | プラン | 人数上限は従来どおり所属者数で数える | — |
| 8 | 共通フィールド | 下の「作成者と共通フィールド」のとおり | 作成者を持つのを必要なモデルだけに留める |
| 9 | 型・関数名 | `UserRole` → `TeamRole = 'member' \| 'staff'`、`requireOperator` → `requireMemberRole`、ルールの `isTeamOwner` → `isMemberRole`、`isOwnerOrEditor` は廃止（作成者判定の `isCreator` を新設）、`operatorAssignments` → `memberAssignments` | — |

## 権限

「作成者」は、ドキュメントの `createdBy` がログイン中のユーザーの uid と一致することを指す。Discord 経由の作成（`'discord-bot'`）・システム作成・作成者が退会済み・作成者の記録が無い場合は、**誰にも一致しない**ため、メンバーだけが編集・削除できる。同じ uid で再参加した場合は、ロールを問わず再び作成者として扱う。

| 対象 | 閲覧 | 作成 | 編集 | 削除 |
| --- | --- | --- | --- | --- |
| チーム設定・解散・チームコードのリセット・ロール変更・Kick | 所属者 | メンバー | メンバー | メンバー |
| Discord 連携、AI 設定 | メンバー（AI 設定は所属者が閲覧可） | メンバー | メンバー | メンバー |
| 進め方（playbooks） | 所属者 | メンバー | メンバー | メンバー |
| カテゴリ・カンバン列 | 所属者 | メンバー | メンバー | メンバー |
| タスク（コメントを含む） | 所属者 | メンバー | メンバー | メンバー |
| コラボ（確定・取消を含む） | 所属者・外部参加者（URL トークン） | メンバー | メンバー | メンバー |
| スケジュール | 所属者 | メンバー・スタッフ | メンバー、または作成者 | メンバー、または作成者 |
| ブリーフ | 所属者 | メンバー・スタッフ | メンバー、または作成者 | **メンバーのみ**（削除 UI を新設。配下の工程・差分・工程コメントも削除する） |
| 工程（steps） | 所属者 | ブリーフの作成者、またはメンバー | ブリーフの作成者、またはメンバー。**ただし完了・状態変更は担当者本人も可** | ブリーフの作成者、またはメンバー |
| 工程コメント | 所属者 | メンバー・スタッフ | 本人（`authorId`）、またはメンバー | 本人、またはメンバー |
| 対応不可時間（`unavailability`） | 所属者 | 本人 | 本人 | サーバーのみ（月次削除・退出時） |
| 自分の Discord ユーザー名の登録、チームからの退出 | — | 全ロール | 全ロール | 全ロール |

旧ロールとの違い（旧 `operator` → メンバー、旧 `member` → スタッフ）:

- スタッフは、**タスクとコラボの作成・編集ができなくなる**（旧 `member` は可）
- スタッフは、**他人が作ったスケジュール・ブリーフを編集・削除できなくなる**
- ブリーフの削除はメンバーのみ（従来は削除 UI 自体が無い）
- 旧 `rom`（閲覧のみ）は本番に該当者がいないため、権限昇格の問題は無い

Discord からの操作（作成・コメント・工程ボタン）は従来どおりロールを見ない。Web の制限とは別に扱う。

### 工程の担当者の判定

「担当者本人」は `assigneeId == 自分の uid`。完了・状態変更（`status` / `completedAt` / `completedBy`）だけを担当者に許す。担当・締切・入力項目の変更は、ブリーフの作成者かメンバーのみ。ルールでは変更されるキーを検査する。

## 作成者と共通フィールド

ユーザーが作るドキュメント（`schedules` / `tasks` / `collabSessions` / `briefs` / `steps` / `playbooks` / `categories` / `taskStatuses`）は、次の共通フィールドを持つ。

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `createdBy` | string \| null | 作成者の uid。Discord 経由は従来どおり `'discord-bot'`、システム作成は `'system'`。記録の無い既存データは未設定 |
| `createdAt` | timestamp | 作成日時 |
| `updatedAt` | timestamp | 最終更新日時 |
| `updatedBy` | string \| null | 最終更新者の uid |

- ルールで `createdBy` を固定する。クライアントからの `create` は `createdBy == request.auth.uid` を必須にし、`update` では `createdBy` を変更不可にする（スタッフが他人の作成物の作成者を書き換えて削除する抜け道を塞ぐ）
- 既存データを埋め直さない。`createdBy` が無い・一致しないものはメンバーのみが扱う（ルールは `resource.data.get('createdBy', null)` で比べる）
- 退会・アカウント削除で `createdBy` を書き換えない。uid が認証できなくなるため、結果として「作成者なし」と同じ扱いになる
- 書き込み経路（リポジトリ・操作層・Functions・Discord Route）が付与を揃えるよう、共通のヘルパーを使う

## 保存値と移行

### 保存値

| 意味 | 旧 | 新 |
| --- | --- | --- |
| メンバー（全権限） | `operator`（`owner` も） | `member` |
| スタッフ | `member` / `rom` / `editor` / `viewer` | `staff` |

旧 `member`（非管理者）と新 `member`（管理者）は**同じ文字列で意味が逆**になる。移行の途中や古いタブが書いた `member` が旧・新どちらか判別できないと、非管理者が管理者として扱われる。そこで、**旧 `member` を先にすべて `staff` へ書き換え、旧 `member` が存在しない状態を確認してから、`member` を新しい意味で使い始める。**

### 手順

1. **PR A（互換）**: ルール・Functions・クライアントが `staff` を編集者として認識する。旧 `member` は引き続き編集者（旧意味）、`operator` は管理者。書き込み（`joinTeam` ほか）は `staff` を使う。この時点で意味はまだ変わらない
2. **本番作業①（一括書き換え）**: `teams/*/members/*` の旧 `member` / `rom` / `editor` / `viewer` を `staff` へ書き換える。件数を出し、未知の値は書き換えずに一覧表示する。実行後、旧 `member` が 0 件であることを確認する。**0 件を確認するまで PR B をデプロイしない**
3. **PR B（意味の切り替えと権限の細分化）**: ルール・Functions・クライアントを新仕様へ切り替える。`member` を管理者、`staff` を編集者以外の権限（上記「権限」）として扱う。互換として `operator` も管理者として認める。`updateMemberRole` には新しい要求形式（`schemaVersion: 2` 相当の引数）を必須にし、古いタブからの `member` / `rom` / `operator` の送信を拒否する（古いタブの `member` は旧意味のため、昇格として通ってしまうのを防ぐ）
4. **本番作業②と PR C（後片付け）**: `operator` を `member` へ、`owner` を `member` へ書き換える。`teams/*` の `operatorUids` と旧 `ownerId` を削除する。ルール・Functions・クライアントから `operator` を外す。読み取り時の変換は、未知の値を `staff`（管理者にしない）へ倒す形で残す

デプロイ順は「ルール・Functions → クライアント → 一括書き換え」。逆順だと、新しい値 `staff` を古いルールが認めず書き込めなくなる。

## 波及箇所

### コード（実装 PR で変更）

- 型: `UserRole`（3 か所の重複定義）を `TeamRole = 'member' | 'staff'` に統一。`operatorUids` を削除し、`createdBy` などの共通フィールドを各モデルへ追加
- ルール: `isTeamOwner` → `isMemberRole`、`isOwnerOrEditor` を廃止。`schedules` / `briefs` / `steps` / `playbooks` の `allow write` を `create` / `update` / `delete` に分割し、「権限」の表どおりにする。タスク・コラボは更新・削除を `isMemberRole` に。工程の完了・状態変更は変更キーを検査して担当者に許す。`members` の本人更新で `role` を書き換えられない制限は別 Issue（下記）
- Functions: `requireOperator` → `requireMemberRole`、`requireOperatorOrMember` は廃止し、作成者・担当者の判定ヘルパーを置く。`createTask` / コラボ作成 / `updateMemberRole` / `joinTeam` / `getAuthContext`（旧値の変換を 1 か所に）。退会・解散・Kick・`deleteAccount` は `operatorUids` を使わず `members` の `role` から「最後のメンバー」を判定
- Discord の各 Route: `role !== 'operator'` を `member` 判定へ
- クライアント: `toMember`（変換）、`canEdit` の判定（タスク・コラボはメンバー、スケジュールは作成者かメンバー、ブリーフ・工程は上表）、`ROLE_LABELS` / `ROLE_BADGE`（2 か所の重複を 1 つに）、ロール変更 UI、`RoleChangeDialog`、ブリーフ削除 UI（新設）、操作層の権限判定
- 文言: 「オペレーター」「ROM専」を含む画面（`/team`、`/settings/profile`、`/settings/ai`、`/integrations/discord`、退出・Discord ユーザー名のダイアログ、プライバシーポリシー）、AI のプロンプトと能力の説明
- テスト・シード: `roleChangeVisibility.test.ts`、`leaveTeamLogic.test.ts`、`systemPrompt` のスナップショット、`tests/e2e/visual.spec.ts`、`scripts/seed.mjs`（`rom` のユーザー 2 人）
- ブリーフ削除: 配下の `steps`・`briefEvents`・工程コメントを連鎖して削除する。Discord 連携（`BriefDiscordLink`）のメッセージの扱いは実装 PR で決める

### 正本（本 PR で更新したもの）

- `team/README.md` / `requirements.md` / `model.md` / `flows.md`
- `共通用語.md`

### 正本（実装 PR で同期するもの）

未マージの設計書 PR との競合を避けるため本 PR では触らない。実装 PR で、旧ロール名（`operator` / `member` / `rom`）の記述を新しい名前へ直し、権限の記述を「権限」の表に合わせる。

| ファイル | 直す箇所 |
| --- | --- |
| `risukeru_gg_spec.md` | TeamMember の「ロール（operator/member/rom）」 |
| `task/*` | TA-001 / TA-002 / TA-023 / TA-025 の権限（タスクの作成・編集・削除はメンバーのみ）、`rom` の削除 |
| `schedule/*` | SC-001 / SC-002 / SC-015 の権限（作成者かメンバー）、`rom` の削除 |
| `collab/*` | CO-001 / CO-007 ほかの権限（作成・編集・削除はメンバーのみ） |
| `production/*` | PD-062 / PD-070 の権限（作成者・担当者・メンバー）、ブリーフ削除、`rom` の削除 |
| `user/*` | 初期ロールの列挙 |
| `unavailability/*` | UN-010〜UN-012 の `rom` の記述（`rom` が無くなるため、「ロールを問わず」へ） |
| `ai/*`、`integration/*` | 「オペレーター」の表記、`operator` 判定の表記 |
| `docs/変更仕様/production-v2-ai-discord.md` | 権限表の `rom` 列（履歴として残すなら注記のみ） |

### 他の Issue・PR への影響

- **#210 / #223（対応不可時間）**: 「スタッフはロールに無いため画面文言はメンバーで統一」という決定は、本 Issue で前提が変わる。実装後は総称を「メンバー・スタッフ」と書く。「`rom` も自分の分は入力できる」（UN-011）は不要になる
- **#217（仕様書の更新）**: 共通用語の メンバー / スタッフ の行と重なる。定義の向きは同じ（メンバー＝管理者）
- **#246（コメント機能の要否）**: コメントを廃止する場合、権限の表の「工程コメント」「タスク（コメントを含む）」を整理する

## 現状確認で見つかった問題（本 Issue では直さない）

| # | 内容 | 扱い |
| --- | --- | --- |
| 1 | `members/{memberId}` の本人による `role` 書き換え（自己昇格） | develop で修正済み（許可リスト方式で、`role` / `plan` は Callable Function のみが書く）。本変更の前提は満たされている。実装時は、許可リストと `scripts/check-member-rules.mjs` の検証を新しい値に合わせて更新する |
| 2 | 旧 `updateMemberRole` が `operatorUids` を更新しない | `operatorUids` の廃止で解消 |
| 3 | 旧正本 TE-004 / flows は参加時「ROM専」、実装は `member` | 本 PR の正本更新で解消（参加時はスタッフ） |
| 4 | 正本の読み取り時変換表（`owner` / `editor` / `viewer`）は、実装では `owner` の一部判定しかない | PR A・B で変換を 1 関数にまとめて解消。本番に旧値の文書が残っているかは未確認（本番作業①のスクリプトが件数を出す） |

## PR 分割と状態

すべて `develop` 起点の `feature/` ブランチで作り、`develop` へマージする。

| PR・作業 | 内容 | 依存 | 状態 |
| --- | --- | --- | --- |
| 設計書 | 本書、正本 `team/*`、共通用語 | なし | 本 PR |
| 先行修正 | `members` の本人更新で `role` を書き換えられない制限（問題 1） | なし | develop で完了 |
| A | 互換: `staff` を認識（ルール・Functions・クライアントの型と `canEdit`）。変換関数。テスト | 設計書の合意 | マージ済み |
| 本番作業① | 旧 `member` / `rom` / `editor` / `viewer` → `staff` の一括書き換え。0 件確認 | A の本番反映 | 未着手 |
| B | 意味の切り替えと権限の細分化: `member` を管理者へ。ルール分割・作成者フィールド・タスク/コラボのメンバー限定・ブリーフ削除 UI・改名・文言・AI・シード・テスト・正本の同期。`updateMemberRole` の新形式 | 本番作業① | マージ済み |
| 本番作業② | `operator` / `owner` → `member`、`operatorUids` と `ownerId` の削除。0 件確認 | B の本番反映 | 適用済み（スクリプトは削除） |
| C | ルール・コードから `operator` / `owner` の互換を除去 | 本番作業② | 実装 PR |

B は大きいため、「作成者フィールドとルール分割」と「ブリーフ削除 UI」を別 PR に分けてもよい（デプロイ順は守る）。

## 本番反映時の注意

- A の反映には `firestore.rules` のデプロイと Functions の再デプロイが必要
- 本番作業①の後、B の反映までの間は、古いクライアントが `staff` を知らない場合がある。A にクライアントの対応を含め、間を空けない
- **B の反映前に、旧 `member` が 0 件であることを必ず確認する。** 1 件でも残っていると、その人が管理者になる
- B の反映後、古いタブは `updateMemberRole` が拒否される。再読み込みで解消する
- スタッフはタスク・コラボの編集ができなくなり、他人のスケジュール・ブリーフを編集できなくなる。反映前に該当チームへ周知するかを決める
- 本番作業のスクリプトは、書き換え前に件数を表示する（dry-run）手順を踏む

## 関連

- Issue #219、#246（コメント機能の要否）
- 正本: [team/README.md](../仕様・計画/team/README.md) / [requirements.md](../仕様・計画/team/requirements.md) / [model.md](../仕様・計画/team/model.md) / [flows.md](../仕様・計画/team/flows.md)
- 共通用語: [共通用語.md](../共通用語/共通用語.md)
