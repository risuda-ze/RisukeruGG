# team model

## モデル方針

Team は共同作業単位を表す。TeamMember はユーザーとチームの所属関係を表す。

このカテゴリでは、チーム管理とロール制御に直接関係する項目だけを正本化する。チーム参加可否の判定ルールは plan、初回ソロチームの起点となる認証フローは user カテゴリを参照する。

## Team

| フィールド    | 型 / 例   | 意味                                             |
| ------------- | --------- | ------------------------------------------------ |
| `id`          | string    | Firestore ドキュメント ID（自動生成）            |
| `name`        | string    | チーム名                                         |
| `operatorUids` | string[]  | オペレーター権限を持つメンバーの Firebase Auth UID リスト。Firestore Security Rules からサブコレクション参照なしに評価するための非正規化フィールド |
| `teamCode`    | string    | チーム参加に使用する固有英数字コード             |
| `createdAt`   | timestamp | チーム作成日時                                   |

## TeamMember

| フィールド    | 型 / 例                         | 意味              |
| ------------- | ------------------------------- | ----------------- |
| `userId`      | string                          | Firebase Auth UID        |
| `teamId`      | string                          | 所属チームの ID          |
| `role`        | `operator` \| `member` \| `rom` | チーム内ロール           |
| `displayName` | string                          | UI 表示に使う名前        |
| `avatarUrl`   | string \| null                  | アイコン画像 URL         |
| `plan`        | `light` \| `party`              | このメンバーの現在プラン |
| `joinedAt`    | timestamp                       | チーム参加日時           |
| `discordUsername` | string \| null              | Discord のユーザー名（`@` の後ろの一意な名前）。メンション用に本人またはオペレーターが任意登録（TE-012）。旧ドキュメントには存在せず null 扱い |
| `discordUserId`   | string \| null              | `discordUsername` をサーバー内検索で解決した Discord ユーザー ID のキャッシュ。Bot（Admin SDK）が書き込み、ユーザー名変更時にクライアントが null に戻す |
| `duties`          | string[]                    | 担当分野のコード値の配列（重複なし）。旧ドキュメントには存在せず `[]` 扱い。候補にない値は読み取り時に捨てる |
| `note`            | string \| null              | ひとこと（100 字以内・改行なし）。旧ドキュメントには存在せず null 扱い |

### 担当分野の候補（TE-014-1）

固定で、チームごとの追加・変更はできない。工程の「担当」（`Step.assigneeId`）や進め方の「役割」（`StepDef.roleLabel`）とは連動しない。

| コード値     | UI 表示名    |
| ------------ | ------------ |
| `cast`       | 出演         |
| `planning`   | 企画         |
| `edit`       | 編集         |
| `thumbnail`  | サムネ       |
| `moderation` | 配信サポート |
| `other`      | その他       |

### Security Rules（TE-014-3）

クライアントは更新の許可リスト（下記「業務ルール」）で `duties` / `note` を書ける。更新時に次の値を検証する。

- `duties` がある場合: list で、要素は候補のコード値のみ（`hasOnly`）、件数は 6 以下
- `note` がある場合: null、または 100 字以下の string

## ロール定義

| ロール       | コード値   | UI 表示名    | 権限                                       |
| ------------ | ---------- | ------------ | ------------------------------------------ |
| オペレーター | `operator` | オペレーター | チームの全権限（設定・メンバー管理・CRUD） |
| メンバー     | `member`   | メンバー     | スケジュール・タスクの CRUD                |
| ROM専        | `rom`      | ROM専        | 閲覧のみ（CUD 不可）                       |

### 後方互換

Firestore 既存ドキュメントに旧値が残っている場合、読み取り時に次のルールで変換する。書き込みは常に新値を使用する。

| 旧値     | 新値       |
| -------- | ---------- |
| `owner`  | `operator` |
| `editor` | `member`   |
| `viewer` | `rom`      |

## Firestore コレクション配置

```
teams/{teamId}                    ← Team ドキュメント
teams/{teamId}/members/{uid}      ← TeamMember ドキュメント
teamCodes/{teamCode}              ← チームコード → teamId の逆引きドキュメント
```

## 制約

- チームには少なくとも 1 人のオペレーターが必要（複数も可）
- `operatorUids` は `TeamMember.role === 'operator'` を持つメンバーの UID リストと同期する（非正規化）
- `TeamMember` の作成・削除と `role` / `plan` の変更は Callable Function（Admin SDK）だけが行う。クライアントが直接更新できるのは `displayName` / `avatarUrl` / `discordUsername` / `discordUserId` / `duties` / `note` のみで、対象は本人のドキュメント（オペレーターは全メンバー）。Security Rules の許可リストで強制する（`scripts/check-member-rules.mjs` で検証）
- メンバーが 1 人（自分のみ）のチームをソロチームと呼ぶ
- ソロチームのオペレーターが退出した場合、チームドキュメントとチームコードドキュメントは自動削除される
- `removeTeamMember` で削除後にメンバー数が 0 になった場合も同様に自動削除される（防御的処理）

### 後方互換

旧フィールド `ownerId: string` が残っている Firestore ドキュメントは、読み取り時に `[ownerId]` として `operatorUids` に変換する。書き込みは常に `operatorUids` を使用する。

## ロール遷移

```text
なし → operator  （チーム作成時）
なし → member    （チームコードで参加時）
member ⇄ rom     （オペレーターによるロール変更）
member → operator（オペレーターによる昇格）
operator → member（オペレーターによる降格）
```

制約: `operator` は少なくとも 1 人維持が必要。最後の 1 人の operator を `member` へ降格させる操作は禁止。

## 関連する隣接モデル

### user 側で管理するもの

- `currentTeamId`
- `teamIds`（複数チーム所属対応）

### plan 側で管理するもの

- チームへの参加可否判定（メンバー上限）
- プラン別制限値
