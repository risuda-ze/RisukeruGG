---
name: regression-check
description: 実装後の回帰確認（pnpm verify、UI 変更時は E2E smoke）を実行し、結果を固定フォーマットで報告する
---

# regression-check

1. 対象テストだけ先に回してよい: `pnpm vitest run tests/unit/<機能>/<対象>.test.ts`
2. `pnpm verify`（lint / typecheck / functions build / unit test。push 時に hook も同じものを実行する）
3. UI に影響する変更では `pnpm test:e2e:smoke`。Emulator が必要なケースは `pnpm test:e2e:emulator`（run-and-debug で Emulator を確認してから）
4. 失敗は直して 2 からやり直す。直せない失敗は報告に「未解決」として残す

`reference/report-format.md` の形式で返す。失敗はコマンド出力を要約せず該当行を貼る。
