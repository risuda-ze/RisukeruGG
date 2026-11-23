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
| `delete-member-calendars.mjs` | メンバー予定ミラーの廃止に伴う既存データ（`teams/{teamId}/memberCalendars/**`・`users/{uid}.googleCalendar`）の削除 | 適用済み（2026-11-22） |

---

## 現行スクリプト一覧

| コマンド | スクリプト | 目的 |
| --- | --- | --- |
| `pnpm cleanup:discord-invite-temp` | `cleanup-discord-invite-temp.mjs` | Bot 招待フローの途中失敗で残った一時データ（`discord_bot_invite_requests` / `discord_bot_invite_pending`）の削除。スキーマ移行ではなく任意メンテナンス |

### 適用待ちの一回性スクリプト

| コマンド | スクリプト | 目的・実行タイミング |
| --- | --- | --- |
| `node scripts/migrate-roles-to-staff.mjs` | `migrate-roles-to-staff.mjs` | ロール移行の本番作業①（`docs/変更仕様/two-roles.md`）。`teams/*/members/*` の旧 `member` / `rom` / `editor` / `viewer` を `staff` へ書き換える。**PR A の本番反映後、PR B のデプロイ前**に実行する。PR B のデプロイ後は実行しない（新 `member`＝管理者を `staff` に落とす）。適用後にスクリプトとこの表の行を削除する |
| `node scripts/migrate-operator-to-member.mjs` | `migrate-operator-to-member.mjs` | ロール移行の本番作業②（`docs/変更仕様/two-roles.md`）。`teams/*/members/*` の旧 `operator` / `owner` を `member` へ書き換え、`teams/*` の `operatorUids` / `ownerId` を削除する。**PR B の本番反映後、PR C のデプロイ前**に実行する。PR B の反映前は実行しない（PR B より前の `member` は編集者を指すため、管理者が権限を失う）。適用後にスクリプトとこの表の行を削除する |

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

---

## migrate-roles-to-staff — ロールを staff へ寄せる（本番作業①）

1. dry-run で role ごとの件数と、書き換え対象・未知の値を確認する

```powershell
node scripts/migrate-roles-to-staff.mjs
```

2. 本適用

```powershell
node scripts/migrate-roles-to-staff.mjs --apply
```

3. dry-run を再実行し、「旧 member / rom / editor / viewer は 0 件です」と出ることを確認する。**0 件を確認するまで PR B をデプロイしない**
4. 未知の role が表示された場合は終了コード 2 になり、「0 件です」の行は出ない。書き換えは行わないので、内容を確認して扱いを決める。旧 member が 0 件かどうかは、role ごとの件数に `member` / `rom` / `editor` / `viewer` の行が無いことで確認する

---

## migrate-operator-to-member — 管理者を member へ揃える（本番作業②）

PR B（ルール・Functions・クライアント）が本番に反映されていることを確認してから実行する。

1. dry-run で role ごとの件数と、書き換え対象・削除対象・未知の値を確認する

```powershell
node scripts/migrate-operator-to-member.mjs
```

2. 本適用

```powershell
node scripts/migrate-operator-to-member.mjs --apply
```

3. dry-run を再実行し、「旧 operator / owner と operatorUids / ownerId は 0 件です」と出ることを確認する。**0 件を確認するまで PR C をデプロイしない**（残っていると、その人が管理者でなくなる）
4. 未知の role が表示された場合は終了コード 2 になり、「0 件です」の行は出ない。未知の値は書き換えないので、内容を確認して扱いを決める
