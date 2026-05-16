<!--
  SYNC IMPACT REPORT
  ==================
  Version change: [TEMPLATE / unversioned] → 1.0.0
  Bump rationale: MAJOR — initial ratification; all placeholder tokens replaced with concrete values.

  Principles (new):
    I.   シンプルさ優先 (Simplicity First)
    II.  TypeScript型安全 (TypeScript Type Safety)
    III. テスト方針 (Testing Policy)
    IV.  Firebase・セキュリティ (Firebase & Security)
    V.   日本語コメント (Japanese Comments)

  Added sections:
    - 技術スタック制約 (Technology Stack Constraints)
    - 開発ワークフロー (Development Workflow)

  Removed sections: none

  Templates requiring updates:
    - .specify/templates/plan-template.md  ✅ aligned (Constitution Check section present, no structural changes needed)
    - .specify/templates/spec-template.md  ✅ aligned (no principle-specific dependencies)
    - .specify/templates/tasks-template.md ✅ aligned (test OPTIONAL note matches Principle III)
    - .specify/templates/commands/         ✅ N/A (no command files present)

  Follow-up TODOs:
    - None. All placeholders resolved.
-->

# リスケるGG Constitution

## Core Principles

### I. シンプルさ優先

シンプルな解決策から始める。仮定の将来要件のために設計してはならない。

- 新しい抽象化は、具体的な使用箇所が3つ以上存在する場合にのみ導入してよい
- コンポーネント・関数・モジュールの責務は1つに絞る
- 類似コードを3行書く方が、時期尚早な抽象化よりも優れている
- YAGNI原則を厳守する。不要になる機能をあらかじめ実装しない

**Rationale**: 配信者向けスケジューラーは変化の早いプロダクトである。過度な設計は変更コストを
高め、配信特化機能の迅速な追加を妨げる。

### II. TypeScript型安全

全てのコードはTypeScriptで記述し、`strict: true`モードを有効にする。

- `any`型は禁止。真に型付けできないサードパーティAPIとの境界でのみ許容し、必ず局所化する
- 全ての公開APIの境界（コンポーネントのprops、関数シグネチャ、APIレスポンス）に明示的な型注釈を付ける
- システム境界（APIレスポンス、フォーム入力）ではZodによるランタイムバリデーションを行う
- `as unknown as T`などの型キャストは最終手段とし、コメントで理由を必ず説明する

**Rationale**: チーム開発における保守性向上と、Firestoreの動的データ構造によるバグを防ぐため。

### III. テスト方針

テストはコアビジネスロジックのみに書く。全てのコードをテストする必要はない。

- **必須**: 認証フロー、コラボ日程調整ロジック、タスク状態遷移のユニットテスト（Vitest）
- **必須**: ログイン・スケジュール作成・タスク管理の主要ユーザージャーニーのE2Eテスト（Playwright）
- **任意**: UIコンポーネントのテストは原則不要。表示ロジックが複雑な場合のみ書く
- **禁止**: 1行ユーティリティや単純なデータ変換のテストは書かない

**Rationale**: テストのメンテナンスコストを最小化しながら、実際の障害リスクが高い箇所を確実に守る。

### IV. Firebase・セキュリティ

Firebaseエコシステムを活用し、セキュリティはFirebase Security Rulesで一元管理する。

- Security RulesはチームスコープでデータアクセスをMUST制限する。クロスチームデータ漏洩は許可しない
- Cloud FunctionsではFirebase Admin SDKでの認証チェックをMUSTとする
- FirestoreへのCRUDはコンポーネントから直接行わず、型付きリポジトリ関数を経由する
- 認証トークンのリフレッシュはFirebase SDK標準機能に任せ、独自実装しない

**Rationale**: BaaSとしてのFirebaseを最大限に活用し、インフラ管理コストをゼロに近づける。
セキュリティルールの一元化により、チーム招待・ロール変更の複雑な権限管理を安全に保つ。

### V. 日本語コメント

コードコメントは全て日本語で記述する。

- コメントはWHY（なぜ）を説明する。WHAT（何をしているか）はコード自体が語る
- 変数名・関数名・ファイル名は英語命名規則に従う（日本語識別子は使用しない）
- ユーザー向けUI文字列は日本語とする
- JSDocコメントのdescriptionフィールドも日本語で記述する

**Rationale**: 開発チームが日本語話者であり、英語コメントは読解コストを生む。
命名は英語のままにすることで、ライブラリ・フレームワークの慣習と一貫性を保つ。

## 技術スタック制約

プロジェクトで使用する技術スタックは以下に固定する。新規の主要依存関係の追加はチーム合意が必要。

**フロントエンド**:

- Next.js 14（App Router）、TypeScript、Tailwind CSS
- Zustand（状態管理）、react-big-calendar（カレンダーUI）
- @hello-pangea/dnd（ドラッグ&ドロップ）、next-pwa（PWA対応）

**バックエンド（BaaS）**:

- Firebase Authentication、Cloud Firestore、Firebase Storage
- Firebase Cloud Functions、Firebase Cloud Messaging（FCM）

**インフラ・ツール**:

- Vercel（ホスティング）、GitHub Actions（CI/CD）
- pnpm（パッケージマネージャー）、ESLint + Prettier（Linter/Formatter）
- Vitest（ユニットテスト）、Playwright（E2Eテスト）

## 開発ワークフロー

フェーズベースのデリバリーを採用する。MVP（フェーズ1）を最優先で完成させ、その後反復的に機能を追加する。

- 全ての機能開発はフィーチャーブランチで行い、PRレビューを経てmainへマージする
- PRマージ前の必須チェック: ESLint + Prettierのパス、TypeScriptコンパイルエラーゼロ、CIの全テストグリーン
- 複雑性を導入する場合は、featureのplan.mdの「Complexity Tracking」セクションに理由を記録する
- セキュリティ要件（Firebase Security Rules）はフェーズ1の完了前に必ず実装する

## Governance

この憲法は他のあらゆる慣行・ガイドラインよりも優先される。

- 改定にはPR形式での文書化・根拠の説明・マイグレーション計画が必要
- MAJOR版アップ（後方互換性のない変更）はチーム全員の合意を要する
- PR レビュー時に本憲法への準拠を確認する
- 全ての原則からの逸脱は、feature plan.mdの「Complexity Tracking」に文書化する

**Version**: 1.0.0 | **Ratified**: 2026-05-12 | **Last Amended**: 2026-05-12
