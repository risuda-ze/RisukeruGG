# 本番データ移行バッチ実行手順

このドキュメントは、scripts 配下の移行バッチを安全に実行するための運用メモです。

対象スクリプト:

- `scripts/migrate-task-schema.mjs`
- `scripts/migrate-discord-schema.mjs`

## 前提条件

### 1. サービスアカウントを設定する

両スクリプトは Firebase Admin SDK を使うため、`FIREBASE_SERVICE_ACCOUNT_KEY` が必要です。

PowerShell の例:

```powershell
$env:FIREBASE_SERVICE_ACCOUNT_KEY = Get-Content .\service-account.json -Raw
```

JSON 文字列がそのまま環境変数に入っている必要があります。

### 2. まず dry-run を実行する

両スクリプトとも、既定は dry-run です。`--apply` を付けない限り Firestore には書き込みません。

### 3. 影響範囲を絞る場合は team 指定を使う

特定チームだけ確認したい場合:

```powershell
pnpm migrate:task-schema -- --team=<teamId>
pnpm migrate:discord-schema -- --team=<teamId>
```

## 実行順序

推奨順序は次の通りです。

1. task スキーマ移行の dry-run
2. discord スキーマ移行の dry-run
3. task スキーマ移行の本適用
4. discord スキーマ移行の本適用
5. アプリ主要導線の確認

task 側は画面表示や Discord タスク登録にも影響するため、先にそろえる方が安全です。

## Task スキーマ移行

対象:

- `teams/{teamId}/kanbanColumns` → `teams/{teamId}/taskStatuses`
- `teams/{teamId}/tasks/{taskId}.columnId` の整合修復

### dry-run

```powershell
pnpm migrate:task-schema
```

確認ポイント:

- `status copies` が想定件数か
- `task repairs` が想定件数か
- `warnings` に未知の `columnId` が出ていないか
- `fallback-required` が出たチームを把握できているか

### 本適用

```powershell
pnpm migrate:task-schema -- --apply
```

### 元コレクションも削除する場合

```powershell
pnpm migrate:task-schema -- --apply --prune-source
```

### fallback を許可して強制修復する場合

通常は推奨しません。まず dry-run の warning を確認してください。

```powershell
pnpm migrate:task-schema -- --apply --apply-fallback
```

元コレクション削除も同時に行う場合:

```powershell
pnpm migrate:task-schema -- --apply --apply-fallback --prune-source
```

## Discord スキーマ移行

対象:

- 旧 `discord_sessions/{discordUserId}` → 現行 `discord_sessions/{guildId}`
- `teams/{teamId}/discord/config` の既定値正規化

### dry-run

```powershell
pnpm migrate:discord-schema
```

確認ポイント:

- `planned writes` が想定件数か
- `warnings` に `missing-guild-id` が出ていないか
- `overwrite current` が意図した件数か

### 本適用

```powershell
pnpm migrate:discord-schema -- --apply
```

### 旧セッションも削除する場合

```powershell
pnpm migrate:discord-schema -- --apply --prune-legacy
```

## 実行後の確認

最低限、次を確認します。

1. タスク一覧とダッシュボードでステータス名が正常に表示される
2. タスク詳細のカラム変更が正常に保存される
3. Discord Bot 経由のタスク登録が失敗しない
4. Discord AI 会話の継続と confirm / revise / cancel が機能する
5. 旧形式のドキュメントや orphaned な `columnId` が残っていない

## 実行コマンド例

まず確認だけ行う場合:

```powershell
pnpm migrate:task-schema
pnpm migrate:discord-schema
```

本番適用する場合:

```powershell
pnpm migrate:task-schema -- --apply --prune-source
pnpm migrate:discord-schema -- --apply --prune-legacy
```

## 注意事項

- dry-run を見ずに `--apply` しない
- `--apply-fallback` は warning の内容を確認してから使う
- source を削除する前に、現行コードが旧 collection を参照していないことを確認する
- 実行ログは必ず保存する