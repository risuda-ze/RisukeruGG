# Firestore Schema Contract: v4 変更

## `teams/{teamId}/taskStatuses/{statusId}`

| フィールド | 型 | 変更 | 説明 |
|---|---|---|---|
| `id` | string | 既存 | ドキュメント ID |
| `name` | string | 既存 | ステータス名 |
| `order` | number | 既存 | 表示順 |
| `color` | string | 既存 | カラーコード（`#RRGGBB`） |
| `role` | `'done' \| null` | 既存 | 完了ステータスフラグ |
| `icon` | `string \| null` | **★ v4 新規** | Material Icons 名（例: `pending`, `check_circle`）。未設定ドキュメントは `null` 扱い |
| `createdAt` | Timestamp | 既存 | 作成日時 |

## `teams/{teamId}/taskCategories/{categoryId}`

| フィールド | 型 | 変更 | 説明 |
|---|---|---|---|
| `id` | string | 既存 | ドキュメント ID |
| `name` | string | 既存 | カテゴリ名 |
| `color` | string | 既存 | カラーコード（`#RRGGBB`） |
| `order` | number | 既存 | 表示順 |
| `icon` | `string \| null` | **★ v4 新規** | Material Icons 名。未設定ドキュメントは `null` 扱い |
| `createdAt` | Timestamp | 既存 | 作成日時 |

## 後方互換性

- 既存ドキュメントに `icon` フィールドがない場合、クライアント側で `?? null` としてフォールバックする。
- Firestore Security Rules の変更は不要（既存フィールドと同一スコープのコレクション）。
