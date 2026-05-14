# Quickstart: リスケるGG MVP 開発環境セットアップ

## 前提条件

- Node.js 20.x 以上
- pnpm 9.x 以上（`npm install -g pnpm`）
- Firebase CLI（`npm install -g firebase-tools`）
- Googleアカウント（Firebase プロジェクト管理用）

## 1. リポジトリのセットアップ

```bash
git clone <repo-url>
cd RisukeruGG
pnpm install
cd functions && pnpm install && cd ..
```

## 2. Firebase プロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクトを作成
2. Authentication を有効化 → サインイン方法: **Google** を有効化（メール/パスワードは不要）
3. Google プロバイダーの設定: プロジェクトのサポートメールを設定し、OAuth クライアントIDを確認
4. Firestore Database を作成（本番モード、リージョン: asia-northeast1）
5. Storage を有効化
6. プロジェクト設定 → サービスアカウント → 新しい秘密鍵を生成（Cloud Functions用）

```bash
firebase login
firebase use --add  # プロジェクトを選択
```

## 3. 環境変数の設定

```bash
cp .env.local.example .env.local
```

`.env.local` に以下を設定:
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# Googleカレンダー連携用（Firebase AuthのGoogle OAuthと同一クライアントを使用）
# Firebase ConsoleのAuthentication > Google プロバイダーからコピー
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# PARTYプラン申し込みフォームURL（未設定の場合はアップグレードボタンを非表示）
NEXT_PUBLIC_PARTY_SIGNUP_URL=

# Cloud Functions環境変数（functions/.env に設定）
# functions/.env
APP_URL=http://localhost:3000
```

## 4. Firebase Emulator Suite の起動

```bash
# ローカル開発はEmulatorを使用（Firestore・Auth・Functionsを全てエミュレート）
firebase emulators:start
```

Emulator UI: http://localhost:4000

## 5. Cloud Functions のデプロイ（ローカルテスト用）

```bash
cd functions
pnpm build   # TypeScriptをビルド
cd ..
firebase emulators:start --only functions,firestore,auth
```

## 6. Next.js 開発サーバーの起動

```bash
pnpm dev
```

アプリ: http://localhost:3000

## 7. 動作確認（Google OAuth ローカルテスト）

Firebase Emulator では Google OAuth のポップアップは動作しないため、以下の手順でテスト用ユーザーを手動作成します:

```bash
# Emulator UI (http://localhost:4000) > Authentication > ユーザーを追加
# Google プロバイダーのユーザーとして追加（メール・UID を任意に設定）
# または Firebase Admin SDK でテストユーザーを作成するスクリプトを実行:
node scripts/create-test-user.js
```

## テストの実行

```bash
# ユニットテスト（Vitest）
pnpm test

# E2Eテスト（Playwright）
pnpm test:e2e

# 型チェック
pnpm typecheck

# Lint
pnpm lint
```

## Security Rules のデプロイ

```bash
# ルールをEmulatorでテスト後、本番にデプロイ
firebase deploy --only firestore:rules,storage:rules
```

## Vercel へのデプロイ

```bash
# 初回
npx vercel --prod

# 以降はGitHub連携で自動デプロイ（main ブランチへのマージ時）
```

## ディレクトリ構造の補足

| パス | 用途 |
|------|------|
| `src/app/` | Next.js App Router ページ |
| `src/lib/repositories/` | Firestore アクセス（コンポーネントから直接SDK呼び出し禁止） |
| `src/lib/validations/` | Zodスキーマ（フォームとAPIバウンダリで使用） |
| `src/stores/` | Zustandストア（Firestoreリスナーを管理） |
| `functions/src/` | Firebase Cloud Functions |
| `tests/unit/` | Vitest ユニットテスト（コアロジックのみ） |
| `tests/e2e/` | Playwright E2E テスト |
| `firestore.rules` | Security Rules |
