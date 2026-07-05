# 本番データ移行バッチ 実行手順

## ⚠️ 絶対に実行しないスクリプト

| スクリプト | 理由 |
|-----------|------|
| `migrate-task-statuses.mjs` | **廃止済み・エミュレーター専用の旧スクリプト。** `migrate-task-schema.mjs` に置き換え済み。package.json のコマンド名も `migrate:task-statuses:DEPRECATED` に変更済み。実行しても即エラー終了するガードを入れてある。 |

---

## 現行スクリプト一覧

| コマンド | スクリプト | 目的 |
|---------|-----------|------|
| `pnpm migrate:task-schema` | `migrate-task-schema.mjs` | kanbanColumns → taskStatuses 移行 / columnId 修復 |
| `pnpm migrate:team-schema` | `migrate-team-schema.mjs` | ownerId → operatorUids 正規化 / icon フィールドバックフィル |
| `pnpm migrate:category-schema` | `migrate-category-schema.mjs` | taskCategories / scheduleCategories → categories 統合移行 |
| `pnpm migrate:discord-schema` | `migrate-discord-schema.mjs` | Discord セッション guildId 移行 |
| `pnpm cleanup:discord-invite-temp` | `cleanup-discord-invite-temp.mjs` | Bot招待フローの失敗で残った一時データの削除（スキーマ移行ではなく任意メンテナンス） |

全スクリプト共通：
- **Firebase Admin SDK 使用**（本番接続）
- **既定は dry-run**。`--apply` を付けない限り Firestore には一切書き込まない

---

## 前提条件

### サービスアカウントキーの設定

```powershell
$env:FIREBASE_SERVICE_ACCOUNT_KEY = Get-Content .\service-account.json -Raw

# 確認（project_id が正しいか必ずチェックする）
$env:FIREBASE_SERVICE_ACCOUNT_KEY | ConvertFrom-Json | Select-Object project_id, client_email
```

---

## 推奨実行順序

```
1. migrate:task-schema     dry-run  → 内容確認
2. migrate:team-schema     dry-run  → 内容確認
3. migrate:category-schema dry-run  → 内容確認
4. migrate:discord-schema  dry-run  → 内容確認
5. migrate:task-schema     --apply [--prune-source]
6. migrate:team-schema     --apply
7. migrate:category-schema --apply [--prune-source]
8. migrate:discord-schema  --apply  [--prune-legacy]
9. アプリ主要導線の確認
```

task スキーマは画面表示・Discord 連携の両方に影響するため最初に当てるのが安全です。

---

## migrate:task-schema — Task スキーマ移行

**対象スキーマ変更（2026-05-30, commit 5e55281）:**

| 変更前 | 変更後 |
|--------|--------|
| `teams/{id}/kanbanColumns/{colId}` | `teams/{id}/taskStatuses/{colId}` |
| `tasks/{id}.columnId` = kanbanColumns の ID | `tasks/{id}.columnId` = taskStatuses の ID |

### dry-run

```powershell
pnpm migrate:task-schema
```

確認ポイント:

- `status copies` — `kanbanColumns` に残っているドキュメント数。0 なら移行済み
- `task repairs` — `columnId` が旧 ID を指しているタスク数。0 なら修復済み
- `warnings` — 未解決の `columnId` がないか。`fallback-required` が出たチームは手動確認

### 本適用

```powershell
pnpm migrate:task-schema -- --apply
```

### 元コレクション（kanbanColumns）も削除する場合

```powershell
pnpm migrate:task-schema -- --apply --prune-source
```

### fallback を許可して強制修復する場合（通常は不要）

```powershell
pnpm migrate:task-schema -- --apply --apply-fallback --prune-source
```

---

## migrate:team-schema — Team スキーマ最新化

**対象スキーマ変更:**

| 変更前 | 変更後 | コミット |
|--------|--------|---------|
| `teams/{id}.ownerId: string` | `teams/{id}.operatorUids: string[]` | 5e55281 (2026-05-30) |
| `taskStatuses/{id}` に `icon` フィールドなし | `icon: string\|null` | 4f22765 (2026-06) |
| `taskCategories/{id}` に `icon` フィールドなし | `icon: string\|null` | 4f22765 (2026-06) |

**補足:**
- `ownerId` はアプリ側で後方互換を持つが、Cloud Functions（deleteAccount / leaveTeam）が `operatorUids` を書き込む前提のため正規化が必要
- `icon` はアプリ側が `?? null` でデフォルト処理するが、Firestore に明示的に書いておく

### dry-run

```powershell
pnpm migrate:team-schema
```

確認ポイント:

- `owner patches` — `ownerId` のみ持つチーム数。0 なら正規化済み
- `icon patches` — `icon` フィールドのない `taskStatuses` / `taskCategories` の件数
- `warnings: missing-owner` — `ownerId` も `operatorUids` もないチームは手動対応が必要

### 本適用

```powershell
pnpm migrate:team-schema -- --apply
```

### 特定チームのみ

```powershell
pnpm migrate:team-schema -- --apply --team=<teamId>
```

---

## migrate:category-schema — カテゴリ統合スキーマ移行

**対象スキーマ変更（2026-07-05, commit 6c96d0b）:**

| 変更前 | 変更後 |
|--------|--------|
| `teams/{id}/taskCategories/{catId}` | `teams/{id}/categories/{catId}` |
| `teams/{id}/scheduleCategories/{catId}` | `teams/{id}/categories/{catId}` |
| `tasks/{id}.categoryId` = taskCategories の ID | `tasks/{id}.categoryId` = categories の ID（IDそのまま） |
| `schedules/{id}.categoryId` = scheduleCategories の ID | `schedules/{id}.categoryId` = categories の ID（IDそのまま） |

