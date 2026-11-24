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

1. `review-artifacts/pr-<番号>/report.md` を下のテンプレートで書く。画像はファイル名で参照する（`![変更後](after-tasks.png)`）
2. `node scripts/agent/publish-report.mjs --sha <SHA> --dir review-artifacts/pr-<番号>` で投稿する
   画面に影響する変更なのに「画面の変更」節や画像がない、定義ファイルを変えたのに「lint / E2E 定義の変更」節がない場合は、スクリプトが投稿を拒否する
