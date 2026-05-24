# Implementation Plan: AI機能バグ修正 & Docker環境起動エラー修正

**Branch**: `claude/bold-blackwell-5d57ad` | **Date**: 2026-05-24 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/010-fix-ai-docker-bugs/spec.md`

## Summary

本番環境で報告された2つのバグを修正する:

1. **AI機能バグ**: `ANTHROPIC_API_KEY` が Vercel の本番環境変数に設定されておらず、AIチャットが全件 503 エラーになっている。Vercel 環境変数への登録とドキュメント整備で対処する。
2. **Docker起動エラー**: `functions/package.json` に `@types/node` が不足しており、`syncGoogleCalendar.ts` の `fetch()` 呼び出しで TypeScript コンパイルが失敗する。加えて `firebase-tools@latest` によるバージョン不安定と `start_period` 不足も修正する。

## Technical Context

**Language/Version**: TypeScript 5.9.3, Next.js 16.2.6, Node.js 20  
**Primary Dependencies**: `@ai-sdk/anthropic@3.0.78`, `firebase-admin@13.9.0`, `firebase-functions@6.6.0`, `firebase-tools`  
**Storage**: Cloud Firestore  
**Testing**: Vitest（ユニット）, Playwright（E2E smoke）  
**Target Platform**: Vercel（本番）, Docker + Firebase Emulator（ローカル開発）  
**Project Type**: web-app  
**Performance Goals**: N/A（バグ修正のみ）  
**Constraints**: 既存機能への回帰なし必須  
**Scale/Scope**: 本番バグ修正（2件）

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| 原則 | 適合状況 | 備考 |
|------|----------|------|
| I. シンプルさ優先 | ✅ | 最小限の変更のみ。新規抽象化なし |
| II. TypeScript型安全 | ✅ | `@types/node` 追加で型安全を回復 |
| III. テスト方針 | ✅ | 既存テストが通ればOK。新規テスト不要 |
| IV. Firebase・セキュリティ | ✅ | `ANTHROPIC_API_KEY` は Vercel シークレットで管理 |
| V. 日本語コメント | ✅ | コメント変更なし |

**ゲート判定: ✅ PASS**

## Project Structure

### Documentation (this feature)

```text
specs/010-fix-ai-docker-bugs/
├── spec.md              # 仕様書
├── research.md          # Phase 0 調査結果
├── data-model.md        # Phase 1 (変更なし)
├── plan.md              # This file
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (変更対象)

```text
functions/
└── package.json          # @types/node を devDependencies に追加

docker/
└── emulator/
    └── Dockerfile        # firebase-tools バージョン固定

docker-compose.yml        # ヘルスチェック start_period 調整

# pnpm-lock.yaml は pnpm install 実行後に自動更新
# Vercel 環境変数はインフラ設定（コードなし）
```

**Structure Decision**: バグ修正のため既存構造に変更なし。設定ファイルのみ修正。

## Complexity Tracking

> 違反なし。Constitution Check は全項目 PASS。

---

## Sprint 1: AI機能バグ修正

### 目標
本番 Vercel 環境で AI チャットが正常動作すること。

### 実装内容

#### 1-1. Vercel 環境変数への ANTHROPIC_API_KEY 登録

**手順（手動作業 / インフラ設定）:**

```bash
# Vercel CLI を使用する場合
vercel env add ANTHROPIC_API_KEY production
# → プロンプトで Anthropic API キーの値を入力

# または Vercel ダッシュボードから:
# Project Settings → Environment Variables → Add
# Name: ANTHROPIC_API_KEY
# Value: sk-ant-xxxxxxxx
# Environment: Production（+ Preview / Development も推奨）
```

**確認方法:**
- Vercel ダッシュボード → Project Settings → Environment Variables で `ANTHROPIC_API_KEY` が存在することを確認

#### 1-2. `.env.local.example` の作成（ドキュメント整備）

開発者向けに必要な環境変数を文書化するファイルを作成する:

