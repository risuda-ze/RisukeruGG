# lint 規約一覧

CI（`pnpm verify`）で機械的に弾いている項目と、その理由の一覧。設定の正本は `eslint.config.mjs`。
ルールを追加・削除したら、同じ PR でこの表を更新する（lint-from-findings スキル）。

## プロジェクト独自ルール

| ルール | 弾くもの | 理由 | 由来 |
| --- | --- | --- | --- |
| （まだなし） | | | |

由来には元になった `review-finding` Issue 番号を書く。

## 採用しているプリセット

| プリセット | 主に弾くもの | 理由 |
| --- | --- | --- |
| `eslint-config-next/core-web-vitals` | React Hooks の規則違反、`<img>`・`<a>` の直書きなど Next.js の非推奨パターン | 描画バグと Core Web Vitals の劣化を防ぐ |
| `eslint-config-next/typescript` | typescript-eslint 推奨（明示的な `any`、未使用変数など） | 型安全性を保ち、死んだコードを残さない |
| `tsconfig.json` の `strict: true`（`pnpm typecheck`） | 暗黙の `any`、null 未チェック | 実行時の undefined 参照を型で防ぐ |
| Prettier（`.prettierrc`） | 書式の差異 | レビューを書式の議論に使わない |
