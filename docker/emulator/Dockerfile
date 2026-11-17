# Firebase Emulator Suite
# Node.js 22（Functions ランタイム nodejs22 と一致）+ OpenJDK 21 + Firebase CLI + pnpm

# Stage 1: Eclipse Temurin 公式イメージから Java 21 JRE を取得
FROM eclipse-temurin:21-jre AS jre

# Stage 2: メインイメージ
FROM node:22-bookworm-slim

# Java 21 JRE をコピー（apt リポジトリに依存しない確実な方法）
COPY --from=jre /opt/java/openjdk /opt/java/openjdk
ENV JAVA_HOME=/opt/java/openjdk
ENV PATH="${JAVA_HOME}/bin:${PATH}"

# curl インストール（ヘルスチェック用）
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Firebase CLI のバージョン。ルート package.json の devDependencies.firebase-tools と揃える
# （tests/unit/firebase/toolsVersion.test.ts で一致を検証）。
# ここを書き換えたときだけ CLI とエミュレータ JAR の層が作り直される
ARG FIREBASE_TOOLS_VERSION=15.36.0

# Firebase CLI をグローバルインストール。pnpm は corepack 経由で
# package.json の packageManager と同じバージョンを使う
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN npm install -g firebase-tools@${FIREBASE_TOOLS_VERSION} && corepack enable

# エミュレータの JAR / UI をイメージに焼き込む（起動時のダウンロードを無くす）
RUN firebase setup:emulators:firestore \
    && firebase setup:emulators:storage \
    && firebase setup:emulators:ui

WORKDIR /workspace

# functions の依存関係を先にインストール（レイヤーキャッシュ活用）
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY functions/package.json ./functions/package.json
RUN pnpm install --frozen-lockfile --filter "risukeru-gg-functions"

# functions のソースは実行時にマウントするが tsconfig は必要
COPY functions/tsconfig.json ./functions/

# 起動スクリプト
COPY docker/emulator/start.sh /usr/local/bin/start.sh
RUN sed -i $'s/\r//' /usr/local/bin/start.sh && chmod +x /usr/local/bin/start.sh

# エミュレータが使用するポート
EXPOSE 4000 9098 5001 8080 9199

HEALTHCHECK --interval=10s --timeout=5s --start-period=90s --retries=12 \
    CMD curl -f http://localhost:4000 || exit 1

CMD ["/usr/local/bin/start.sh"]