```env
# Anthropic API（AIチャット機能）
ANTHROPIC_API_KEY=sk-ant-xxxxxxxx

# Firebase（開発環境用 - firebase.json から確認）
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

**対象ファイル**: `.env.local.example`（新規作成、`.gitignore` 対象外）

### 受け入れ基準
- [ ] 本番環境の `/chat` でメッセージを送った際に AI が応答する
- [ ] ローカル開発で `.env.local` に API キーを設定した場合も正常動作
- [ ] `.env.local.example` が存在し、必要な変数が記載されている

---

## Sprint 2: Docker 環境起動エラー修正

### 目標
`docker compose up -d` が正常完了し、エミュレーターが健全に起動すること。

### 実装内容

#### 2-1. `functions/package.json` に `@types/node` を追加

**ファイル**: `functions/package.json`

変更前:
```json
"devDependencies": {
  "typescript": "^5.9.3"
}
```

変更後:
```json
"devDependencies": {
  "@types/node": "^20",
  "typescript": "^5.9.3"
}
```

**理由**: `functions/src/calendar/syncGoogleCalendar.ts:29` が Node.js グローバルの `fetch()` を使用している。`functions/tsconfig.json` の `target: "es2020"` は DOM lib を含まないため、`@types/node@20`（Node.js 18+ 以降で `fetch` 型定義を含む）が必要。

追加後に `pnpm install` を実行して `pnpm-lock.yaml` を更新する。

#### 2-2. `docker/emulator/Dockerfile` の `firebase-tools` バージョン固定

**ファイル**: `docker/emulator/Dockerfile`

変更前:
```dockerfile
RUN npm install -g firebase-tools@latest pnpm
```

変更後:
```dockerfile
RUN npm install -g firebase-tools@14 pnpm
```

**理由**: `@latest` はビルドのたびに異なるバージョンがインストールされ再現性が低い。`firebase-tools@14` は `firebase-admin@13.x` / `firebase-functions@6.x` と互換性のある安定バージョン。

#### 2-3. `docker-compose.yml` のヘルスチェック調整

**ファイル**: `docker-compose.yml`

変更前:
```yaml
healthcheck:
  test: ['CMD', 'curl', '-f', 'http://localhost:4000']
  interval: 10s
  timeout: 5s
  start_period: 90s
  retries: 12
```

変更後:
```yaml
healthcheck:
  test: ['CMD', 'curl', '-f', 'http://localhost:4000']
  interval: 10s
  timeout: 5s
  start_period: 150s
  retries: 15
```

**理由**: TypeScript コンパイル（30-60秒）+ Firebase Emulator 全サービス起動（60-90秒）の合計が 90秒を超える可能性がある。`start_period: 150s`, `retries: 15`（合計 300 秒）に拡張してマージンを確保する。

### 確認手順

```bash
# 既存コンテナとボリュームを削除してクリーンビルド
docker compose down -v

# 再ビルドと起動
docker compose up -d --build

# ログ確認（TypeScript コンパイル成功・Emulator 起動確認）
docker compose logs emulator

# ヘルスチェック確認
docker compose ps
```

### 受け入れ基準
- [ ] `docker compose up -d` がエラーなく完了する
- [ ] `docker compose ps` で `emulator` コンテナが `healthy` 状態になる
- [ ] `http://localhost:4000` で Firebase Emulator UI にアクセスできる
- [ ] `http://localhost:3000` でアプリにアクセスできる
- [ ] `docker compose logs emulator` に TypeScript コンパイルエラーが出ない

---

## 回帰テスト

両スプリント完了後、以下が変わらず動作することを確認する:

- `pnpm typecheck` がパスすること
- `pnpm lint` がパスすること
- `pnpm test` がパスすること（Vitest ユニットテスト）
- CI の smoke E2E テストがパスすること

## 引き渡し事項（Generator → Evaluator）

### 起動方法
```bash
# ローカル開発（.env.local に ANTHROPIC_API_KEY 設定後）
pnpm dev   # localhost:3000

# Docker 環境
docker compose up -d --build
# → Emulator UI: http://localhost:4000
# → App: http://localhost:3000
```

### テストシナリオ

**AI機能テスト:**
1. `pnpm dev` でアプリを起動（`.env.local` に `ANTHROPIC_API_KEY` 設定済み）
2. ログイン後、左サイドバーの「AIアシスタント」（または `/chat`）にアクセス
3. 「今日のタスクを教えて」と入力して送信
4. AI の応答がストリーミングで表示されることを確認
5. エラーメッセージが表示されないことを確認

**Docker 環境テスト:**
```bash
docker compose up -d --build
docker compose ps  # emulator が healthy になることを確認（最大5分）
curl http://localhost:4000  # Emulator UI に応答があることを確認
curl http://localhost:3000  # App に応答があることを確認
```
