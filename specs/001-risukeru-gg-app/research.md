# Research: リスケるGG MVP

**Phase 0 完了日**: 2026-05-12
**更新日**: 2026-05-13（認証方式・プランシステム・チームコード対応）
**対象**: 技術的な未決定事項・設計判断

---

## 1. 楽観的ロック（同時編集コンフリクト検出）

**Decision**: Firestore `updatedAt` タイムスタンプ + クライアントサイドバージョン比較

**実装方針**:
- スケジュールエントリ・タスクに `updatedAt: Timestamp` フィールドを持たせる
- クライアントは読み込み時に `updatedAt` をローカルに保持する
- 保存時にFirestore transactionで「現在の `updatedAt` が読み込み時と同値か」を検証する
- 不一致（他ユーザーが先に保存）なら transaction abort → クライアントにエラーを返す
- UIは「他のメンバーが編集しました。最新内容を読み込んで再度編集してください」を表示する

**Rationale**: Firestoreにbuilt-inの楽観的ロック機能はないが、transactionと
`updatedAt`の比較でシンプルに実現できる。Firebase推奨パターン。

**Alternatives considered**:
- Pessimistic locking（編集中ロック）: 実装が複雑、UX悪化（他人が編集中は何もできない）→ 却下
- Last-write-wins（デフォルト上書き）: データ損失リスクが高い → 却下

---

## 2. Google OAuth2 認証（Firebase Authentication）

**Decision**: Firebase Authentication の Google プロバイダーを使用

**実装方針**:
- `signInWithPopup(auth, new GoogleAuthProvider())` を使用（リダイレクト方式は PWA で UX 悪化）
- 初回ログイン判定: `userCredential.additionalUserInfo?.isNewUser` で判定
- 初回ログイン時: Cloud Functions `onUserCreate` トリガーで `users/{uid}` ドキュメントを自動作成（plan: "light"、ソロチーム生成）
- Google OAuth で取得したアクセストークンを Googleカレンダー連携にも再利用するため、`googleCalendar.accessToken` と `refreshToken` を Firestore に保存（`users/{uid}` ドキュメント内、Security Rules で本人のみアクセス可）

**Rationale**: Firebase Authentication の Google プロバイダーはメールアドレス検証・セキュリティ管理を Google に委譲でき、パスワードリセット・アカウント乗っ取り対策が不要になる。OAuth トークンの再利用でカレンダー連携の追加認証フローも省略できる。

**Alternatives considered**:
- メールアドレス+パスワード認証: パスワードリセット・メール検証の実装コスト増。アクセストークン配布が必要で UX 複雑 → 廃止
- Firebase Anonymous Auth + アップグレード: プラン管理との整合性が取りにくい → 却下

---

## 2b. プラン管理システム（LIGHT / PARTY）

**Decision**: Firestoreの`users`ドキュメントにプランフィールドを埋め込み + Cloud Functions でバックエンド強制

**実装方針**:
- プランフィールド: `users/{uid}/plan: "light" | "party"`（Firestore）
- 月次カウント: `monthlyTaskCount`・`monthlyCollabCount` を `users/{uid}` に保存
- **制限チェック**: タスク作成・コラボ作成は Cloud Functions の Callable Function 経由で行い、Server 側でプランと月次カウントを検証してからFirestoreに書き込む（クライアント直接書き込みは禁止）
- **月次リセット**: Cloud Scheduler `15 0 1 * *`（UTC）= 毎月1日 0:00 JST。全LIGHTユーザーの `monthlyTaskCount` と `monthlyCollabCount` を 0 にリセット
- **アップグレードCTA**: フェーズ1では外部フォームURL（環境変数 `NEXT_PUBLIC_PARTY_SIGNUP_URL`）へのリンク。URLが未設定ならボタン非表示
- **3人目参加ブロック**: `joinTeam` Callable Function がメンバー数とプランを確認。ブロック時は既存のLIGHTメンバー全員に`system`カテゴリ通知を送信

**Rationale**: Firestoreドキュメントへの埋め込みはシンプル。制限チェックをCloud Functionsに集約することでNFR-011（バックエンド強制）を満たしつつ、フェーズ2の実際の課金処理追加が容易。

