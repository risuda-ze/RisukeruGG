---
name: final-report
description: 最終レビューセット合格後に、人間がマージ内容を確認するための Markdown レポート（二次レビュー結果のまとめ・画面のスクリーンショット・lint/E2E 定義の変更レポート）を書いて投稿するときに使う。
---

# final-report

読み手は PR を詳しく追っていない人間。エージェント間のやり取りではなく「何が変わり、何を確認済みで、人が見るべき点はどこか」を書く。

## 材料の集め方

- レビュー経緯: `gh pr view <番号> --comments` の全セットの一次・二次コメント
- 変更ファイル: `gh pr diff <番号> --name-only`
- スクリーンショット: code-reviewer が `review-artifacts/pr-<番号>/` に保存したもの。足りなければ報告せず orchestrator に差し戻す
- 定義の変更: `gh pr diff <番号> -- eslint.config.mjs eslint-rules tests/e2e playwright.config.ts .github`

## 手順

1. レポート本文を `reference/template.md` の形式で書く。画像は `review-artifacts/pr-<番号>/` にあるファイル名で参照する（`![変更後](after-tasks.png)`）
2. 本文を Bash ツールのヒアドキュメントで渡して投稿する。スクリプトが本文を `review-artifacts/pr-<番号>/report.md` に保存する（サブエージェントは Write ツールで `report.md` を作れない）

   ```bash
   node scripts/agent/publish-report.mjs --sha <SHA> --dir review-artifacts/pr-<番号> --stdin <<'EOF'
   # 最終レポート
   ...
   EOF
   ```

   - 1 行目はこの形のまま、Bash ツールのコマンドの先頭に書く。変えてよいのは `<SHA>`（7〜40 桁の小文字 16 進）と `<番号>`、`--stdin` の後ろに付ける PR 番号だけ。`cd` などを前に付ける、空白を増やす、区切り語を変える、行末に何かを足すと、guard hook が本文の各行をコマンドとして判定し、本文中の `gh pr merge` や `git push` の記述で拒否される
   - 本文に `EOF` だけの行を書かない（そこで本文が終わる）
   - PowerShell ツールでは渡さない（ヒアドキュメントを使えない）

   画面に影響する変更なのに「画面の変更」節や画像がない、定義ファイルを変えたのに「lint / E2E 定義の変更」節がない場合は、スクリプトが投稿を拒否する
