---
name: lint-from-findings
description: review-finding Issue のうち2回以上発生した指摘を、ESLint ルールや E2E テストなど CI で落ちる機械検査に変換して PR にするときに使う。
---

# lint-from-findings

## 対象の選定

`gh issue list --label review-finding --state open --json number,title,comments` で、コメント（発生）が1件以上ある＝2回以上出た Issue を選ぶ。

## 変換方法（上から順に、最初に成立するものを使う）

1. 既存ルールの有効化: typescript-eslint / eslint-config-next / eslint 本体に該当ルールがあれば `eslint.config.mjs` で有効にする
2. `no-restricted-syntax` / `no-restricted-imports` / `no-restricted-properties`: AST セレクタで書けるもの。`message` に「なぜ駄目か」と「代わりに何を書くか」を必ず書く
3. ローカルルール: 上で書けないものだけ `eslint-rules/<rule>.mjs` に実装し、flat config にインラインのプラグインとして登録する。`meta.messages` に理由と代替を書き、`tests/unit/eslint-rules/` に RuleTester のテストを置く
4. E2E: UI の振る舞い（例: 失敗時にエラー表示が出る）は `tests/e2e/` の smoke spec にする。`expect` の第2引数に理由付きメッセージを書く

## 手順

1. 変換したルールを有効にした状態で `pnpm lint` を実行し、既存の違反件数を出す
2. 既存違反は同じ PR で直す（件数が多ければ違反修正の PR を先に出す）。ルールの除外リストや抑制コメントでの回避はしない
3. AGENTS.md の該当箇所（負債ゼロ基準・コーディング規約）から、lint に移した項目を削除する（正本が lint に移るため）。代わりに `docs/lint規約一覧.md` の表に、ルール・弾くもの・理由・由来 Issue を1行追加する
4. PR 本文に `Closes #<finding Issue>` を書く。わざと違反を入れたときのエラーメッセージ例も貼る
