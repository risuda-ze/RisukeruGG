# リスケるGG

**撮影も、コラボも、編集もGGなスケジュールを**  
配信スケジュール、もうリスケしない。

ゲーム配信者（Twitch・YouTube）およびその制作チームを対象とした、**配信者特化型チームスケジュール管理アプリ**。  
配信枠の管理・コラボ調整・編集タスク管理を一元化し、配信者が本業（配信）に集中できる環境を提供します。

---

## 目次

- [機能概要](#機能概要)
- [技術スタック](#技術スタック)
- [開発環境セットアップ](#開発環境セットアップ)
- [コマンド一覧](#コマンド一覧)
- [テストデータ投入](#テストデータ投入)
- [環境変数](#環境変数)
- [アーキテクチャ](#アーキテクチャ)
- [画面一覧](#画面一覧)
- [料金プラン](#料金プラン)

---

## 機能概要

| 機能             | 概要                                                            |
| ---------------- | --------------------------------------------------------------- |
| スケジュール管理 | 配信枠の作成・編集・削除。週/月カレンダービューでチーム共有     |
| コラボ調整       | コラボ打診の送受信・候補日程調整・確定枠の自動カレンダー登録   |
| タスク管理       | カンバン形式（TODO / 進行中 / 完了）で撮影・編集・告知を一元管理 |
| チーム管理       | メンバー招待・ロール設定（オーナー / 編集者 / 閲覧者）          |
| 通知             | LIVEリマインダー・コラボ返答・タスク更新の通知（プラン別）      |
| PWA対応          | ホーム画面追加・プッシュ通知（Android Chrome）                  |

---

## 技術スタック

| レイヤー   | 技術                                                              |
| ---------- | ----------------------------------------------------------------- |
| フロントエンド | Next.js 14 (App Router) + TypeScript 5 + Tailwind CSS 4       |
| 状態管理   | Zustand                                                           |
| フォーム   | React Hook Form + Zod                                             |
| カレンダー | react-big-calendar                                                |
| カンバン   | @hello-pangea/dnd                                                 |
| 認証       | Firebase Authentication（Google SSO / メール認証）               |
| DB         | Cloud Firestore（リアルタイム同期）                               |
| ストレージ | Firebase Storage                                                  |
| 通知       | Firebase Cloud Messaging（FCM）                                   |
| サーバーレス | Firebase Cloud Functions                                        |
| ホスティング | Vercel                                                          |
| テスト     | Vitest（ユニット）/ Playwright（E2E）                             |
| 開発環境   | Docker + Firebase Emulator Suite                                  |

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

| 種別         | 内容                                               |
| ------------ | -------------------------------------------------- |
| チーム       | 「配信チームα」1チーム                             |
| メンバー     | 4人（オーナー・編集者×2・閲覧者）                  |
| スケジュール | 先月・当月・来月分（週1回配信 + 毎週土曜動画）     |
| タスク       | 10件（未着手・進行中・完了に分散）                 |
| 通知         | 10件（すべて未読）                                 |
| コラボ       | 2件（打診中・調整中）                              |

**テストアカウント（パスワード共通: `password123`）:**

| 表示名       | メールアドレス          | ロール   |
| ------------ | ----------------------- | -------- |
| 配信太郎     | taro@example.com        | オーナー |
| 編集花子     | hanako@example.com      | 編集者   |
| マネージャー健太 | kenta@example.com   | 編集者   |
| 視聴者三郎   | saburo@example.com      | 閲覧者   |

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
NEXT_PUBLIC_USE_EMULATORS=true   # Firebase エミュレータ使用時
```

---

## アーキテクチャ

```
src/
├── app/                  # Next.js App Router ページ
│   ├── (protected)/      # 認証保護ルート
│   └── globals.css       # Tailwind @theme デザイントークン定義
├── components/           # UIコンポーネント
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
- デザインシステムはダークテーマ固定（`globals.css` の `@theme` ブロックで管理）
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

| 機能             | LIGHTプラン（無料）          | PARTYプラン（¥1,500/人・月）    |
| ---------------- | ---------------------------- | -------------------------------- |
| メンバー数       | 2人まで                      | 無制限                           |
| タスク管理       | 月5件まで                    | 無制限                           |
| コラボ調整       | 月3件まで                    | 無制限                           |
| 通知             | LIVEリマインダーのみ         | 全種類                           |
| バナー広告       | あり                         | なし                             |
| 無料トライアル   | —                            | 14日間                           |

---

> 詳細な仕様は [docs/risukeru_gg_spec.md](docs/risukeru_gg_spec.md) を参照してください。
