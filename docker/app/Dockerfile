# Next.js 開発サーバー
FROM node:20-slim

RUN npm install -g pnpm

WORKDIR /workspace

# 依存関係を先にインストール（レイヤーキャッシュ活用）
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# functions は emulator コンテナ側で管理するためダミーを置く
COPY functions/package.json ./functions/package.json
RUN pnpm install --frozen-lockfile --filter "!risukeru-gg-functions"
COPY docker/app/start-dev.sh /usr/local/bin/start-dev.sh
RUN chmod +x /usr/local/bin/start-dev.sh

EXPOSE 3000

# CHOKIDAR_USEPOLLING: Windows / Docker Desktop でのファイル監視フォールバック
ENV CHOKIDAR_USEPOLLING=true
ENV WATCHPACK_POLLING=true

CMD ["/usr/local/bin/start-dev.sh"]
