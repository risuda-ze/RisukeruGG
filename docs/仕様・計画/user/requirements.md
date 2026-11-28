# user requirements

## 認証

- **US-001**: 認証は Firebase Authentication の Google OAuth2 のみを提供する。メールアドレス+パスワード認証は提供しない
- **US-003**: 認証セッションは自動リフレッシュし、不意なログアウトを発生させない
- **US-004**: 未認証ユーザーが保護ページにアクセスした場合はログインページへリダイレクトする
- **US-005**: ログイン時は Google カレンダーの権限を要求しない。カレンダー権限は Google カレンダー書き出し（schedule の SC-008 系）の操作時にのみ追加で要求し（incremental auth）、取得したアクセストークンは保存しない

## アカウント初期化

- **US-002**: 初回 Google ログイン時、User アカウントを自動作成する
- **US-006**: 初回ログイン時の初回チーム生成と初期ロール（`member` / `staff`）付与は team カテゴリで定義する初期所属フローに従う

## アカウント削除と保持

- **US-007**: アカウント削除時、Firebase Auth 上の認証アカウントは削除する
- **US-008**: アカウント削除時、`users/{uid}` ドキュメントは完全削除せずゴースト状態へ移行する
- **US-009**: ゴースト状態の User には `uid`, `displayName`, `avatarUrl`, `deleted`, `deletedAt` を保持する
- **US-010**: ゴースト化時には `email`, `googleCalendarExports`, `teamIds` を削除する
- **US-011**: 削除済みの ghost User は再ログイン時に復元しない
- **US-012**: 削除後に同じ Google アカウントで再度サインインした場合は、新しい active User を新規作成する
- **US-013**: 旧 ghost User は過去のタスク、コメント、履歴表示の参照整合を維持するため削除せず残存させる

## クローズドベータ入場制限（T11）

正式リリース（課金開始）までの期間、招待したテスターのみがアプリを利用できるようにする入場制限。ゲートの正は Firestore に置き、環境変数はクライアントの表示切替にのみ使う（アプリ層ゲート＋利用申請フロー方式。Identity Platform へのアップグレードやブロッキング関数方式は採用しない）。

- **US-014**: クローズドベータのゲートは Firestore `app_config/beta { enabled: boolean }` を正とし、`enabled=true` の期間のみ入場制限を有効化する。クライアントの表示切替用に `NEXT_PUBLIC_CLOSED_BETA` を併用する
- **US-015**: 許可ユーザーは Firestore `beta_allowlist/{email}`（ドキュメント ID = 小文字正規化したメールアドレス）で管理する。メールアドレスはソースコード・リポジトリに記録しない
- **US-016**: `beta_allowlist` は列挙・推測確認を防ぐため、`firestore.rules` で `list` を全面拒否し、`get` は認証済みユーザーが自分のメール（`request.auth.token.email`）と一致する ID のみ許可する。メール/パスワード認証ユーザーは `email_verified == true` を条件に含める（Google ログインは常に検証済み）
- **US-017**: 入場制限が有効かつ allowlist 非在籍のユーザーは、主要なチームデータへのアクセスを `firestore.rules` で拒否する（クライアント制御のみに依存しない）
- **US-018**: allowlist 外のユーザーはログイン後、待機画面（サインアウトと利用申請のみ）を表示する。待機画面の表示判定は `NEXT_PUBLIC_CLOSED_BETA === 'true'` のときだけ行い、自分の allowlist ドキュメントの get で在籍を確認する
- **US-019**: 待機画面からの利用申請は Callable Function が `beta_requests/{uid}` に記録し、既存の問い合わせメール基盤（Gmail SMTP）で管理者へ通知する。ドキュメント ID を uid とすることで多重申請は上書きで抑止する
- **US-020**: 入場制限は `app_config/beta.enabled = false`（または doc 削除）と `NEXT_PUBLIC_CLOSED_BETA` の解除で全ユーザーに即時開放でき、コード変更・データ移行を必要としない。待機中に作成されたアカウント・ソロチームはそのまま正式利用へ移行する

## 注記

- ソロチームの生成、初回の `member` 付与、所属先の切り替えは team カテゴリの責務
