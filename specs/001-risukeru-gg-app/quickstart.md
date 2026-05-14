# Quickstart: リスケるGG MVP 開発環境セットアップ

## セットアップ方法の選択

| 方法 | 必要なもの | 特徴 |
|------|-----------|------|
| **Docker（推奨）** | Docker Desktop のみ | Firebase アカウント不要・環境汚染なし |
| ローカル | Node.js / pnpm / Firebase CLI | 直接実行・デバッグしやすい |

---

## Docker を使ったセットアップ（推奨）

### 前提条件

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) がインストール済みで起動していること

Node.js・pnpm・Firebase CLI はコンテナ内で管理されるため、**ホストへのインストール不要**です。

### 手順

**1. リポジトリをクローン**

```bash
git clone <repo-url>
cd RisukeruGG
```

**2. 環境変数ファイルをコピー**

```bash
cp .env.docker .env.docker.local
```

`.env.docker` には `demo-risukeru` プロジェクトのダミー値が設定済みです。  
実際の Firebase プロジェクトに接続する場合のみ `.env.docker.local` を編集してください。

> `.env.docker` 自体は `.gitignore` の `.env*` パターンで除外済みです。

**3. コンテナをビルドして起動**

```bash
docker compose up --build
```

初回はイメージのビルドに数分かかります。2回目以降はキャッシュが使われます。

```bash
# バックグラウンドで起動する場合
docker compose up -d
```

**4. 動作確認**

| URL | 内容 |
|-----|------|
| http://localhost:3000 | Next.js アプリ |
| http://localhost:4000 | Firebase Emulator UI |

`app` コンテナは `emulator` コンテナのヘルスチェック通過後に起動します（最大90秒）。

### コンテナ構成

```
emulator コンテナ          app コンテナ
─────────────────          ─────────────────
Firebase Emulator Suite    Next.js 開発サーバー
  Auth      :9099          :3000
  Functions :5001
  Firestore :8080          src/ をホストと共有
  Storage   :9199          → ファイル変更で自動リロード
  UI        :4000
```

### よく使うコマンド

```bash
# 起動
docker compose up -d

# ログ確認
docker compose logs -f app
docker compose logs -f emulator

# 停止
docker compose down

# コンテナ内でコマンド実行（型チェックなど）
docker compose exec app pnpm typecheck
docker compose exec app pnpm lint

# イメージを完全再ビルド（依存関係変更時）
docker compose build --no-cache
docker compose up -d
```

### テストの実行

```bash
# ユニットテスト（ホストまたはコンテナ内で実行）
docker compose exec app pnpm test

# E2E テスト（ホストで実行・要 playwright インストール）
pnpm test:e2e
```

### テストユーザーの作成

Firebase Emulator では Google OAuth のポップアップは動作しません。  
Emulator UI でユーザーを手動作成してください:

1. http://localhost:4000 を開く
2. **Authentication** → **ユーザーを追加**
3. Google プロバイダーとして追加（メール・UID を任意に設定）

### Functions のコード変更を反映する

`functions/src/` の変更は `emulator` コンテナに自動マウントされますが、  
TypeScript の再ビルドと emulator の再起動が必要です:

```bash
docker compose restart emulator
```

---

## ローカルを使ったセットアップ（代替）

### 前提条件

- Node.js 20.x 以上
- pnpm 9.x 以上（`npm install -g pnpm`）
- Firebase CLI（`npm install -g firebase-tools`）
- Java 21 以上（Firebase Emulator Suite の要件）
- Google アカウント（Firebase ログイン用）

### 手順

**1. 依存関係のインストール**

```bash
git clone <repo-url>
cd RisukeruGG
pnpm install
```

**2. 環境変数の設定**

```bash
cp .env.local.example .env.local
```

`.env.local` に Firebase プロジェクトの設定を記入します:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

NEXT_PUBLIC_USE_EMULATORS=true
NEXT_PUBLIC_EMULATOR_HOST=localhost
```

**3. Firebase Emulator Suite の起動**

```bash
firebase login
firebase emulators:start
```

**4. 開発サーバーの起動**（別ターミナル）

```bash
pnpm dev
```

### Firebase プロジェクトの作成（ローカル環境のみ必要）

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクトを作成
2. Authentication → サインイン方法: **Google** を有効化
3. Firestore Database を作成（リージョン: `asia-northeast1`）
4. Storage を有効化
5. プロジェクト設定 → マイアプリ → Firebase 設定をコピーして `.env.local` に記入

---

## Security Rules のデプロイ（本番）

```bash
firebase deploy --only firestore:rules,storage:rules
```

## Vercel へのデプロイ

```bash
# 初回
npx vercel --prod

# 以降は GitHub 連携で自動デプロイ（main ブランチへのマージ時）
```

---

## ディレクトリ構造

| パス | 用途 |
|------|------|
| `src/app/` | Next.js App Router ページ |
| `src/lib/repositories/` | Firestore アクセス（コンポーネントから直接SDK呼び出し禁止） |
| `src/lib/validations/` | Zod スキーマ（フォームとAPIバウンダリで使用） |
| `src/stores/` | Zustand ストア（Firestore リスナーを管理） |
| `src/proxy.ts` | Next.js リクエストプロキシ（ルーティング・認証ガード） |
| `functions/src/` | Firebase Cloud Functions |
| `tests/unit/` | Vitest ユニットテスト（コアロジックのみ） |
| `tests/e2e/` | Playwright E2E テスト |
| `firestore.rules` | Firestore Security Rules |
| `docker/` | Docker ビルド設定 |
| `.env.docker` | Docker 環境用の設定テンプレート |
