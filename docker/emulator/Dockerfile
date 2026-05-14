# Firebase Emulator Suite
# Node.js 20 + OpenJDK 21（firebase-tools@latest の要件）+ Firebase CLI + pnpm

# Stage 1: Eclipse Temurin 公式イメージから Java 21 JRE を取得
FROM eclipse-temurin:21-jre AS jre

# Stage 2: メインイメージ
FROM node:20-bookworm-slim

# Java 21 JRE をコピー（apt リポジトリに依存しない確実な方法）
COPY --from=jre /opt/java/openjdk /opt/java/openjdk
ENV JAVA_HOME=/opt/java/openjdk
ENV PATH="${JAVA_HOME}/bin:${PATH}"

# curl インストール（ヘルスチェック用）
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Firebase CLI と pnpm をグローバルインストール
RUN npm install -g firebase-tools@latest pnpm

WORKDIR /workspace

# functions の依存関係を先にインストール（レイヤーキャッシュ活用）
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY functions/package.json ./functions/package.json
RUN pnpm install --frozen-lockfile --filter "risukeru-gg-functions"

# functions のソースは実行時にマウントするが tsconfig は必要
COPY functions/tsconfig.json ./functions/

# 起動スクリプト
COPY docker/emulator/start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

# エミュレータが使用するポート
EXPOSE 4000 9099 5001 8080 9199

HEALTHCHECK --interval=10s --timeout=5s --start-period=90s --retries=12 \
    CMD curl -f http://localhost:4000 || exit 1

CMD ["/usr/local/bin/start.sh"]
