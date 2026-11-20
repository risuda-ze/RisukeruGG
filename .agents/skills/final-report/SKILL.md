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

## テンプレート

```markdown
# PR #<番号> 最終レポート

## 概要

変更の目的と結果を2〜3文で。関連 Issue。

## 二次レビュー結果まとめ

| セット | 範囲 | 一次判定 | 二次判定 | 主な指摘・判断 |
| ------ | ---- | -------- | -------- | -------------- |

- 最終セットの結論: 一次の確認範囲（受入条件・観点・動作確認）と、二次がそれを妥当とした根拠
- 二次が不適切と判定した一次の指摘（あれば）と、その理由
- 別 Issue に切り出した指摘: #番号 タイトル

## 画面の変更

（画面に影響する変更がある場合のみ。変更前・変更後を並べ、操作手順を添える）
| 画面・操作 | 変更前 | 変更後 |
| ---------- | ------ | ------ |
| タスク一覧で… | ![before](before-tasks.png) | ![after](after-tasks.png) |

## lint / E2E 定義の変更

（eslint.config.mjs・eslint-rules/・tests/e2e/・playwright.config.ts・.github/ を変えた場合のみ）
| 変更 | 内容 | 理由（finding Issue など） |
| ---- | ---- | -------------------------- |

- 違反したときのエラーメッセージ例（実際に出力されたもの）
- 既存コードの違反件数と、この PR での修正件数
- CI の実行時間・必須チェックへの影響

## 人が確認すべき点

自動テスト・エージェントでは判断できなかったこと。無ければ「なし」。
```
