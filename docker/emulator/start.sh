#!/bin/bash
set -e

LOCK_HASH_FILE="/workspace/functions/node_modules/.risukeru-lock-hash"
CURRENT_HASH="$(sha256sum /workspace/functions/package.json /workspace/pnpm-lock.yaml /workspace/pnpm-workspace.yaml | sha256sum | cut -d' ' -f1)"

echo "=== Firebase Emulator 起動スクリプト ==="

if [ ! -d /workspace/functions/node_modules ] || [ ! -f "$LOCK_HASH_FILE" ] || [ "$(cat "$LOCK_HASH_FILE")" != "$CURRENT_HASH" ]; then
  echo ">>> functions 依存関係を同期します..."
  pnpm install --frozen-lockfile --filter "risukeru-gg-functions"
  printf '%s' "$CURRENT_HASH" > "$LOCK_HASH_FILE"
else
  echo ">>> functions 依存関係は最新です。"
fi

# Cloud Functions を TypeScript コンパイル
echo ">>> functions ビルド中..."
cd /workspace/functions
pnpm build
echo ">>> functions ビルド完了"
cd /workspace

# エミュレータデータディレクトリ
EMULATOR_DATA_DIR="/workspace/.emulator-data"
mkdir -p "$EMULATOR_DATA_DIR"

# エミュレータ起動（データ永続化あり）
echo ">>> Firebase Emulator 起動中（project: ${FIREBASE_PROJECT_ID:-demo-risukeru}）..."
if [ -d "$EMULATOR_DATA_DIR/auth_export" ]; then
  echo ">>> 既存データをインポートします: $EMULATOR_DATA_DIR"
  exec firebase emulators:start \
    --project "${FIREBASE_PROJECT_ID:-demo-risukeru}" \
    --import "$EMULATOR_DATA_DIR" \
    --export-on-exit "$EMULATOR_DATA_DIR"
else
  echo ">>> 新規データで起動します"
  exec firebase emulators:start \
    --project "${FIREBASE_PROJECT_ID:-demo-risukeru}" \
    --export-on-exit "$EMULATOR_DATA_DIR"
fi
