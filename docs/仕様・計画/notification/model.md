# notification model

## モデル方針

通知カテゴリでは、通知イベントそのものに加えて通知配送に必要な運用データも扱う。

保存場所は user 配下でもよいが、責務は notification カテゴリが持つ。

## 保存構造

```text
users/
  {uid}/
    notificationEndpoints/
      {token}/
        platform
        clientType
        browser
        permission
        lastSeenAt
        invalidAt
        invalidReason
        createdAt
        updatedAt

    notificationSettings/
      default/
        inApp
        push
        updatedAt

notifications/
  {notificationId}/
    receiverId
    type
    refEntityType
    refEntityId
    isRead
    createdAt
```

## Notification

- 役割: ユーザーへ提示するアプリ内通知本体
- 保存先: `notifications/{notificationId}`
- 主な論点:
  - `receiverId`
  - `type`
  - `refEntityType`
  - `refEntityId`
  - `isRead`
  - `createdAt`

### Notification の削除方針

- 以下は削除機能を持っていた時点の旧仕様であり、履歴参照のために残す。現行仕様としては採用しない

- ユーザーによる通知削除は `notifications/{notificationId}` の物理削除で扱う
- 通知の論理削除フラグや `deletedAt` は保持しない
- 削除可能なのは `receiverId` が操作ユーザー自身である通知に限る

## NotificationEndpoint

- 役割: Firebase Cloud Messaging の配送先端末を 1 件ずつ保持する
- 保存先: `users/{uid}/notificationEndpoints/{token}`
- ドキュメント ID: FCM token 文字列
- 主な論点:
  - `platform`
  - `clientType`
  - `browser`
  - `permission`
  - `lastSeenAt`
  - `invalidAt`
  - `invalidReason`
  - `createdAt`
  - `updatedAt`

### フィールド補足

- `permission`: 現在の通知許可状態
- `lastSeenAt`: 当該端末が最後に利用された時刻
- `invalidAt`: 無効 token と判定した時刻
- `invalidReason`: 無効化理由

## NotificationSettings

- 役割: 通知カテゴリごとの受信設定を保持する
- 保存先: `users/{uid}/notificationSettings/default`
- 主な論点:
  - `inApp.collab`
  - `inApp.task`
  - `inApp.reminder`
  - `inApp.system`
  - `push.collab`
  - `push.task`
  - `push.reminder`
  - `push.system`
  - `updatedAt`

## 今後詳細化する項目

- 種別一覧
- リンク先解決ルール
- 既読更新タイミング
- 配信チャネル別補助データ
- Notification と NotificationEndpoint の生成責務境界
