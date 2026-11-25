# RisukeruGG

こちらのプロジェクトでは配信者向けのタスク管理・スケジュール管理アプリ「RisukeruGG」を開発する。
技術スタック・プロジェクト構成・開発コマンドなどの詳細は、正本仕様 `docs/仕様・計画/risukeru_gg_spec.md` と各カテゴリ配下の詳細ファイルを参照する。

## 開発フロー

1. Issue またはユーザー指示を orchestrator が受け、仕様変更の要否を判定する
2. 仕様変更あり: spec-author が `docs/変更仕様/<変更名>.md` と、必要に応じて正本 `docs/仕様・計画/*`・共通用語を更新した仕様だけの PR を作る → レビューセット。
3. 実装:仕様書をレビューした PR で実装を行う。実装 → レビューセット → マージ。
4. マージ後、review-auditor が共通指摘を `review-finding` Issue に記録する。2回以上出た指摘は lint-from-findings で機械検査に変える

## レビューセット

一次レビューと二次レビューの2回を1セットとする。

### 一次レビュー

- 仕様 PR の場合は spec-reviewer が行う
- 実装 PR の場合は code-reviewer が行う
- 変更箇所をレビューし、指摘と判定を出す
- 指摘点をgithubのコメントに投稿する
- 以下が1つでもあれば「要修正」。要修正0件のとき合格とする
  - 受入条件の未達、回帰、仕様と実装の食い違い、正本仕様・共通用語の未同期
  - 例外の握りつぶし（通知・メール送信などの失敗を成功扱いにする）
  - 症状だけの修正（同じ関数の他の呼び出し元・同種の箇所を放置）
  - 仕様にないフォールバック・デフォルト値で失敗を隠す
  - テストの不安定性を固定 sleep・retry・`.skip` で隠す
  - 暫定実装（上限と移行条件が `ponytail:` コメントで明記されていないもの）、Issue 番号のない TODO/FIXME
  - 非推奨 API の新規使用、指示範囲外のリファクタの混入
  - 抑制コメント（`eslint-disable`・`@ts-ignore`・`@ts-expect-error`）の新規追加
  - 共通コンポーネントの再実装

### 二次レビュー

- review-auditorが行う
- 一次レビューの結果をレビューする。
- 以下の観点を重点的に確認する。
  - 不適切な指摘（根拠がない・事実と違う・基準外の好み）がないか
  - 間違った修正に誘導していないか
  - 範囲外の解決策を今回の PR に求めていないか
  - 判定に必要な確認（観点・受入条件・動作確認）が抜けていないか
- 二次レビューの結果が fail なら、二次の報告を付けて一次レビューをやり直す

### 最終セット

- 懸念がなくなったら、最後に PR 全体を対象にしたセットをもう一度行う
- 修正の積み重ねで全体の整合が崩れていないかを見る

### 最終レポート

- 最終セットの二次レビューが pass したら、review-auditor が final-report スキルで人間向けレポートを投稿する
- マージ前の hook は、現在の HEAD に対する一次・二次の最新判定がともに `scope=full` の pass であることと、最終レポートの投稿を確認する。リベースなどで SHA だけが変わり、変更内容が同じコミットへの判定とレポートは、現在の HEAD に対するものとして扱う（再レビュー不要）
- 解決策が今回の対象範囲外、または変更が大きくなりすぎる指摘は、この PR では求めず file-issue で別 Issue にする（一次が起票し、二次は漏れや過剰な要求がないかを確認する）

## Gitブランチ運用

- 機能開発は `develop` から `feature/` ブランチを切る
- push前に`develop`でリベースを行う

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

## ドキュメントについて

- アプリ要件は `docs/仕様・計画/risukeru_gg_spec.md`
- 基本仕様は `docs/仕様・計画/*`
- 変更仕様・実装計画は `docs/変更仕様/*`

## コーディング規約

- ソースコード内コメントは日本語、変数名・関数名・コンポーネント名・ファイル名は英語
- 配置: ページ `src/app/`、UI `src/components/`、状態 `src/stores/`（zustand）、副作用のないロジック `src/lib/`、共有 hooks `src/hooks/`、型 `src/types/`、サーバー処理 `functions/src/<機能>/`
- Firestore ドキュメントの型は `src/types/` の既存定義を再利用する。外部入力は zod で検証してから型付けする
- 日時は JST 基準（NFR-010）、演算は date-fns
- テスト: ユニットは `tests/unit/<機能>/<対象>.test.ts(x)`（Firebase 依存は `tests/unit/setup.ts` の方式でモック）、UI 変更は `tests/e2e/` の smoke で通る spec

## PR規約

- レビュー結果は `node scripts/agent/post-review.mjs`
- 最終レポートは `node scripts/agent/publish-report.mjs` で PR コメントとして投稿する
- スクリーンショットなどレポート素材は `review-artifacts/pr-<番号>/`（git 管理外）に置く
- 関連するチケットをDevelopmentに入れること
