# RisukeruGG

こちらのプロジェクトでは配信者向けのタスク管理・スケジュール管理アプリ「RisukeruGG」を開発します。

For additional context about technologies to be used, project structure, shell commands, and other important information, read the current plan at `specs/001-risukeru-gg-app/plan.md`.

<!-- SPECKIT START -->

現在進行中のUIリデザイン（タスク管理画面）v4: `specs/014-task-ui-redesign/plan.md`

**v4 実装スコープ（2026-06-05）**:
- `/settings/tasks` 専用ルートの新規作成（FR-023）
- `TaskStatus` / `TaskCategory` に `icon: string | null` フィールド追加（FR-024/025）
- カンバン列ヘッダー・カテゴリバッジ・タスク詳細モーダルでアイコン表示（FR-026/027/028）
- タスク管理（v1〜v3）の実装は完了済み（T001〜T050）。v4 は T052〜 から開始

<!-- SPECKIT END -->

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

このプロジェクトは常に3つのサブエージェント（Planner → Generator → Evaluator）によるパイプラインで構築され、質の高い成果物を提供することを目的とする。

- 最新仕様は `docs/仕様・計画/*` を正本とし、仕様の変更履歴や詳細設計、実装計画の補足や差分は `specs/*` に記述する。

### エージェント構成

```
Planner ──→ Generator ──→ Evaluator
 (企画)      (実装)        (検証)
              ↑               │
              └── 不合格時 ──┘
```

### ファイル規約

- **仕様書は Planner だけが書く。** Generator・Evaluator は読み取り専用。
- **進捗は Generator だけが書く。** Evaluator は読み取り専用。
- **フィードバックは Evaluator だけが書く。** Generator は読み取り専用。

### ワークフロー

#### Step 1: 企画（Planner）

- ユーザーのプロンプトを受け取り、仕様書を生成
- 技術的な実装詳細（DB設計、API設計、技術スタック）には踏み込まない
- 各スプリントに Evaluator がテスト可能な受け入れ基準を必ず記述する

#### Step 2: 実装（Generator）

- 各仕様書と実装計画書を読み、次の実装を行う
- 完了時に `/docs/progress.md` へ自己評価と引き渡し事項（起動方法、テストURL、テストシナリオ）を記録
- 前スプリントのフィードバック（`/docs/feedback/sprint-N.md`）があれば、修正を先に行う

#### Step 3: 検証（Evaluator）

- `/docs/spec.md` の受け入れ基準と `/docs/progress.md` の引き渡し事項を読む
- Playwright MCP でアプリを実際に操作してテスト
- 結果を `/docs/feedback/sprint-N.md` に出力
- 不合格の場合 → Generator に戻って修正（Step 2 へ）
- 合格の場合 → 次のスプリントへ（Step 2 へ）

### 評価基準と閾値

| 基準               | 閾値     | 不合格時の扱い       |
| ------------------ | -------- | -------------------- |
| 機能完全性         | 4/5 以上 | Generator に差し戻し |
| 動作安定性         | 4/5 以上 | Generator に差し戻し |
| UI/UX品質          | 3/5 以上 | Generator に差し戻し |
| エラーハンドリング | 3/5 以上 | Generator に差し戻し |
| 回帰なし           | 5/5 必須 | Generator に差し戻し |

**1つでも閾値を下回ればスプリント不合格。**

### 絶対ルール

1. **責務を越境しない** - Planner は実装しない。Generator は仕様を変更しない。Evaluator はコードを修正しない。
2. **スプリント順序を守る** - Sprint 1 → 2 → 3 と順番に実装する。スキップ禁止。
3. **動作する状態を維持する** - 各スプリント完了時にアプリが正常に起動・動作すること。
4. **フィードバックを最優先で処理する** - Generator は新スプリント着手前に、前スプリントの不合格フィードバックを修正すること。
5. **起動手順を必ず記載する** - Generator は `/docs/progress.md` にアプリの起動コマンドを毎回明記する。Evaluator はそれに従って起動する。
6. **仕様書同期** - Generator は実装前に必ず最新の `/docs/risukeru_gg_spec.md` を読み、仕様変更がないか確認すること。変更があれば Planner に問い合わせること。
