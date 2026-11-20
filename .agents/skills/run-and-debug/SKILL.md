---
name: run-and-debug
description: 実装・レビュー中に自分でアプリを起動し、ブラウザで操作して挙動を確かめる・不具合を再現してデバッグするときに使う。
---

# run-and-debug

## 起動

1. `node scripts/agent/dev-up.mjs` を実行する。Emulator が落ちていれば起動方法が表示されて失敗するので、その手順で起動してから再実行する
2. ログインが必要な画面は Auth Emulator のユーザーで入る。手順は `tests/helpers/auth.ts`（`signInWithEmulator`）と同じ方法を Playwright MCP の `browser_evaluate` 等で行う。テストデータは `scripts/seed.mjs`

## 確認の型

1. 受入条件の操作を `browser_navigate` → `browser_snapshot` → `browser_click` / `browser_fill_form` で人と同じ順に行う
2. 操作ごとに `browser_console_messages`（エラー・警告）と `browser_network_requests`（4xx/5xx）を確認する
3. 状態が変わる操作は Emulator UI（http://localhost:4000）か Firestore を読み、保存内容まで確認する
4. 結果は `browser_take_screenshot` で残し、パスを報告に書く

## デバッグの型

1. 再現手順を最小にして固定する（再現しないうちは直さない）
2. 仮説を1つ立て、ログ・ブレークポイント相当の確認（コンソール出力、ネットワーク応答、Firestore の値）で検証する
3. 原因箇所を直したら、同じ手順で再現しないことと、同じ関数の他の呼び出し元が壊れていないことを確認する
4. 再現手順は回帰テスト（unit か e2e）にする

調査用に入れた `console.*` やデバッグコードは push 前に消す（lint でも検出される）。
