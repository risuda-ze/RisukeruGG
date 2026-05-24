# Data Model: AI機能バグ修正 & Docker環境起動エラー修正

## 変更なし

このフィーチャーはバグ修正のみであり、Firestore のデータモデルや API コントラクトに変更はない。

変更対象は以下の設定・依存関係ファイルのみ:
- `functions/package.json` - `@types/node` を devDependencies に追加
- `pnpm-lock.yaml` - `pnpm install` 実行後に自動更新
- `docker/emulator/Dockerfile` - `firebase-tools` バージョン固定
- `docker-compose.yml` - ヘルスチェックの `start_period` 調整
- Vercel 環境変数 - `ANTHROPIC_API_KEY` の登録（インフラ設定）
