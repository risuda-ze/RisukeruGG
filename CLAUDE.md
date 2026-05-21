# RisukeruGG

こちらのプロジェクトでは配信者向けのタスク管理・スケジュール管理アプリ「RisukeruGG」を開発します。

For additional context about technologies to be used, project structure, shell commands, and other important information, read the current plan at `specs/001-risukeru-gg-app/plan.md`.

<!-- SPECKIT START -->

現在進行中の チーム管理改善・ナビ修正: `specs/008-team-management-improvements/plan.md`

<!-- SPECKIT END -->

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

## アーキテクチャ

### 技術スタック

- Next.js 14 (App Router) + TypeScript 5
- Tailwind CSS 4 — `@theme` ブロックでデザイントークンを定義（`src/app/globals.css`）
- Firebase: Auth (Google SSO)・Firestore・Storage・FCM
- Zustand — クライアント状態管理
- React Hook Form + Zod — フォームバリデーション
- react-big-calendar — スケジュールカレンダー
- @hello-pangea/dnd — カンバンドラッグ&ドロップ
- Vitest (unit) / Playwright (E2E)
- docker-compose — ローカル開発環境（Firebase エミュレータ含む）

### 注意事項

- 認証フロー: `AuthProvider` が `initAuthListener()` を起動 → Zustand `useAuthStore` に状態保持。`(protected)/layout.tsx` が `currentUser` を監視してログインページへリダイレクト。開発環境では Google SSO をエミュレータで模倣。
- Firestoreデータアクセス: `src/lib/repositories/` の関数経由のみ。コレクションパスは常に `teams/{teamId}/...` のサブコレクション構造。リアルタイム購読には `onSnapshot` を使用し、アンサブスクライバーを返す。
- デザインシステム: ダークテーマ固定。`globals.css` の `@theme` ブロックで Tailwind カスタムカラー（`bg-bg`, `bg-surface`, `bg-card`, `text-purple`, `text-amber` 等）を定義。CSS変数（`--bg`, `--surface` 等）も `:root` に定義。
- レスポンシブ: `md` (768px) ブレークポイントで Sidebar 表示・BottomNav 非表示を切り替え。AppShell がこの切り替えを担う。
- 型安全: Props は全てインライン型注釈。バリアントは union 型。`any` 使用禁止。
- コメント言語: ソースコード内のコメントは**日本語**で記述する（変数名・コンポーネント名は英語）。

### 環境変数

`.env.local.example` を参考に `.env.local` を作成:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_USE_EMULATORS=true   # Firebase エミュレータ使用時
```

### テスト戦略

- **ユニットテスト**: `tests/unit/` — ビジネスロジック・バリデーション・状態変換のみ対象。UIコンポーネントテストは原則不要。
- **E2E テスト**: `tests/e2e/` — login・schedule・tasks の主要フロー。`localhost:3000` を使用（`pnpm dev` が必要）。
