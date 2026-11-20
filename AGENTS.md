# RisukeruGG

こちらのプロジェクトでは配信者向けのタスク管理・スケジュール管理アプリ「RisukeruGG」を開発する。
技術スタック・プロジェクト構成・開発コマンドなどの詳細は、正本仕様 `docs/仕様・計画/risukeru_gg_spec.md` と各カテゴリ配下の詳細ファイルを参照する。

## 開発フロー

1. Issue またはユーザー指示を orchestrator が受け、仕様変更の要否を判定する
2. 仕様変更あり: spec-author が `docs/変更仕様/<変更名>.md` だけの PR を作る → レビューセット。
3. 実装:仕様書をレビューした PR で実装を行う。実装 → レビューセット → マージ。
4. マージ後、review-auditor が共通指摘を `review-finding` Issue に記録する。2回以上出た指摘は lint-from-findings で機械検査に変える

## レビューセット

一次レビューと二次レビューの2回を1セットとする。

- **一次レビュー**（仕様 PR: spec-reviewer / 実装 PR: code-reviewer）: 変更箇所をレビューし、指摘と判定を出す
- **二次レビュー**（review-auditor）: 一次レビューの**結果**をレビューする。変更箇所の再レビューはしない。見るのは、不適切な指摘（根拠がない・事実と違う・基準外の好み）がないか、間違った修正に誘導していないか、範囲外の解決策を今回の PR に求めていないか、判定に必要な確認（観点・受入条件・動作確認）が抜けていないか
- 二次レビューは一次の判定が合格でも要修正でも必ず行う。作成者エージェントに渡すのは、二次レビューが pass（妥当）と判定した一次レビューの指摘だけ。二次が fail なら、二次の報告を付けて一次レビューをやり直す（コードは変えない）
- 懸念事項がなくなった（一次が合格、かつ二次がその一次レビューを妥当と判定した）ら次に進む。懸念が残れば修正 → push → 次のセット。最大3セットで、超えたらユーザーに判断を求める
- 範囲: 1セット目は PR 全体（`scope=full`）。2セット目以降は前回レビューした SHA からの修正差分と、前回指摘の解消（`scope=delta`）
- **最終セット**: 懸念がなくなったら、最後に PR 全体を対象にしたセットをもう一度行う（直前のセットが `scope=full` で同じ SHA なら不要）。修正の積み重ねで全体の整合が崩れていないかを見る
- **最終レポート**: 最終セットの二次レビューが pass したら、review-auditor が final-report スキルで人間向けレポートを投稿する
- マージ前の hook は、現在の HEAD に対する一次・二次の最新判定がともに `scope=full` の pass であることと、最終レポートの投稿を確認する
- 解決策が今回の対象範囲外、または変更が大きくなりすぎる指摘は、この PR では求めず file-issue で別 Issue にする（一次が起票し、二次は漏れや過剰な要求がないかを確認する）

エージェント定義は `.agents/agents/`、スキルは `.agents/skills/`（Claude Code にはプラグイン `risukeru-agents` として読み込まれる）。

## Gitブランチ運用

- 機能開発は `develop` から `feature/` ブランチを切る。着手前に `git fetch origin && git rebase origin/develop`
- PR の base は `develop`。`main` へのマージはリリース時に人が develop から行う

### `main` → `develop` 取り込み時の競合解消

依存ファイルが競合した場合、`pnpm-lock.yaml` は手編集も片側採用もしない。
片側採用 → 再生成では、採用しなかった側の lockfile 単独更新（Dependabot のトランジティブ依存 bump 等）が黙って巻き戻る。

1. `package.json` / `functions/package.json` / `pnpm-workspace.yaml` の競合を先に解消する
2. `pnpm-lock.yaml` は**競合マーカーを残したまま** `pnpm install` を実行し、pnpm の自動マージに任せる（両側の更新が残る。出力をパイプで切らず完走させる）
3. `git diff --check` で競合マーカーが消えたことを確認して `git add pnpm-lock.yaml` する（マーカーが残っていても `--frozen-lockfile` は通るため、install の成否では検知できない）
4. `pnpm install --frozen-lockfile` が通ることを確認してからマージコミットを作る

## コミュニケーションルール

**日本語**で簡潔に応答する
冗長な敬語や言い回しは不要

## コマンド

