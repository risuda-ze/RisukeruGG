#!/bin/sh
set -eu

LOCK_HASH_FILE="/workspace/node_modules/.risukeru-lock-hash"
CURRENT_HASH="$(sha256sum /workspace/package.json /workspace/pnpm-lock.yaml /workspace/pnpm-workspace.yaml | sha256sum | cut -d' ' -f1)"

if [ ! -d /workspace/node_modules ] || [ ! -f "$LOCK_HASH_FILE" ] || [ "$(cat "$LOCK_HASH_FILE")" != "$CURRENT_HASH" ]; then
  echo "[app] 依存関係を同期します..."
  pnpm install --frozen-lockfile --filter "!risukeru-gg-functions"
  printf '%s' "$CURRENT_HASH" > "$LOCK_HASH_FILE"
else
  echo "[app] 依存関係は最新です。"
fi

exec pnpm dev --hostname 0.0.0.0