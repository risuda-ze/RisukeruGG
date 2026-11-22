# platform requirements

## PWA・オフライン

- **PF-001**: アプリは PWA として Android のホーム画面に追加でき、インストールプロンプトが表示される
- **PF-002**: Service Worker は直近のスケジュールデータをキャッシュし、オフライン時でも閲覧可能
- **PF-003**: オフライン時に書き込み操作を試みたユーザーには接続を要求するメッセージを表示

## バージョン表示・リリースノート

- **PF-004**: バージョン番号は `package.json` の `version` をビルド時に埋め込む
- **PF-005**: 個人設定（`/settings/profile`）の「アプリ情報」タブの「バージョン」に `v{version}` を表示し、クリックすると `/release-notes` を別タブで開く。PC・モバイル共通でアプリ内の入口はこの 1 か所とする
- **PF-006**: `/release-notes` は未ログインでも閲覧できる公開ページとし、認証ガードと BetaGate の対象外とする（`(protected)` の外に置く）。LP フッターにリンクを置き、`sitemap.xml` に含める
- **PF-007**: リリースノートの原稿はリポジトリ内の `src/lib/releaseNotes.ts` に持ち、ビルド時に静的生成する。ビルド時・実行時とも GitHub を含む外部からの取得は行わず、取得用のトークンを持たない
- **PF-008**: リリースノートは全バージョンを 1 ページに新しい順で並べ、各バージョンに `#v{version}` のアンカーを付ける。1 件はバージョン・公開日・本文を表示する。本文は Markdown として描画し、生の HTML は描画しない
- **PF-009**: 原稿は誰にでも公開できる内容とし、利用者向けの文章で記述する。内容は「見どころ！」「追加」「変更」「修正」「セキュリティ」の見出しに分けて書く。「見どころ！」はそのリリースで特に伝えたい変更を先頭にまとめる欄とする。利用者に見える変更に加えて、セキュリティに関する変更と不具合の修正を載せる。ただし、実際のコードが分かるような詳細や機微な情報（PR 番号・内部の名称・脆弱性の具体的な内容など）は書かない。画像は載せない
- **PF-010**: 次回分の原稿の下書きは本リポジトリの GitHub Releases に下書き（draft）として 1 件だけ持ち、リリースノートに載せる変更（PF-009）を `develop` へマージするたびに書き足す。リリース時は `develop` → `main` のリリース前に、`develop` 向けの PR で `version` を上げ、下書きの本文を原稿へ移す。`0.x` の間は追加・変更を含むリリースで minor、修正・セキュリティのみで patch を上げ、リリースノートに載せる変更が無いリリースでは上げない。下書きは `main` へのマージ後にタグ `v{version}` で公開する
- **PF-011**: 原稿の先頭のバージョンが `package.json` の `version` と一致すること、バージョンが重複しないことをユニットテストで保証する

## リリース時のデプロイとデータ移行

- **PF-012**: データ構造を変える変更は、変更仕様に既存データの扱い（移行の要否）を書く。旧データをそのまま読めない変更（フィールドの改名・型や値の意味の変更）と、不要になったデータの削除には、移行スクリプトを `scripts/` に置き、`scripts/migration-runbook.md` の「適用待ちの一回性スクリプト」に実行タイミングとともに載せる
- **PF-013**: 移行スクリプトは dry-run を既定とし、`--apply` を付けたときだけ書き込む。本番への適用後はリポジトリから削除する
- **PF-014**: リリース時は、Firebase へのデプロイ（rules・indexes・Functions）と適用待ちの移行スクリプトの実行を、リリースフローの中で行う

## リリース時のキーの入れ替え

- **PF-015**: 漏洩したキーが使える期間を短くするため、リリースのたびに、下表「入れ替えるキー」のすべてを新しい値に入れ替える。新しい値は発行元で新規に発行し、過去に使った値を再利用しない
- **PF-016**: 入れ替えたキーは、リリースのデプロイで本番に反映する。Vercel の環境変数は次のデプロイから、Cloud Functions の Secret は Functions の再デプロイから有効になるため、Functions に変更が無いリリースでも Functions を再デプロイする
- **PF-017**: 旧キーは、新キーで動作を確認した後に発行元で無効化する。発行と同時に旧キーが無効になるキー（下表の「旧キー」が「発行時に失効」）は、失効から反映までの間その機能が止まるため、リリースのデプロイの直前に入れ替える
- **PF-018**: キーの値は、リポジトリ・Issue・PR・リリースノート・チャットに書かない
- **PF-019**: 秘密の値を持つキーを追加・廃止する変更は、同じ PR で下表を更新する

