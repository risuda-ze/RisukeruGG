# Quickstart — 再現・検証手順

## 起動

```bash
pnpm dev          # フロント (localhost:3000)
```

Cloud Functions の動作確認は Firebase Emulator を推奨（真因のサーバーログを確認するため）:

```bash
cd functions
pnpm build        # TS ビルド
firebase emulators:start --only functions,firestore
```

> クライアントは `src/lib/firebase/client.ts` で `connectFunctionsEmulator` 接続を行う設定がある場合に Emulator を使用する。本番 CF を直接叩く場合は `asia-northeast1` にデプロイ済みであること。

## 不具合の再現

1. ログイン後、サイドバーから「コラボ調整」を開く。
2. 「コラボ調整開始」→ タイトル・参加者1名以上・候補日程1件以上を入力。
3. 「新規追加」を押す。
4. **現状**: バリデーション欄に `internal` と表示され、作成されない。

## 修正後の検証（受け入れ基準に対応）

| 確認 | 手順 | 期待結果 |
|---|---|---|
| AC1 正常作成 | 上記手順で「新規追加」 | 成功し、一覧の「調整中」に表示される |
| AC2 サーバーログ | 異常を誘発（例: Emulator で Firestore を一時停止）して作成 | Emulator ログに `createCollabSessionDraft failed` と `teamId`/`uid`/error が出る |
| AC3 画面メッセージ | 上限到達・権限不足などを誘発 | `internal` ではなく状況に応じた日本語が表示 |
| AC4 回帰なし | 既存コラボの回答・確定・キャンセル・再開・共有リンク作成 | すべて従来どおり動作 |
| AC5 CI | `pnpm typecheck && pnpm lint && pnpm test` | 通過 |

## 関連ファイル

- サーバー: `functions/src/collab/createCollabSessionDraft.ts`, `functions/src/collab/lib.ts`
- クライアント: `src/components/collab/CollabDetailModal.tsx`（`handleCreate`）, `src/lib/repositories/collabs.ts`
- 新規（任意）: `src/lib/firebase/errors.ts`
