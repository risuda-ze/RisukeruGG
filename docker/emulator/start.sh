#!/bin/bash
set -e

echo "=== Firebase Emulator 起動スクリプト ==="

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
