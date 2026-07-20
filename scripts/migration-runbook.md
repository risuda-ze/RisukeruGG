# 運用スクリプト 実行手順

## 方針

- **一回性のスキーマ移行スクリプトは、本番適用が完了した時点でリポジトリから削除する**（適用済みスクリプトの誤再実行を防ぐため）。過去の移行スクリプトが必要になった場合は Git 履歴から参照する。
- 本ドキュメントには、現在も実行し得る**常用メンテナンススクリプト**のみを記載する。

### 削除済みの適用済み移行スクリプト（Git 履歴参照）

| スクリプト | 目的 | 適用状況 |
| --- | --- | --- |
| `migrate-task-schema.mjs` | kanbanColumns → taskStatuses 移行 / columnId 修復 | 適用済み |
| `migrate-team-schema.mjs` | ownerId → operatorUids 正規化 / icon バックフィル | 適用済み |
| `migrate-category-schema.mjs` | taskCategories / scheduleCategories → categories 統合移行 | 適用済み |
| `migrate-discord-schema.mjs` | Discord セッション guildId 移行 / config 既定値正規化 | 適用済み |
| `migrate-allday-schedule-encoding.mjs` | 終日予定の endAt 排他的境界への移行 | 適用済み |

---

## 現行スクリプト一覧

| コマンド | スクリプト | 目的 |
| --- | --- | --- |
| `pnpm cleanup:discord-invite-temp` | `cleanup-discord-invite-temp.mjs` | Bot 招待フローの途中失敗で残った一時データ（`discord_bot_invite_requests` / `discord_bot_invite_pending`）の削除。スキーマ移行ではなく任意メンテナンス |

共通仕様:

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

## cleanup:discord-invite-temp — Bot 招待一時データの掃除

### dry-run

```powershell
pnpm cleanup:discord-invite-temp
```

### 本適用

```powershell
pnpm cleanup:discord-invite-temp -- --apply
```

実行タイミング: 必要時のみ（Bot 招待フローの失敗が続いた後など）。定期実行は不要。
