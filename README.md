# リスケるGG

**撮影も、コラボも、編集もGGなスケジュールを**
配信スケジュール、もうリスケしない。

ゲーム配信者（Twitch・YouTube）およびその制作チームを対象とした、**配信者特化型チームスケジュール管理アプリ**。
配信枠の管理・コラボ調整・編集タスク管理を一元化し、配信者が本業（配信）に集中できる環境を提供します。

---

## 目次

1. [機能概要](#機能概要)
2. [デザインシステム](#デザインシステム)
3. [技術スタック](#技術スタック)
4. [開発環境セットアップ](#開発環境セットアップ)
5. [コマンド一覧](#コマンド一覧)
6. [テストデータ投入](#テストデータ投入)
7. [環境変数](#環境変数)
8. [アーキテクチャ](#アーキテクチャ)
9. [画面一覧](#画面一覧)
10. [料金プラン](#料金プラン)

---

## 機能概要

| 機能             | 概要                                                             |
| ---------------- | ---------------------------------------------------------------- |
| スケジュール管理 | 配信枠の作成・編集・削除。週/月カレンダービューでチーム共有      |
| コラボ調整       | コラボ打診の送受信・候補日程調整・確定枠の自動カレンダー登録     |
| タスク管理       | カンバン形式（TODO / 進行中 / 完了）で撮影・編集・告知を一元管理 |
| チーム管理       | メンバー招待・ロール設定（オーナー / 編集者 / 閲覧者）           |
| 通知設定         | LIVEリマインダー・コラボ返答・タスク更新の通知（プラン別）       |
| PWA対応          | ホーム画面追加・プッシュ通知（Android Chrome）                   |

---

## デザインシステム

ネオン・シアンを基調としたダークテーマのゲーミングUIデザイン。
（トークンの正は `src/app/globals.css`。本表は主要トークンの抜粋）

### カラーパレット

| トークン           | 値        | 用途                               |
| ------------------ | --------- | ---------------------------------- |
| `--bg`             | `#0a0a18` | ページ背景                         |
| `--surface`        | `#11112a` | サイドバー・ヘッダー背景           |
| `--card`           | `#16163a` | カード背景                         |
| `--card-raised`    | `#1c1c42` | 浮き上がりカード背景               |
| `--primary`        | `#3fb6e0` | プライマリアクション・ナビアクティブ |
| `--primary-300`    | `#8fe0ff` | アクセントテキスト・アイコン       |
| `--success`        | `#3dd68c` | 完了・成功状態                     |
| `--warning`        | `#ef9f27` | 警告・保留状態                     |
| `--danger`         | `#f0506e` | エラー・削除・LIVE状態             |
| `--info`           | `#5bc8fa` | 情報・ホバーアクセント             |
| `--pink`           | `#ec4f95` | ボタンホバーシフト色               |
| `--text-primary`   | `#e4e4ee` | 見出し・重要テキスト（13.5:1 AAA） |
| `--text-secondary` | `#a8a8c0` | 本文・説明文（6.2:1 AA）           |
| `--text-muted`     | `#7070a0` | 補足・プレースホルダー             |

### タイポグラフィ

- **見出し**: Space Grotesk（英数字）
- **本文**: Zen Kaku Gothic New（日本語）
- **数値**: Space Grotesk（タブラー数字）

### グロー効果

- `--glow-primary`: パープルグロー（ボタンフォーカス・アクティブナビ）
- `--glow-pink`: ピンクグロー（ボタンホバー）
- `--glow-success/warning/danger`: セマンティックグロー

### コンポーネントクラス（グローバルCSS）

| クラス               | 説明                                      |
| -------------------- | ----------------------------------------- |
| `.btn`, `.btn--*`    | ボタン（primary/ghost/danger/success/subtle） |
| `.ds-card`, `.ds-card--hover` | カード（ホバーリフト付き）       |
| `.ds-badge`, `.ds-badge--*`   | バッジ（各セマンティックカラー） |
| `.navlink`, `.navlink--active` | サイドバーナビリンク           |
| `.bottom-nav-item`   | ボトムナビアイテム（ピルインジケーター）  |
| `.ds-progress`       | プログレスバー（グロー付き）              |
| `.skeleton`          | スケルトンローディング                    |

---

## 技術スタック

| レイヤー       | 技術                                                    |
| -------------- | ------------------------------------------------------- |
| フロントエンド | Next.js 14 (App Router) + TypeScript 5 + Tailwind CSS 4 |
| 状態管理       | Zustand                                                 |
| フォーム       | React Hook Form + Zod                                   |
| カレンダー     | react-big-calendar                                      |
| カンバン       | @hello-pangea/dnd                                       |
| 認証           | Firebase Authentication（Google SSO / メール認証）      |
| DB             | Cloud Firestore（リアルタイム同期）                     |
| ストレージ     | Firebase Storage                                        |
| 通知           | Firebase Cloud Messaging（FCM）                         |
| サーバーレス   | Firebase Cloud Functions                                |
| ホスティング   | Vercel                                                  |
| テスト         | Vitest（ユニット）/ Playwright（E2E）                   |
| 開発環境       | Docker + Firebase Emulator Suite                        |

---

## 開発環境セットアップ

### 前提条件

- [Node.js](https://nodejs.org/) 18以上
- [pnpm](https://pnpm.io/) 9以上
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### 手順

```bash
# 1. リポジトリのクローン
git clone <repository-url>
cd RisukeruGG

# 2. 依存パッケージのインストール
pnpm install

# 3. 環境変数ファイルの作成
cp .env.local.example .env.local
# .env.local を編集して Firebase の設定を入力

# 4. Docker コンテナの起動（Firebase Emulator + Next.js）
docker compose up -d

# functions/package.json / pnpm-lock.yaml を更新した場合も、emulator 起動時に
# Functions 依存関係が自動同期されます。

# 5. テストデータの投入（コンテナ起動後）
scripts\seed.bat
```

アプリは http://localhost:3000、Firebase Emulator UI は http://localhost:4000 で確認できます。

---

## コマンド一覧

```bash
pnpm dev            # 開発サーバー起動 (localhost:3000)
pnpm build          # プロダクションビルド
pnpm typecheck      # TypeScript 型チェック
pnpm lint           # ESLint 実行
pnpm lint:fix       # ESLint 自動修正
pnpm format         # Prettier フォーマット

pnpm test           # Vitest ユニットテスト
pnpm test:watch     # Vitest ウォッチモード
pnpm test:coverage  # カバレッジ付きテスト
pnpm test:e2e       # Playwright E2E テスト
pnpm test:e2e:ui    # Playwright UI モード
```

---

## テストデータ投入

Docker の Firebase Emulator が起動した状態で、以下のバッチファイルを実行してください。

```bat
scripts\seed.bat
```

投入されるテストデータ:

| 種別         | 内容                                           |
| ------------ | ---------------------------------------------- |
| チーム       | 2チーム（配信チームα / 編集チームβ）           |
| メンバー     | 6人（operator×2・member×2・rom×2）             |
| スケジュール | 先月・当月・来月分（週1回配信 + 毎週土曜動画） |
| タスク       | 14件（未着手・進行中・完了 + 連携有無を網羅）  |
| 通知         | 10件（すべて未読）                             |
| コラボ       | 5件（open / confirmed / expired / cancelled）  |

**テストアカウント（パスワード共通: `password123`）:**

| 表示名           | メールアドレス     | ロール   |
| ---------------- | ------------------ | -------- |
| 配信太郎         | taro@example.com   | operator |
| 運営花子         | hanako@example.com | operator |
| マネージャー健太 | kenta@example.com  | member   |
| ROM三郎          | saburo@example.com | rom      |
| サポート里奈     | rina@example.com   | member   |
| ROM美香          | mika@example.com   | rom      |

---

## 環境変数

`.env.local.example` をコピーして `.env.local` を作成し、Firebase の設定を入力してください。

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=   # GA4 計測ID。設定時のみ Firebase Analytics を有効化
NEXT_PUBLIC_USE_EMULATORS=true   # Firebase エミュレータ使用時（Analytics は自動で無効化）

# 試用モード（PL-011）: 'true' のとき課金なしで全ユーザーを PARTY プラン相当として扱う。
# クライアント・サーバーの両方で有効化する必要がある。試用終了時は両方を外す（未設定 = 通常運用）。
NEXT_PUBLIC_FREE_PARTY_MODE=true   # クライアント（広告非表示・CTA非表示・通知制限解除の判定）

# クローズドベータ入場制限（T11）: 'true' のとき allowlist 外ユーザーに待機画面を表示する。
# 表示切替用のクライアントフラグ。実際のデータアクセス拒否は firestore.rules と
# Firestore の app_config/beta { enabled } / beta_allowlist が担保する（下記「クローズドベータ」参照）。
NEXT_PUBLIC_CLOSED_BETA=true
```

Cloud Functions 側は `functions/` の環境変数（`.env` もしくはデプロイ時の設定）に次を追加する:

```env
# 試用モード（PL-011）のサーバー側フラグ。クライアントの NEXT_PUBLIC_FREE_PARTY_MODE と必ず揃える。
# 月次上限・チーム参加要件（PL-005）・リマインダー通知などサーバー判定に適用される。
FREE_PARTY_MODE=true
```

### エラー監視・アナリティクス（T10）

| 環境変数 | 用途 | 未設定時の挙動 |
| --- | --- | --- |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry のプロジェクト DSN。クライアント・サーバー両方のエラー収集に使用。 | **完全に無効（no-op）**。ビルドにも影響しない。 |
| `SENTRY_ORG` | Sentry の組織スラッグ（ソースマップアップロード用）。 | ソースマップをアップロードしない。 |
| `SENTRY_PROJECT` | Sentry のプロジェクトスラッグ（ソースマップアップロード用）。 | ソースマップをアップロードしない。 |
| `SENTRY_AUTH_TOKEN` | ソースマップアップロード用の認証トークン。**ビルド環境（CI）でのみ設定**。 | ソースマップアップロードをスキップ（ローカルビルド・トークン無しでも `pnpm build` は成功する）。 |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | GA4 計測ID。ページビュー・主要イベント計測に使用。 | Analytics 未初期化。すべての計測呼び出しが no-op。 |

- **Sentry**: `NEXT_PUBLIC_SENTRY_DSN` が空の場合はクライアント・サーバーとも初期化せず、イベントを一切送信しません。本番の CI ビルドでソースマップをアップロードする場合のみ `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` を設定してください。`tracesSampleRate` は 0.1、`sendDefaultPii` は無効（個人情報を送信しない）設定です。
- **Cloud Functions のエラー監視**: Firebase 標準の Cloud Logging / Error Reporting を利用するため、Functions 側に Sentry 導入は不要です（追加設定なし）。
- **Firebase Analytics（GA4）**: `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` が設定され、かつブラウザが対応（`isSupported()` が true）の場合のみ有効化します。エミュレータ利用時（`NEXT_PUBLIC_USE_EMULATORS=true`）は無効化されます。ページビューと主要イベント（`team_create` / `schedule_create` / `collab_confirm` / `upgrade_cta_click`）を計測します。

### クローズドベータ入場制限（T11）

正式リリース（課金開始）までは、招待したテスターのみがアプリを利用できるようにする仕組みです。ゲートの正は Firestore にあり、環境変数はクライアントの表示切替にのみ使います。

| 設定 | 役割 |
| --- | --- |
| `NEXT_PUBLIC_CLOSED_BETA=true` | クライアント側の表示切替。allowlist 外ユーザーに待機画面を表示する。 |
| `app_config/beta { enabled: true }`（Firestore） | ゲートの正。`firestore.rules` が `get()` で参照し、`enabled=true` かつ allowlist 非在籍のユーザーのデータアクセスを拒否する。 |
| `beta_allowlist/{email}`（Firestore） | 許可ユーザー。ドキュメント ID = 小文字正規化したメールアドレス。**メールはリポジトリに記録しない**。 |
| `beta_requests/{uid}`（Firestore） | 利用申請の記録（Callable `requestBetaAccess` が書き込み、管理者へ通知メール送信）。 |

有効化の手順:

1. Firestore コンソールで `app_config/beta` ドキュメントを作成し `enabled: true`（boolean）を設定する。
2. `.env.local` に `NEXT_PUBLIC_CLOSED_BETA=true` を追加する。
3. Cloud Functions の Secret `GMAIL_USER` / `GMAIL_APP_PASSWORD`（お問い合わせ機能と共用）を設定する。
4. 招待するテスターを allowlist に登録する（下記スクリプト）。

allowlist の管理（`FIREBASE_SERVICE_ACCOUNT_KEY` にサービスアカウント JSON を設定して実行）:

```bash
node scripts/beta-allowlist.mjs add    user@example.com [別のメール...]
node scripts/beta-allowlist.mjs remove user@example.com
node scripts/beta-allowlist.mjs list
```

解除（課金開始時）: `app_config/beta.enabled = false`（または doc 削除）＋ `NEXT_PUBLIC_CLOSED_BETA` を外すと、全ユーザーが即時開放されます。待機中に作成されたアカウント・ソロチームはそのまま利用に移行します。

### Stripe 課金（T4）

PARTY プラン（ユーザー単位・月額500円税込・14日間無料トライアル）の課金を Stripe Checkout + Customer Portal で提供します。プラン状態の反映は Webhook が担い、`users/{uid}.plan` と所属チームの `teams/{teamId}/members/{uid}.plan` を更新します。

関連 Cloud Functions:

| Function | 種別 | 役割 |
| --- | --- | --- |
| `createStripeCheckoutSession` | callable | Checkout セッションを作成し遷移 URL を返す（`trial_period_days = 14`、`client_reference_id = uid`） |
| `createStripePortalSession` | callable | Customer Portal（解約・支払い方法変更）へのセッションを作成 |
| `stripeWebhook` | HTTP (onRequest) | 署名検証のうえプラン遷移を反映。`stripeEvents/{eventId}` で冪等性を担保 |

Webhook イベントとプラン遷移:

| イベント | plan 遷移 |
| --- | --- |
| `checkout.session.completed` | → `party`（`stripeCustomerId` も保存） |
| `customer.subscription.deleted` | → `light` |
| `invoice.payment_failed` | 変更なし（猶予は Stripe 側。降格は subscription 削除時のみ） |

環境変数 / Secrets（Cloud Functions 側）:

| 変数 | 種別 | 用途 | 未設定時の挙動 |
| --- | --- | --- | --- |
| `STRIPE_SECRET_KEY` | Secret | Stripe シークレットキー（`sk_...`） | 該当 Function 実行時にのみ参照。未設定でもデプロイ・ビルドは成功 |
| `STRIPE_PRICE_ID` | Secret | PARTY プランの Price ID（`price_...`） | 同上 |
| `STRIPE_WEBHOOK_SECRET` | Secret | Webhook 署名シークレット（`whsec_...`） | 同上（未設定時は署名検証に失敗し 400 を返す） |
| `NEXT_PUBLIC_APP_URL` | 環境変数 | Checkout 成功/キャンセル・Portal 戻り先 URL のベース | `https://risukeru.gg` にフォールバック |

**本番セットアップ手順**（実 Stripe アカウントで一度だけ実施）:

1. Stripe ダッシュボードで **Product** を作成し、**Price** を「月額500円（税込・JPY）／継続」で登録して Price ID（`price_...`）を控える。
2. **Webhook エンドポイント**を登録する。URL は デプロイ後の `stripeWebhook` の関数 URL（例: `https://asia-northeast1-<project>.cloudfunctions.net/stripeWebhook`）。購読イベントは `checkout.session.completed` / `customer.subscription.deleted` / `invoice.payment_failed`。発行された署名シークレット（`whsec_...`）を控える。
3. **Customer Portal** を有効化する（Billing → Customer portal の設定で解約・支払い方法変更を許可）。
4. Secrets を登録する:
   ```bash
   firebase functions:secrets:set STRIPE_SECRET_KEY
   firebase functions:secrets:set STRIPE_PRICE_ID
   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
   ```
5. `functions` の環境変数に `NEXT_PUBLIC_APP_URL` を本番ドメインで設定する（未設定時は既定ドメインを使用）。
6. デプロイ後、Stripe のテストモードで Checkout → Webhook 受信までを疎通確認する。
7. 課金公開と同時に試用モード（`FREE_PARTY_MODE` / `NEXT_PUBLIC_FREE_PARTY_MODE`）を無効化する。

> クライアントからの `plan` / `planUpdatedAt` / `stripeCustomerId` 書き換えは Firestore ルールで禁止しています（サーバー専用フィールド。PL-009）。

---

## アーキテクチャ

```
src/
├── app/                  # Next.js App Router ページ
│   ├── (protected)/      # 認証保護ルート
│   └── globals.css       # デザイントークン + コンポーネントCSS
├── components/
│   ├── layout/           # AppShell, Sidebar, TopBar, BottomNav
│   └── ui/               # Button, Card, Badge, Avatar, Input, ...
├── lib/
│   ├── firebase/         # Firebase 初期化・認証
│   └── repositories/     # Firestore データアクセス層
└── store/                # Zustand ストア

functions/src/            # Firebase Cloud Functions
tests/
├── unit/                 # Vitest ユニットテスト
└── e2e/                  # Playwright E2E テスト
```

**主要な設計方針:**

- Firestoreへのアクセスは `src/lib/repositories/` 経由に限定
- コレクション構造は常に `teams/{teamId}/...` サブコレクション
- デザインシステムは `globals.css` で CSS カスタムプロパティ + コンポーネントクラスとして管理
- コンポーネントは `.btn`, `.ds-card`, `.ds-badge` 等のCSSクラスを優先使用
- レスポンシブ: `md` (768px) ブレークポイントでサイドバー/ボトムナビを切り替え

---

## 画面一覧

| 画面名             | パス             | 説明                           |
| ------------------ | ---------------- | ------------------------------ |
| ランディングページ | `/`              | サービス紹介・ログイン導線     |
| ログイン           | `/login`         | Google認証・メール認証         |
| チーム作成 / 参加  | `/onboarding`    | 初回セットアップ               |
| ダッシュボード     | `/dashboard`     | 統計・今日のスケジュール・通知 |
| スケジュール       | `/schedule`      | カレンダービュー（週 / 月）    |
| 配信枠詳細         | `/schedule/[id]` | 配信枠の詳細・編集             |
| タスクボード       | `/tasks`         | カンバンビュー                 |
| コラボ管理         | `/collabs`       | 打診一覧・日程調整             |
| メンバー管理       | `/team`          | メンバー一覧・招待・ロール設定 |
| 通知一覧           | `/notifications` | 全通知履歴                     |
| 設定               | `/settings`      | プロフィール・チーム設定・連携 |

---

## 料金プラン

| 機能           | LIGHTプラン（無料）  | PARTYプラン（¥500/人・月）   |
| -------------- | -------------------- | ---------------------------- |
| メンバー数     | 2人まで              | 無制限                       |
| タスク管理     | 月5件まで            | 無制限                       |
| コラボ調整     | 月3件まで            | 無制限                       |
| 通知           | LIVEリマインダーのみ | 全種類                       |
| 広告・告知枠   | あり                 | なし                         |
| 無料トライアル | —                    | 14日間（正式課金開始時に提供予定） |

---

## ドキュメント

- **正本仕様**: [docs/仕様・計画/risukeru_gg_spec.md](docs/仕様・計画/risukeru_gg_spec.md)（カテゴリ別の詳細は `docs/仕様・計画/` 配下）
- **変更仕様・実装計画**: `docs/変更仕様/`
- **LPデザインモック**: [docs/LP/risukeru_gg_lp.html](docs/LP/risukeru_gg_lp.html)（+ `css/` / `js/`）
  本番LP（`src/app/page.tsx`）のデザイン変更を検討する際の参照用に残している静的HTMLモック。本番実装とは独立しており、ビルド・配信には含まれない。ブラウザで直接開いて確認する。
