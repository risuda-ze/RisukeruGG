# notification flows

### 通知生成フロー

1. ドメインイベントが発生する
2. 通知カテゴリと受信対象ユーザーを判定する
3. 受信対象ユーザーごとに Notification を 1 件ずつ生成する
4. `notifications/{notificationId}` に保存する
5. PARTY ユーザーかつ push 有効なカテゴリであれば NotificationEndpoint を取得する
6. `invalidAt = null` かつ `permission = granted` の endpoint にだけプッシュ通知を送る

### 通知閲覧フロー

1. 一覧またはドロップダウンに通知を表示する
2. ユーザーが対象通知を選択する
3. Notification を既読に更新する
4. 対象エンティティの詳細画面へ遷移する

### 通知 1 件削除フロー（廃止済み）

以下は削除機能を持っていた時点の旧フローであり、履歴参照のために残す。現行仕様としては採用しない。

1. ユーザーが設定/通知画面の通知一覧で自分の通知を 1 件選ぶ
2. 削除操作を実行する
3. 対象 Notification の `receiverId` が操作ユーザー自身であることを確認する
4. 既読・未読を問わず `notifications/{notificationId}` を物理削除する
5. 一覧件数と未読件数を再計算する

### 通知全件削除フロー（廃止済み）

以下は削除機能を持っていた時点の旧フローであり、履歴参照のために残す。現行仕様としては採用しない。

1. ユーザーが設定/通知画面の通知一覧で全件削除操作を実行する
2. 操作ユーザーが受信者である Notification 群を取得する
3. 各 Notification を既読・未読を問わず物理削除する
4. 一覧を空状態へ更新し、未読件数を 0 に再計算する

### NotificationEndpoint 登録フロー

1. ユーザーが通知許可を与える
2. FCM token を取得する
3. `users/{uid}/notificationEndpoints/{token}` を作成または更新する
4. 端末情報と permission を保存する

### 無効 endpoint 掃除フロー

1. プッシュ送信時に token 無効エラーを検知する
2. 対象 endpoint に `invalidAt` と `invalidReason` を記録する
3. 後続の送信対象から除外する
4. 保持ポリシーに応じて後で削除する
