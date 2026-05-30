# RisukeruGG 向け Copilot 指示

## ビルド・テスト用のコマンド

```bash
pnpm dev
pnpm build
pnpm typecheck
pnpm lint
pnpm lint:fix
pnpm test
pnpm vitest run tests/unit/tasks/columnTransition.test.ts
pnpm test:coverage
pnpm test:e2e
pnpm playwright test tests/e2e/schedule.spec.ts --project=chromium
pnpm --dir functions build
pnpm --dir functions lint
```

- Playwright は `playwright.config.ts` を使用し、アプリを `http://localhost:3000` で配信する。必要に応じて `pnpm dev` を自動起動する。
- ユニットテストは `tests/unit/**`、E2E テストは `tests/e2e/**` 配下に配置する。
- Copilot クラウドエージェントのブートストラップは `.github/workflows/copilot-setup-steps.yml` にある。クラウドセッションで実際の Firebase へ接続する場合は、`NEXT_PUBLIC_FIREBASE_*` と Google OAuth の値をリポジトリの `copilot` environment secrets/variables に設定する。

## 仕様参照

- アプリ全体の概要、機能要件、非機能要件、主要データモデルは `docs/仕様・計画/risukeru_gg_spec.md` を正本として参照する。
- 機能カテゴリ別の詳細仕様は `docs/仕様・計画/*` 配下に集約する。各カテゴリでは `README.md`、`requirements.md`、`model.md`、`flows.md` を優先して参照する。
- 用語定義は `docs/共通用語/共通用語.md` を参照する。
- このファイルには仕様本文を重複記載せず、実装時の運用規約と参照先のみを記載する。

## 主要な規約

- エージェント向けの instruction とリポジトリ運用ルールは、外部仕様で固定フォーマットが求められる場合を除き、日本語で記述する。
- 文書化された Planner → Generator → Evaluator のワークフローは維持する。Planner は `/docs/spec.md`、Generator は `/github/agent/ge`、Evaluator は `/docs/feedback/` を担当する。
- ソースコード内コメントは日本語で記述する。変数名、関数名、コンポーネント名は英語のままにする。
- ロール処理は後方互換性を維持する。旧データでは `owner` / `editor` / `viewer` が残っている可能性があるため、新データだけを前提にせず `operator` / `member` / `rom` へ正規化して扱う。
- 既存の page → store → repository フローを優先する。対象ドメインに既存 Repository がある場合はそれを拡張し、コンポーネントへ Firestore 読み書きや callable invocation を直接追加しない。
- 複数ドキュメントを更新する Cloud Functions は Firestore トランザクションの読み取り順序に依存している。トランザクション内では読み取りを先に行い、既存の `FieldValue.arrayUnion` / `FieldValue.arrayRemove` パターンを維持する。
- 通知の挙動は現時点で意図的に分かれている。`markAsRead()` のような Repository ヘルパーは Firestore へ永続化する一方、`useNotificationsStore.markAllRead()` は現在ローカル状態のみ更新する。この分離は、タスクで通知永続化の変更が明示されない限り、暗黙に修正しない。