### 入れ替えるキー

| サービス | キー | 設定先 | 発行元 | 旧キー |
| --- | --- | --- | --- | --- |
| Anthropic | `ANTHROPIC_API_KEY` | Vercel の環境変数 | Anthropic Console の API キー | 確認後に削除 |
| Discord | `DISCORD_BOT_TOKEN` | Vercel の環境変数と Cloud Functions の Secret（同じ値を両方に設定する） | Discord Developer Portal の Bot「Reset Token」 | 発行時に失効 |
| Firebase（Google Cloud） | `FIREBASE_SERVICE_ACCOUNT_KEY` | Vercel の環境変数。運用スクリプトを実行する端末に置いた鍵ファイルも差し替える | Google Cloud のサービスアカウントの鍵 | 確認後に削除 |
| Gmail | `GMAIL_APP_PASSWORD` | Cloud Functions の Secret | Google アカウントのアプリパスワード | 確認後に削除 |
| Stripe | `STRIPE_SECRET_KEY` | Cloud Functions の Secret | Stripe ダッシュボードの API キー（ロール） | ロール時に指定した期限で失効 |
| Stripe | `STRIPE_WEBHOOK_SECRET` | Cloud Functions の Secret | Stripe ダッシュボードの Webhook エンドポイント（署名シークレットのロール） | ロール時に指定した期限で失効 |
| Sentry | `SENTRY_AUTH_TOKEN` | Vercel の環境変数（ビルド時のみ使用） | Sentry の認証トークン | 確認後に削除 |
| アプリ内部 | `INTERNAL_API_SECRET` | Vercel の環境変数 | 32 バイト以上の乱数を生成する | 上書きで失効 |

Stripe の 2 つは、正式な値を設定して課金を開始した後のリリースから対象とする。

### 入れ替えない値

次は秘密ではない識別子・公開値のため、入れ替えない。

- `NEXT_PUBLIC_` で始まる値（Firebase の Web 設定、Sentry の DSN、計測 ID など。ブラウザへ配信される）
- Discord の `DISCORD_APPLICATION_ID` / `DISCORD_CLIENT_ID` / `DISCORD_PUBLIC_KEY`
- Stripe の `STRIPE_PRICE_ID`
- `GMAIL_USER`、`SENTRY_ORG`、`SENTRY_PROJECT`

## リリース時の開発環境の片付け

- **PF-020**: リリースのたびに、役目を終えたブランチ・ワークツリー・作業用ファイルを下表のとおり片付ける。片付けはリリースの公開まで終えた後に行う
- **PF-021**: `main`・`develop`・`review-reports` と、オープン中の PR があるブランチは削除しない
- **PF-022**: `develop` へ未マージのコミットを持つブランチ、未コミットの変更があるワークツリーは、一覧を見て不要と判断したものだけを削除する。機械的には削除しない

### 片付ける対象

| 対象 | 削除するもの | 確認方法 |
| --- | --- | --- |
| リモートのブランチ | `develop` へマージ済みのブランチ（`feature/`・`dependabot/`・`copilot/` など） | `git branch -r --merged origin/develop` |
| ワークツリー | 作業が済んだもの（エージェントやセッションが作ったものを含む）。削除後に `git worktree prune` を実行する | `git worktree list` |
| ローカルのブランチ | `develop` へマージ済みのもの、追跡先のリモートブランチが消えたもの、作業が済んだ `claude/`・`worktree-agent-` のもの。ワークツリーを先に削除する | `git branch -vv`（追跡先が消えたものは `gone` と表示される） |
| リモート追跡の参照 | リモートで削除済みのブランチの参照 | `git fetch --prune` |
| レビュー素材 | マージ済み PR の `review-artifacts/pr-<番号>/` | — |
| 鍵ファイル | 運用スクリプトの実行のために端末へ置いたサービスアカウントの鍵ファイルのうち、入れ替え前の古いもの | — |

片付けの後、ローカルの `main` と `develop` を最新にする。
