# user model

## モデル方針

User は、認証済み利用者のアカウント状態を表す。

このカテゴリでは、認証とアカウントライフサイクルに直接関係する項目だけを正本化する。所属チームやロールの詳細は team を参照する。

## User

### Active 状態

| フィールド      | 型 / 例            | 意味                              |
| --------------- | ------------------ | --------------------------------- |
| `uid`           | string             | Firebase Auth の利用者識別子      |
| `displayName`   | string             | UI 表示に使う表示名               |
| `email`         | string             | Google アカウントのメールアドレス |
| `avatarUrl`     | string \| null     | アイコン画像 URL                  |
| `deleted`       | false または未設定 | 有効なアカウントであることを示す  |
| `deletedAt`     | null または未設定  | 削除前は値を持たない              |
| `googleCalendarExports` | map / 未設定 | Google カレンダー書き出し（schedule の SC-008 系）が使う状態。キーは `teamId`、値は `{ calendarId: string, exportedAt: timestamp | null }`。`calendarId` は再書き出し時に同じ専用副カレンダーへ書き込むため、`exportedAt` は最終書き出し日時を画面に表示するために使う。書き込みは本人のみ。詳細は [schedule/model.md](../schedule/model.md) |

### Ghost 状態

アカウント削除後は `users/{uid}` を完全削除せず、表示情報だけを残した軽量ドキュメントとして保持する。

| フィールド    | 型 / 例        | 意味                         |
| ------------- | -------------- | ---------------------------- |
| `uid`         | string         | 削除後も参照される識別子     |
| `displayName` | string         | 過去データ表示に使う名前     |
| `avatarUrl`   | string \| null | 過去データ表示に使うアイコン |
| `deleted`     | true           | ゴースト状態であることを示す |
| `deletedAt`   | timestamp      | アカウント削除日時           |

## deletedAt を残す理由

- `deletedAt` は現時点でシステムの業務ロジックには使用していない
- ただし、いつ ghost 化されたかを運用上確認できるように残す
- 将来、保持期間ベースの匿名化・完全削除・UI 表示を行う場合の基準時刻として利用できる
- そのため `deletedAt` は「現時点では未使用だが保持するメタデータ」として扱う

## 削除時に除去する項目

ゴースト化では、次のような個人情報・運用情報を保持しない。

- `email`
- `googleCalendarExports`（Google 側の副カレンダー自体は削除しない）
- `teamIds`
- その他の個人情報

## 関連する隣接モデル

### team 側で管理するもの

- `currentTeamId`
- `teamIds`
- チーム内ロール

### ui 側で管理するもの

- `theme`（テーマの選択。[ui/model.md](../ui/model.md) の `ThemePreference`）

## 状態遷移

```text
active -> ghost
```

- active: Firebase Auth で認証可能
- ghost: Firestore 上の表示情報のみ残存し、Firebase Auth では認証不可

## 再登録時の扱い

- 同じ Google アカウントで再度サインインした場合でも、既存の ghost User は active に戻さない
- 再サインイン時は新しい active User を別レコードとして作成する
- 旧 ghost User は履歴参照用データとして残し、過去エンティティの参照先を維持する
