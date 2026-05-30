# user requirements

## 認証

- **US-001**: 認証は Firebase Authentication の Google OAuth2 のみを提供する。メールアドレス+パスワード認証は提供しない
- **US-003**: 認証セッションは自動リフレッシュし、不意なログアウトを発生させない
- **US-004**: 未認証ユーザーが保護ページにアクセスした場合はログインページへリダイレクトする
- **US-005**: Google OAuth2 で取得した認証情報は Google カレンダー連携にも再利用できるものとし、追加の OAuth フローを要求しない

## アカウント初期化

- **US-002**: 初回 Google ログイン時、User アカウントを自動作成する
- **US-006**: 初回ログイン時の初回チーム生成と初期ロール（`operator` / `member` / `rom`）付与は team カテゴリで定義する初期所属フローに従う

## アカウント削除と保持

- **US-007**: アカウント削除時、Firebase Auth 上の認証アカウントは削除する
- **US-008**: アカウント削除時、`users/{uid}` ドキュメントは完全削除せずゴースト状態へ移行する
- **US-009**: ゴースト状態の User には `uid`, `displayName`, `avatarUrl`, `deleted`, `deletedAt` を保持する
- **US-010**: ゴースト化時には `email`, `googleCalendar`, `teamIds` に加え、通知運用サブリソースである `notificationEndpoints`, `notificationSettings` を削除する
- **US-011**: 削除済みの ghost User は再ログイン時に復元しない
- **US-012**: 削除後に同じ Google アカウントで再度サインインした場合は、新しい active User を新規作成する
- **US-013**: 旧 ghost User は過去のタスク、コメント、通知、履歴表示の参照整合を維持するため削除せず残存させる

## 注記

- ソロチームの生成、初回 `operator` 付与、所属先の切り替えは team カテゴリの責務