**Alternatives considered**:
- 別コレクション `plans/{uid}`: トランザクション処理が複雑になる。`users`への埋め込みで十分 → 却下
- クライアントサイドのみで制限チェック: NFR-011 違反（バックエンド強制必須）→ 却下

---

## 2c. チームコードシステム

**Decision**: ランダム英数字8文字コード + 独立`teamCodes/`コレクションで逆引き

**実装方針**:
- コード形式: 大文字英字+数字の8文字（例: `STRM7K2X`）。Crypto.randomBytes でランダム生成
- `teamCodes/{code}` コレクション: `{ teamId, createdAt }` のみ。コードをドキュメントIDとすることで O(1) ルックアップ
- **参加フロー**: `joinTeam` Callable Function で① `teamCodes/{code}` から teamId 取得 → ② プラン制限チェック → ③ 現チームから脱退（トランザクション）→ ④ 新チームに追加
- **リセット**: Owner が「コードをリセット」→ Cloud Function が新コード生成・`teams/{id}/teamCode` 更新・旧`teamCodes/{oldCode}`削除・新`teamCodes/{newCode}`作成（トランザクション）。旧コードは即時無効化
- **ソロチーム**: 初回ログイン時に自動作成。ソロチームのコードは非表示（外部共有しない）

**Rationale**: 独立`teamCodes`コレクションにより Security Rules でコードのプレフィックス検索なしに O(1) でチームを特定できる。リセット時の旧コード即時無効化も単純なドキュメント削除で実現。

**Alternatives considered**:
- `teams`のフィールドを直接クエリ（`where("teamCode", "==", code)`）: インデックス不要だが Firestore の制限上クエリが遅い → 却下
- JWT ベースの招待リンク: 有効期限管理が複雑、UI も複雑 → 却下

---

## 3. Googleカレンダー双方向同期

**Decision**: Google Calendar API v3 + Firebase Cloud Functions（ポーリング方式）

**実装方針**:
- OAuth 2.0 スコープ: `https://www.googleapis.com/auth/calendar` （読み書き権限）
- リフレッシュトークンをFirebase Storage（暗号化）またはFirestore（Securityルールで本人のみ）に保存
- **リスケるGG → Googleカレンダー**: スケジュールエントリ作成/更新/削除のFirestoreトリガーで
  即時同期（Cloud Functions onWrite）
- **Googleカレンダー → リスケるGG**: Cloud Schedulerで5分ごとにポーリング（フェーズ1）。
  フェーズ2でGoogle Calendar Push Notifications（webhook）に移行
- 同期失敗時: Firestoreの`users/{userId}/calendarSyncErrors`にエラーを記録 →
  クライアントが設定ページ表示時にチェックしてバナーを表示

**Rationale**: Push Notificationsはドメイン検証・証明書管理が必要で実装コストが高い。
フェーズ1はポーリングで十分なUXを実現し、フェーズ2で改善する。

**Alternatives considered**:
- Webhookの即時導入: ドメイン検証・SSL証明書・サーバー維持が必要 → フェーズ2に延期
- ユーザーが手動で同期ボタンを押す方式: UX不満足 → 却下

---

## 4. コラボ共有URLシステム

**Decision**: UUID v4ベースのURLトークン + Firestore `collabSessions/{tokenId}` ドキュメント

**実装方針**:
- セッション作成時にCloud Function（HTTP callable）でUUID v4生成 → ドキュメントIDとして使用
- 公開URL: `https://risukeru.gg/collab/{token}`
- `collab/[token]`ページはNext.jsの公開ルート（middleware除外）
- Firestore Security Rulesで`collabSessions`は読み取り無認証OK（URLトークン = 事実上の認証）
- 有効期限チェック: ページ表示時にクライアントサイドで`expiresAt`と現在時刻を比較
- 確定時: Cloud FunctionでステータスをCONFIRMEDに更新し、以降のセッション読み取りで
  「確定済み」ページを表示する

**Rationale**: UUID v4はランダム性が十分（2^122の空間）でブルートフォース攻撃は非現実的。
Firestoreのドキュメントを直接URLトークンで検索できシンプルな実装で済む。

**Alternatives considered**:
- JWT: 状態管理が複雑（失効処理が困難） → 却下
- ランダムな6桁コード: 衝突・推測リスクが高い → 却下

---

