# 仕様書: AI機能バグ修正 & Docker環境起動エラー修正

**Branch**: `claude/bold-blackwell-5d57ad` | **Date**: 2026-05-24

## 概要

本番環境で報告された2つのバグを修正する。

---

## バグ 1: AI機能が本番環境で使用不可

### 症状
- 本番環境（Vercel）でAIチャット機能（`/chat`）を使用すると「エラーが発生しました。もう一度お試しください。」と表示される
- ローカル開発環境では正常動作

### 原因
`ANTHROPIC_API_KEY` が Vercel の本番環境変数として設定されていない。

**エラーフロー:**
1. `POST /api/ai/chat` が呼ばれる
2. `src/app/api/ai/chat/route.ts` が `ANTHROPIC_API_KEY` 未設定を検出
3. HTTP 503 を返す
4. `AIChatPage.tsx` の `if (!res.ok)` が発火
5. catch ブロックが「エラーが発生しました。もう一度お試しください。」を表示

### 受け入れ基準
- [ ] 本番環境の AI チャット (`/chat`) でメッセージを送信した際にエラーが出ない
- [ ] AI からの応答がストリーミングで表示される
- [ ] API キーが未設定の場合、具体的なエラーメッセージが管理者向けに記録される

---

## バグ 2: Docker 環境ビルド時にエミュレーターが起動しない

### 症状
```
✘ Container risukerugg-emulator-1  Error  dependency emulator failed to start
```
`docker compose up` 実行時に `emulator` コンテナが起動に失敗し、それに依存する `app` コンテナも起動しない。

### 原因候補
1. **TypeScript コンパイルエラー**: `functions/package.json` に `@types/node` が未定義のため、`syncGoogleCalendar.ts` の `fetch` 呼び出しが型解決できない可能性がある
2. **`firebase-tools@latest` の非互換**: Dockerfile で `firebase-tools@latest` を使用しているため、最新バージョンで互換性の問題が生じている可能性がある
3. **ヘルスチェックタイムアウト**: TypeScript コンパイルと Firebase Emulator 起動を合わせた時間が `start_period: 90s` を超える可能性がある

### 受け入れ基準
- [ ] `docker compose up -d` が正常に完了する
- [ ] Emulator UI が `http://localhost:4000` でアクセス可能になる
- [ ] `app` コンテナが正常に起動し `http://localhost:3000` でアクセス可能になる
- [ ] Cloud Functions が Firestore エミュレーターで動作する
