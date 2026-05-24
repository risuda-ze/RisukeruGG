# Research: AI機能バグ修正 & Docker環境起動エラー修正

## バグ 1: AI機能バグ

### Decision: ANTHROPIC_API_KEY を Vercel に設定する
- **Rationale**: `src/app/api/ai/chat/route.ts:6-8` が `ANTHROPIC_API_KEY` 未設定時に HTTP 503 を返す。Vercel の Environment Variables に `ANTHROPIC_API_KEY` が登録されていないことが根本原因。
- **Alternatives considered**: クライアント側エラーハンドリングの改善（根本解決にならない）

### Decision: AIChatPage のエラーハンドリングを改善する
- **Rationale**: 現在の `catch` ブロック（`AIChatPage.tsx:344`）はエラーの詳細を無視して汎用メッセージを表示する。サーバーが返す具体的なエラーメッセージを活用することで、ユーザー・開発者どちらにも有益になる。
- **Alternatives considered**: 変更なし（最小限の修正で十分という考え方）

### Decision: モデル ID の検証
- **Rationale**: `route.ts:118` で `anthropic('claude-haiku-4-5')` を使用。AI SDK v3 の Anthropic プロバイダーは `claude-haiku-4-5-20251001` の完全 ID も `claude-haiku-4-5` エイリアスも受け付ける。変更不要。
- **Alternatives considered**: `claude-haiku-4-5-20251001` への変更（不要）

---

## バグ 2: Docker 環境起動エラー

### Decision: functions に @types/node を追加する
- **Rationale**: `functions/package.json` の devDependencies に `@types/node` が不在。TypeScript は `es2020` lib のみ参照するため、Node.js グローバル (`fetch`, `Buffer` 等) の型を解決できない。`syncGoogleCalendar.ts:29` の `fetch()` 呼び出しが型エラーを起こし、`start.sh` の `pnpm build`（tsc）が失敗してコンテナがクラッシュする。
- **Alternatives considered**: `tsconfig.json` に `"lib": ["es2020", "dom"]` を追加（Node.js 環境で DOM lib は不適切）

### Decision: firebase-tools バージョンを固定する
- **Rationale**: Dockerfile で `firebase-tools@latest` を使用しているため、Docker イメージをビルドするたびに異なるバージョンがインストールされる可能性がある。特定バージョンで互換性の問題が発生した場合に追跡困難。安定した再現性のためにバージョンを固定する。
- **Alternatives considered**: `@latest` のまま（再現性が低い）

### Decision: ヘルスチェックの start_period を延長する
- **Rationale**: `start.sh` は TypeScript コンパイル（30-60秒）と Firebase Emulator 起動（30-60秒）を順次実行する。合計 60-120 秒の起動時間が `start_period: 90s` を超える可能性がある。`start_period` を 120-150s に延長してマージンを確保する。
- **Alternatives considered**: start.sh でビルド済み lib を事前キャッシュ（複雑すぎる）

### 確認済み事項
- `pnpm-lock.yaml` の `functions` importers セクションは最新の `functions/package.json` と整合している（`firebase-admin@13.9.0`, `firebase-functions@6.6.0`, `typescript@5.9.3`）
- `firebase-admin@13.9.0` および `firebase-functions@6.6.0` の依存関係に `@types/node` は含まれていない
- `firebase-functions@6.6.0` は `@types/express@4.17.25` を含むが、それが提供する `@types/node` が pnpm のワークスペース隔離で functions 側に解決されるかは不確実
- `functions/src/` の TypeScript コードは論理的に正しく、型エラーは `@types/node` 欠如以外には見当たらない