## 5. FCMプッシュ通知・配信リマインダー

**Decision**: FCM Web Push + Cloud Scheduler + Firestore onWrite トリガー

**実装方針**:
- Service WorkerをnextPWAで管理、`public/firebase-messaging-sw.js`に配置
- ユーザーが通知許可 → `getToken()` でFCMトークン取得 → Firestoreの`users/{userId}/fcmTokens[]`に保存
- **イベント駆動通知** （タスクアサイン・コラボ関係・システム）:
  FirestoreのonWriteトリガー（Cloud Functions）でFCM送信
- **スケジュール通知** （配信1時間前・15分前）:
  スケジュール保存時にCloud Schedulerのジョブをプログラマティックに作成
  （`google-cloud/scheduler`ライブラリ使用）

**通知カテゴリと通知フィルタリング**:
- ユーザーの通知設定をFirestore `users/{userId}/notificationPreferences` に保存
- Cloud Functionsが通知送信前にPreferencesをチェックし、OFFカテゴリはスキップ

**Rationale**: Firestoreトリガーは変更検知と通知送信を密結合できる。
Cloud Schedulerはサーバーレスで配信リマインダーの時刻指定が可能。

**Alternatives considered**:
- Web Cron（Vercel Cron）: Next.js側に通知ロジックが入り、Firebase Functions との二重管理が発生 → 却下
- 通知をクライアントサイドで処理: バックグラウンドでは動作しない → 却下

---

## 6. Firestoreリアルタイム同期とZustand管理

**Decision**: `onSnapshot()`リスナーをZustandストアで集中管理

**実装方針**:
- 各ストア（scheduleStore, tasksStore, notificationsStore）がFirestoreリスナーを保持
- `subscribe(teamId)` アクションでリスナーを開始し、unsubscribe関数をストアに保存
- Reactの`useEffect`でマウント時に`subscribe`、アンマウント時に`unsubscribe`を呼ぶ
- ストアのデータは常にFirestoreのonSnapshotで最新状態を維持する（ポーリング不要）

**Rationale**: ZustandはReactコンテキストなしでリスナーを管理でき、コンポーネントツリーに依存しない。
onSnapshotはFirestoreのリアルタイム機能を最大限に活用できる。

**Alternatives considered**:
- React Query + Firestore: ポーリングベースになりリアルタイム性が低下 → 却下
- Redux: ボイラープレートが多く、Zustandで十分 → 却下（シンプルさ原則）

---

## 7. Firebase Security Rules 設計方針

**Decision**: チームスコープ関数ベースのSecurity Rules

**主要ルール設計**:
```
// チームメンバー判定
function isTeamMember(teamId) {
  return request.auth != null &&
    exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid));
}

// Owner/Editor判定（書き込み権限）
function isOwnerOrEditor(teamId) {
  let member = get(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid));
  return isTeamMember(teamId) &&
    member.data.role in ['owner', 'editor'];
}

// プロダクト管理者判定（Custom Claimsベース）
function isProductAdmin() {
  return request.auth.token.role == 'product_admin';
}

// コラボセッション（公開読み取り可）
match /collabSessions/{sessionId} {
  allow read: if true;  // URLトークンが事実上の認証
  allow write: if isOwnerOrEditor(resource.data.teamId);
}
```

**Rationale**: 関数ベースのルールで重複を排除しつつ、各コレクションに明確なアクセス制御を適用。
コラボセッションの公開読み取りはURLトークンの推測困難性を事実上の認証として利用する。

---

## 8. 技術的リスクと軽減策

| リスク | 影響度 | 軽減策 |
|--------|--------|--------|
| Googleカレンダー API割り当て（無料枠: 1M req/day） | 中 | ポーリング間隔を5分に設定、Sparkプラン範囲内で収まる |
| Cloud Scheduler の料金（Blazeプラン必要） | 中 | 配信リマインダーはCloud Schedulerの代わりにFirestore onWriteで可能。Blaze移行まで遅延実行で対応 |
| FCMトークンの失効管理 | 低 | FCM送信時にInvalid tokenエラーを検知したら自動的にFirestoreから削除 |
| 楽観的ロックのUX | 低 | 競合は稀（配信スケジューラーの実際のユースケース）。競合時の再読込フローをシンプルに実装 |
