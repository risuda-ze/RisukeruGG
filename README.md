# リスケるGG

ゲーム配信者（Twitch・YouTube）およびその制作チームを対象とした、**配信者特化型チームスケジュール管理アプリ**。
配信枠の管理・コラボ調整・編集タスク管理を一元化し、配信者がコンテンツ制作・配信に集中できる環境を提供します。

アプリの基本思想として、小さなタスク管理アプリではなく、スケジュール管理・タスク管理・コラボ調整など必要な機能を集約し、チーム管理をよりミニマルに実現できることに重視しています。特に入力補助やAIツールとの連携（API連携）を含めることで、WEBアプリの操作を極力減らし、チーム管理のハードルを下げることを意識しています。

アプリ内で情報を共有することでそれぞれの管理業務で重複して情報を管理する必要がなくなります。

---

## 目次

- [リスケるGG](#リスケるgg)
  - [目次](#目次)
  - [料金プラン](#料金プラン)
  - [機能概要](#機能概要)
  - [開発環境セットアップ](#開発環境セットアップ)
    - [前提条件](#前提条件)
    - [手順](#手順)
  - [コマンド一覧](#コマンド一覧)
  - [テストデータ投入](#テストデータ投入)
  - [環境変数](#環境変数)
    - [エラー監視・アナリティクス](#エラー監視アナリティクス)
  - [アーキテクチャ](#アーキテクチャ)
  - [画面一覧](#画面一覧)

---

## 料金プラン

| 機能           | LIGHTプラン（無料）  | PARTYプラン（¥500/人・月）         |
| -------------- | -------------------- | ---------------------------------- |
| メンバー数     | 2人まで              | 無制限                             |
| タスク管理     | 月5件まで            | 無制限                             |
| コラボ調整     | 月3件まで            | 無制限                             |
| 通知           | LIVEリマインダーのみ | 全種類                             |
| 広告・告知枠   | あり                 | なし                               |
| 無料トライアル | —                    | 14日間（正式課金開始時に提供予定） |

## 機能概要

| 機能             | 概要                                                                                                                                                           |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| スケジュール管理 | 撮影予定やコラボ予定などのチーム共有の予定を共有できます。また、個人のGoogleカレンダーと連携することでチームの予定を個人スケジュールに反映することができます。 |
| コラボ調整       | 他配信者とのコラボの際の日程調整を行います。決定した予定はスケジュール登録され、変更も可能です。                                                               |
| タスク管理       | コンテンツ制作や会議などチームのタスクを管理・共有できます。                                                                                                   |
| チーム管理       | アプリ内で使用するチーム特有の設定ができます。                                                                                                                 |
| 通知設定         | Discord Botを使用したリマインダー通知を設定できます。                                                                                                          |
| PWA対応          | Android端末ではChromeを経由したPWAに対応しています。スマホで入力したり、プッシュ通知を受け取ることが可能です。                                                 |

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

### エラー監視・アナリティクス

| 環境変数                              | 用途                                                                       | 未設定時の挙動                                                                                   |
| ------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SENTRY_DSN`              | Sentry のプロジェクト DSN。クライアント・サーバー両方のエラー収集に使用。  | **完全に無効（no-op）**。ビルドにも影響しない。                                                  |
| `SENTRY_ORG`                          | Sentry の組織スラッグ（ソースマップアップロード用）。                      | ソースマップをアップロードしない。                                                               |
| `SENTRY_PROJECT`                      | Sentry のプロジェクトスラッグ（ソースマップアップロード用）。              | ソースマップをアップロードしない。                                                               |
| `SENTRY_AUTH_TOKEN`                   | ソースマップアップロード用の認証トークン。**ビルド環境（CI）でのみ設定**。 | ソースマップアップロードをスキップ（ローカルビルド・トークン無しでも `pnpm build` は成功する）。 |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | GA4 計測ID。ページビュー・主要イベント計測に使用。                         | Analytics 未初期化。すべての計測呼び出しが no-op。                                               |

- **Sentry**: `NEXT_PUBLIC_SENTRY_DSN` が空の場合はクライアント・サーバーとも初期化せず、イベントを一切送信しません。本番の CI ビルドでソースマップをアップロードする場合のみ `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` を設定してください。`tracesSampleRate` は 0.1、`sendDefaultPii` は無効（個人情報を送信しない）設定です。
- **Cloud Functions のエラー監視**: Firebase 標準の Cloud Logging / Error Reporting を利用するため、Functions 側に Sentry 導入は不要です（追加設定なし）。
- **Firebase Analytics（GA4）**: `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` が設定され、かつブラウザが対応（`isSupported()` が true）の場合のみ有効化します。エミュレータ利用時（`NEXT_PUBLIC_USE_EMULATORS=true`）は無効化されます。ページビューと主要イベント（`team_create` / `schedule_create` / `collab_confirm` / `upgrade_cta_click`）を計測します。


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
