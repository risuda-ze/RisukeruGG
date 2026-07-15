# RisukeruGG

こちらのプロジェクトでは配信者向けのタスク管理・スケジュール管理アプリ「RisukeruGG」を開発します。

技術スタック・プロジェクト構成・開発コマンドなどの詳細は、正本仕様 `docs/仕様・計画/risukeru_gg_spec.md` と各カテゴリ配下の詳細ファイルを参照してください。

現在のアクティブ機能: リリース準備（speckit 廃止・課金・広告・デザイン統一ほか） → `docs/変更仕様/release-preparation.md`

## Gitブランチ運用

### ブランチ構成

| ブランチ | 役割 |
| --- | --- |
| `main` | 本番ブランチ。本番環境にデプロイされる。 |
| `develop` | 開発ブランチ。機能開発のマージ先。PRのデフォルトターゲット。 |
| `feature/{名前}` | 機能開発・修正用ブランチ。`develop`から切る。 |

### ルール

1. **機能開発は必ず`develop`から`feature/`ブランチを切って作業する**
2. **開発PRのマージ先は常に`develop`** — `main`への直接マージは禁止
3. **`main`へのマージは`develop`から不定期に行う**（リリース時のみ）
4. PRを作成する際は`base`ブランチを`develop`に設定すること

### 絶対禁止

- `main`への直接コミット・直接マージ
- `feature/`ブランチから`main`へのPR作成

## コミュニケーションルール

**日本語**で応答する

## コマンド

```bash
pnpm dev          # 開発サーバー起動 (localhost:3000)
pnpm build        # プロダクションビルド
pnpm typecheck    # TypeScript 型チェック (tsc --noEmit)
pnpm lint         # ESLint (src/ 対象)
pnpm lint:fix     # ESLint 自動修正
pnpm format       # Prettier フォーマット

pnpm test                   # Vitest ユニットテスト (run mode)
pnpm test:watch             # Vitest ウォッチモード
pnpm test:coverage          # カバレッジ付きテスト
pnpm test:e2e               # Playwright E2E テスト
pnpm test:e2e:ui            # Playwright UI モード
```

単一テストファイルを実行する場合:

```bash
pnpm vitest run tests/unit/tasks/columnTransition.test.ts
```

## プロジェクトルール

### 仕様の正本と変更管理

- **正本仕様**は `docs/仕様・計画/*`（カテゴリ別: user / plan / team / schedule / task / collab / notification / ui / platform）。親仕様は `docs/仕様・計画/risukeru_gg_spec.md`。
- **変更仕様・実装計画**は `docs/変更仕様/*` に記述する。進行中の変更内容・実装方針はここで管理する。
- 実装時は着手前に該当カテゴリの正本仕様を確認する。仕様変更を伴う実装を行った場合は、実装後に**正本 `docs/仕様・計画/*` を更新して同期**を保つこと。
- 用語の追加・更新は `docs/共通用語/共通用語.md` を更新する。

### 開発の心得

- **動作する状態を維持する** — 変更完了時にアプリが正常に起動・動作すること。
- **回帰を出さない** — 変更後に `pnpm typecheck` / `pnpm lint` / `pnpm test` を実行し、既存機能への回帰がないことを確認する。
- ソースコード内コメントは日本語、変数名・コンポーネント名は英語（NFR-013）。