**補足:**
- タスク・スケジュールのカテゴリ統合機能自体は実装済みで動作に問題はないが、
  旧 `taskCategories` / `scheduleCategories` の実データを新 `categories` コレクションへ
  コピーしていないため、本番環境では既存タスク・スケジュールの `categoryId` が
  「未選択」表示になっている。
- 本スクリプトは **ID を維持したままコピー**するため、既存の `categoryId` 参照はコピー後に
  自動的に解決される（タスク・スケジュール側のデータ変更は不要）。
- `name` / `color` / `order` はそのままコピーし、`icon` は文字列でなければ `null` に正規化する。
- 移行先に同一 ID のドキュメントが既に存在する場合はスキップし、`conflicts` として警告する
  （手動確認が必要）。

### dry-run

```powershell
pnpm migrate:category-schema
```

確認ポイント:

- `category copies` — `taskCategories` / `scheduleCategories` から `categories` へコピーされる件数
- `skipped` — 移行先に同一 ID が既に存在しスキップされた件数（再実行時は移行済みのため増える想定。初回実行で 0 でなければ既存カテゴリとの ID 衝突がないか確認）

### 本適用

```powershell
pnpm migrate:category-schema -- --apply
```

### 元コレクション（taskCategories / scheduleCategories）も削除する場合

```powershell
pnpm migrate:category-schema -- --apply --prune-source
```

### 特定チームのみ

```powershell
pnpm migrate:category-schema -- --apply --team=<teamId>
```

---

## migrate:discord-schema — Discord スキーマ移行

**対象スキーマ変更（2026-05-31, commit 704f6d4）:**

| 変更前 | 変更後 |
|--------|--------|
| `discord_sessions/{discordUserId}` | `discord_sessions/{guildId}` |
| `teams/{id}/discord/config` に `guildId`/`channelId` なし | 既定値で正規化 |

### dry-run

```powershell
pnpm migrate:discord-schema
```

確認ポイント:

- `planned writes` — 移行対象のセッション数
- `warnings: missing-guild-id` — guildId 未設定のチームは自動移行不可（手動対応）
- `overwrite current` — 既存 guildId セッションを上書きする件数

### 本適用

```powershell
pnpm migrate:discord-schema -- --apply
```

### 旧セッションも削除する場合

```powershell
pnpm migrate:discord-schema -- --apply --prune-legacy
```

---

## cleanup:discord-invite-temp — Bot招待フロー 一時データ クリーンアップ

**これはスキーマ移行ではありません。** Bot招待フロー（bot-invite-start → Discord OAuth →
bot-invite-callback）が認証エラーや Firestore インデックス不足などで途中失敗すると、
`discord_bot_invite_requests` / `discord_bot_invite_pending` に削除されないまま
一時ドキュメントが残ることがある。機能への支障はないが、放置するとゴミが
蓄積するため任意で削除する。

Windowsで直接実行する場合は `scripts/cleanup-discord-invite-temp.bat` をダブルクリック
（dry-run → 内容確認 → `apply` と入力した場合のみ削除を実行）。

### dry-run

```powershell
pnpm cleanup:discord-invite-temp
```

確認ポイント:

- `stale invite requests` — 期限切れ・expiresAt 欠損の招待リクエスト数
- `stale pending invites` — 一定時間（既定60分）経過したチャンネル選択待ちの件数

### 本適用

```powershell
pnpm cleanup:discord-invite-temp -- --apply
```

---

## 実行後の確認チェックリスト

- [ ] タスク一覧・ダッシュボードでステータス名が正常表示される
- [ ] タスク詳細でカラム変更が保存される
- [ ] タスク設定画面でアイコン列が表示される（未設定は空欄）
- [ ] チーム設定でオーナー権限が正常に機能する
- [ ] `/settings/categories` で既存カテゴリ名・色・アイコンが表示される
- [ ] 既存タスク・スケジュールのカテゴリ表示が「未選択」になっていない
- [ ] Discord Bot 経由のタスク登録が失敗しない
- [ ] 旧 `kanbanColumns` コレクションや orphaned な `columnId` が残っていない

---

## 一括実行（全移行をまとめて行う場合）

```powershell
# Step 1: サービスアカウント設定
$env:FIREBASE_SERVICE_ACCOUNT_KEY = Get-Content .\service-account.json -Raw
$env:FIREBASE_SERVICE_ACCOUNT_KEY | ConvertFrom-Json | Select-Object project_id, client_email  # 要確認

# Step 2: dry-run（全スクリプト）
pnpm migrate:task-schema
pnpm migrate:team-schema
pnpm migrate:category-schema
pnpm migrate:discord-schema

# Step 3: 内容を確認してから本適用
pnpm migrate:task-schema     -- --apply --prune-source
pnpm migrate:team-schema     -- --apply
pnpm migrate:category-schema -- --apply --prune-source
pnpm migrate:discord-schema  -- --apply --prune-legacy
```

---

## 注意事項

- dry-run の出力を必ず確認してから `--apply` を実行する
- `--apply-fallback` は warning を確認した上で使う
- `--prune-source` / `--prune-legacy` は現行コードが旧コレクションを参照していないことを確認してから使う
- 実行ログは必ずコピーして保存する
- `missing-owner` 警告が出たチームは自動移行できないため手動で Firebase Console から確認する
