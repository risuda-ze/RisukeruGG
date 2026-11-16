# Next.js 開発サーバー
FROM node:22-slim

# pnpm は corepack 経由で package.json の packageManager と同じバージョンを使う
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

WORKDIR /workspace

# 依存関係を先にインストール（レイヤーキャッシュ活用）
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# functions は emulator コンテナ側で管理するためダミーを置く
COPY functions/package.json ./functions/package.json
RUN pnpm install --frozen-lockfile --filter "!risukeru-gg-functions"
COPY docker/app/start-dev.sh /usr/local/bin/start-dev.sh
RUN sed -i $'s/\r//' /usr/local/bin/start-dev.sh && chmod +x /usr/local/bin/start-dev.sh

EXPOSE 3000

# CHOKIDAR_USEPOLLING: Windows / Docker Desktop でのファイル監視フォールバック
ENV CHOKIDAR_USEPOLLING=true
ENV WATCHPACK_POLLING=true

CMD ["/usr/local/bin/start-dev.sh"]
