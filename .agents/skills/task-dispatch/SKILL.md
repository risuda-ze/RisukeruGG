---
name: task-dispatch
description: 確定した変更仕様を implementer に割り振るときに使う。変更単位への分割基準は reference/split-rules.md、起動指示の定型（実装モード・修正モード）は reference/dispatch-template.md にある。
---

# task-dispatch

1. `reference/split-rules.md` の基準で、受入条件を互いに独立な「変更単位」に分ける。分けられなければ 1 単位のままにする
2. 変更単位ごとに `reference/dispatch-template.md` の実装モード指示で implementer を起動する。独立な単位は並列に起動する（同じブランチを触る場合は直列）
3. レビュー・CI で要修正になったら、修正モード指示で implementer を起動する。指摘・ログは要約せず全文を渡す
4. 起動指示・返却・判定を変更単位ごとに記録し、work-report のサイクル実績に使う
