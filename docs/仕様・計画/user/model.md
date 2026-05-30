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

### user 配下に配置する通知サブリソース

次の通知運用データは `users/{uid}` 配下に配置するが、user ドキュメント本体のフィールドではなく notification カテゴリのサブリソースとして扱う。

- `users/{uid}/notificationEndpoints/{token}`
- `users/{uid}/notificationSettings/default`

- 保存場所は user 配下だが、仕様上の責務は notification カテゴリが持つ
- アカウント削除時は ghost User に引き継がず除去する

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
- `googleCalendar`
- `teamIds`
- その他の個人情報

## 削除時に除去する通知サブリソース

- `users/{uid}/notificationEndpoints`
- `users/{uid}/notificationSettings`

## 関連する隣接モデル

### team 側で管理するもの

- `currentTeamId`
- `teamIds`
- チーム内ロール

### notification 側で管理するもの

- `notificationEndpoints`
- `notificationSettings`
- 通知配送チャネルごとの運用データ

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
