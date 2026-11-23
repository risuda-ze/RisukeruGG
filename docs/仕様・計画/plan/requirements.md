# plan requirements

## プラン管理

- **PL-001**: LIGHT プラン（無料）と PARTY プラン（有料）の 2 プランを提供する
- **PL-002**: LIGHT プランでは次の制限を適用する
  - 所属者の上限は 2 名（自分を含む）
  - スケジュール登録は無制限
  - 対応不可時間の入力は無制限
  - タスク作成は当月 5 件まで
  - コラボ調整作成は当月 3 件まで
  - 通知はシステムカテゴリのアプリ内通知のみ利用可能とする
  - 広告・告知枠（自社コンテンツの告知バナー。将来的に外部広告へ切り替える場合がある）をコンテンツ閲覧を妨げない位置に表示する
- **PL-003**: PARTY プランは全機能無制限とし、広告・告知枠を表示しない
- **PL-004**: プラン加入・変更はユーザー単位で行い、チームオーナー等が他メンバーのプランを代理課金・管理する機能は提供しない
- **PL-005**: 3 名以上のチームへ参加するには、参加者を含む全所属者が PARTY プランである必要がある。条件を満たさない場合は参加をブロックし、参加者へ要件を表示するとともに既存の LIGHT プランの全所属者へシステム通知を送る
- **PL-006**: LIGHT プランの月次上限に達した場合、該当操作をブロックし、PARTY プランへのアップグレード案内を表示する
- **PL-007**: LIGHT プランの月次カウント（タスク数・コラボ数）は毎月 1 日 0:00 JST に自動リセットする
- **PL-008**: PARTY プランの課金は Stripe Checkout + Customer Portal で行う（2026-07-17 決定 / T4）
  - 課金単位はユーザー単位・月額500円（税込）。新規契約時は Stripe の `trial_period_days = 14`（14日間無料トライアル）を付与する
  - 「PARTY プランへアップグレード」CTA は Cloud Functions の `createStripeCheckoutSession`（callable）を呼び出し、返却された Checkout URL へ遷移する。契約済み PARTY ユーザーには Customer Portal（`createStripePortalSession`）への「支払い設定」導線を表示する
  - プラン状態の反映は Stripe Webhook（`stripeWebhook`）が担う。`checkout.session.completed` → `plan = party`、`customer.subscription.deleted` → `plan = light`。支払い失敗（`invoice.payment_failed`）時の猶予は Stripe 側に委ね、降格は subscription 削除の受信時のみ行う
  - `users/{uid}.plan` / `planUpdatedAt` / `stripeCustomerId` および `teams/{teamId}/members/{uid}.plan` はサーバー（Webhook / Admin SDK）専用フィールドとし、Firestore ルールでクライアントからの書き換えを禁止する（PL-009）
  - 試用モード（PL-011）が有効な間は課金導線を表示しない。T4 完了・課金公開と同時に `FREE_PARTY_MODE` を無効化する
- **PL-009**: 月次制限値の強制はバックエンドで行い、クライアントだけで迂回できないようにする
- **PL-010**: 新規ユーザーのプラン関連フィールドは初期値として `plan = light`、`planUpdatedAt = 現在時刻`、`monthlyTaskCount = 0`、`monthlyCollabCount = 0`、`countResetAt = 現在時刻` で初期化する
- **PL-011**: 試用モード（FREE_PARTY_MODE）を提供する。動作テスト・公開試用のあいだ、課金なしで全ユーザーを PARTY プラン相当として扱うための一時的な運用モードである
  - 有効化は環境変数で行う。クライアント側は `NEXT_PUBLIC_FREE_PARTY_MODE`、サーバー側（Cloud Functions）は `FREE_PARTY_MODE` を用い、いずれも値が `'true'` のときのみ有効とする。両者は必ず揃える
  - 有効時は、プラン判定を一元化した共通関数（クライアント `src/lib/plan.ts` / サーバー `functions/src/lib/plan.ts`）が実プラン値に関わらず常に PARTY を返す。これにより次が一括で PARTY 挙動になる: バナー広告非表示（PL-002/PL-003）、月次上限（タスク・コラボ）の無効化（PL-006）、3名以上チーム参加要件（PL-005）のクリア、通知制限（PL-002）の解除、アップグレード CTA の非表示
  - **ユーザーデータ（`users/{uid}.plan` や `teams/{teamId}/members/{uid}.plan`）は書き換えない。** 判定ロジック側のみで吸収するため、試用終了時は環境変数を外すだけでデータ変更なしに LIGHT 制限へ戻る
  - フラグの強制はクライアントのみの制御にせず、サーバー側の判定（月次上限・チーム参加要件・リマインダー通知等）にも同一フラグを適用する（PL-009 / NFR-006 準拠）
  - 試用モードはあくまで暫定運用であり、正式な課金基盤（T4）が整い次第、フラグを外して通常運用へ移行する

## 注記

- タスク数 / コラボ数のインクリメント条件は task / collab カテゴリの作成フローに連動する
- 決済基盤は Stripe（Checkout + Customer Portal）。実装詳細・環境変数（Secrets）は README「Stripe 課金（T4）」を参照