```bash
pnpm dev          # 開発サーバー起動 (localhost:3000)
pnpm build        # プロダクションビルド
pnpm verify       # push 前検証（lint + typecheck + functions build + unit test）。hook と CI が使う
pnpm typecheck    # TypeScript 型チェック (tsc --noEmit)
pnpm lint         # ESLint (src/ 対象)
pnpm lint:fix     # ESLint 自動修正
pnpm format       # Prettier フォーマット

pnpm test                   # Vitest ユニットテスト (run mode)
pnpm test:e2e:smoke         # Playwright E2E（CI と同じ smoke プロジェクト）
pnpm test:e2e:emulator      # Playwright E2E（Emulator 必須）
pnpm vitest run tests/unit/tasks/columnTransition.test.ts   # 単一ファイル

node scripts/agent/dev-up.mjs        # 自分でアプリを動かす前の環境確認・dev サーバー起動
node scripts/agent/file-issue.mjs    # 範囲外の課題・共通指摘の起票（file-issue スキル参照）
```

## 仕様の正本と変更管理

- 正本仕様は `docs/仕様・計画/*`。親仕様は `docs/仕様・計画/risukeru_gg_spec.md`。
- 変更仕様・実装計画は `docs/変更仕様/*` に記述する。進行中の変更内容・実装方針はここで管理する。
- 実装時は着手前に該当カテゴリの正本仕様を確認する。仕様変更を伴う実装を行った場合は、実装後に**正本 `docs/仕様・計画/*` を更新して同期**を保つこと。
- 用語の追加・更新は `docs/共通用語/共通用語.md` を更新する。

## コーディング規約

機械検査できる規約の正本は `eslint.config.mjs` / `.prettierrc` / `tsconfig.json`（項目と理由の一覧は `docs/lint規約一覧.md`）。ここには lint で取れないものだけを書く。

- ソースコード内コメントは日本語、変数名・関数名・コンポーネント名・ファイル名は英語
- 配置: ページ `src/app/`、UI `src/components/`、状態 `src/stores/`（zustand）、副作用のないロジック `src/lib/`、共有 hooks `src/hooks/`、型 `src/types/`、サーバー処理 `functions/src/<機能>/`
- Firestore ドキュメントの型は `src/types/` の既存定義を再利用する。外部入力は zod で検証してから型付けする
- プラン制限などの強制はバックエンドで行う（NFR-011）。日時は JST 基準（NFR-010）、演算は date-fns
- テスト: ユニットは `tests/unit/<機能>/<対象>.test.ts(x)`（Firebase 依存は `tests/unit/setup.ts` の方式でモック）、UI 変更は `tests/e2e/` の smoke で通る spec
- lint 化予定（PR3 で ESLint に移したらここから消す）: `any`・非 null アサーション `!`・`enum`・`console.*`・`==` を書かない／`as` は `as const` と外部境界のみ（リテラルは `satisfies`）／型のみの import は `import type`／コンポーネントは `export function Name()`、default export は Next.js が要求する箇所のみ

## 完了の定義

- 受入条件ごとに、それを検証するテスト（または手動確認の手順と結果）がある
- 自分でアプリを動かして変更箇所を確認した（UI・API に影響する場合。run-and-debug スキル）
- 仕様変更ありなら正本仕様と共通用語が同期済み
- 作業中に見つけた範囲外の課題はすべて起票済み（file-issue スキル）

## レビュー判定基準（負債ゼロ基準）

一次レビューは、以下が1つでもあれば「要修正」。合格は要修正0件のときだけ。lint・CI で検出できるものはここに書かない。

- 受入条件の未達、回帰、仕様と実装の食い違い、正本仕様・共通用語の未同期
- 例外の握りつぶし（通知・メール送信などの失敗を成功扱いにする）
- 症状だけの修正（同じ関数の他の呼び出し元・同種の箇所を放置）
- 仕様にないフォールバック・デフォルト値で失敗を隠す
- テストの不安定性を固定 sleep・retry・`.skip` で隠す
- 暫定実装（上限と移行条件が `ponytail:` コメントで明記されていないもの）、Issue 番号のない TODO/FIXME
- 非推奨 API の新規使用、指示範囲外のリファクタの混入
- 抑制コメント（`eslint-disable`・`@ts-ignore`・`@ts-expect-error`）の新規追加

## 報告書式

各エージェントの返却・PR コメントの末尾に必ず付ける。

```
## 起票した Issue
- #123 タイトル（無ければ「なし」）
```

レビュー結果は `node scripts/agent/post-review.mjs`、最終レポートは `node scripts/agent/publish-report.mjs` で PR コメントとして投稿する（判定マーカーはこの2つのスクリプトだけが付ける）。
スクリーンショットなどレポート素材は `review-artifacts/pr-<番号>/`（git 管理外）に置く。
