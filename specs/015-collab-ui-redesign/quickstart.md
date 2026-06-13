# Quickstart: コラボ調整機能 UI リデザイン

## 開発サーバー起動

> **重要**: Sprint 2 以降、コラボ新規作成は Cloud Function (`createCollabSessionDraft`) 経由になっています。
> ローカルで新規作成をテストするには Firebase Functions Emulator が必要です。

**ターミナル 1 — Functions をビルドしてエミュレータを起動**

```bash
pnpm functions:build          # functions/src → functions/lib にコンパイル
firebase emulators:start      # Auth / Firestore / Functions / Storage をまとめて起動
```

**ターミナル 2 — Next.js 開発サーバー**

```bash
pnpm dev
# http://localhost:3000 で起動
```

> `.env.local` に `NEXT_PUBLIC_USE_EMULATORS=true` が設定されている場合は上記の手順が必要です。
> Functions Emulator が起動していない状態で新規作成を試みると `functions/internal` エラーが発生します。

## 対象画面

`http://localhost:3000/collabs`（ログイン・チーム加入が必要）

## デザインファイルの確認

デザインファイル本体は `specs/015-collab-ui-redesign/design/gg-readme/project/` に解凍済み。

```bash
# ブラウザでデザインプロトタイプを直接開く場合
# コラボ.html を Double-click またはローカルサーバーで serve
```

主要な読み物:
- `design/gg-readme/project/collab-pc.jsx` — PC レイアウト全体
- `design/gg-readme/project/collab-mobile.jsx` — モバイルレイアウト
- `design/gg-readme/project/collab.css` — コラボ専用 CSS
- `design/gg-readme/chats/chat7.md` 〜 `chat8.md` — 最終デザイン変更の経緯

## テスト実行

```bash
# 型チェック
pnpm typecheck

# Lint
pnpm lint

# E2E テスト（Sprint 3 完了後）
pnpm test:e2e -- tests/e2e/collabs/collab-ui-redesign.spec.ts
```

## 主要変更ファイル

| ファイル | Sprint | 変更内容 |
|---------|--------|---------|
| `src/types/entities.ts` | 1 | `draft` ステータス追加、ラベル更新 |
| `src/lib/repositories/collabs.ts` | 1 | `draft` 対応、`updatedBy`/`updatedAt` 自動セット |
| `src/app/(protected)/collabs/page.tsx` | 1 | 2ゾーン一覧・横長カード・モバイルレスポンシブ |
| `src/components/collab/CollabDetailModal.tsx` | 2 | 左右分割・候補日カード・コメント欄・全面置き換え |
| `src/components/collab/CollabForm.tsx` | 2 | 削除（`CollabDetailModal.tsx` に統合） |
| `src/components/collab/CollabResponseForm.tsx` | 3 | コメント保存処理更新 |
| `tests/e2e/collabs/collab-ui-redesign.spec.ts` | 3 | E2E テスト新規追加 |

## CSS 追加方針

`collab.css`（デザインファイル）の CSS クラスを以下のいずれかで組み込む:
1. `src/app/(protected)/collabs/collab.css` として新規作成 → `page.tsx` で `import './collab.css'`
2. `src/app/globals.css` に追記（コラボ専用セクション）

デザインファイルの `collab.css` をほぼそのままコピーして、`globals.css` の変数名に合わせて微調整する。
