# Phase 1: Data Model — コラボセッション作成ドキュメント

本不具合はスキーマ変更を伴わない。既存の書き込み形状と、`tx.set` 時に守るべき不変条件を明確化し、`undefined`/不正値の混入を防ぐためのリファレンスとする。

## 書き込み先

`teams/{teamId}/collabSessions/{sessionId}`（`sessionId` = `randomUUID()`）

## 書き込みフィールド（`createCollabSessionDraft` の `tx.set`）

| フィールド | 型 | 生成元 | 不変条件 |
|---|---|---|---|
| `title` | string | 入力 | 1–100 文字。trim 済み・空でない |
| `partnerName` | string | 固定 `''` | — |
| `status` | `'draft' \| 'open'` | 入力 | この 2 値のみ |
| `content` | string | 入力 `?? ''` | `undefined` 不可（必ず文字列） |
| `participants` | `{id,name,type}[]` | 入力 | 1 要素以上。各要素のフィールドに `undefined` 不可 |
| `proposedDates` | `Timestamp[]`（`Date[]` から変換） | 入力 ISO 文字列 | 1 件以上。**各要素は有効な日付**（`isNaN` でない） |
| `participantResponses` | map | 固定 `{}` | — |
| `comments` | array | 固定 `[]` | — |
| `createdBy` | string | `ctx.uid` | 認証 uid |
| `teamId` | string | 入力 | — |
| `expiresAt` | `Date` | 作成日 + 30 日 | — |
| `icon` | string | 入力 `?? 'sports_esports'` | `undefined` 不可 |
| `responses` | null | 固定 | — |
| `confirmedDate` | null | 固定 | — |
| `linkedScheduleId` | null | 固定 | — |
| `createdAt` | `serverTimestamp` | サーバー | — |

## 副作用書き込み

- `status === 'open'` かつ light プランのとき: `users/{uid}.monthlyCollabCount` を `FieldValue.increment(1)`（`incrementCollabCount`）。

## 不変条件チェック（実装で追加）

1. **日付有効性**: `proposedDates` の全 ISO 文字列が有効。1 件でも不正なら `invalid-argument`。
2. **undefined 排除**: `tx.set` ペイロードに `undefined` 値を含めない（`participants` 正規化 + 既定値補完）。
3. **`HttpsError` 以外を漏らさない**: 上記いずれの違反も `internal` ではなく適切な `HttpsError` コードで返す。

## 上限（プラン制約・既存）

| 制約 | 値 | 対象 |
|---|---|---|
| 同時進行（draft/open）コラボ数 | 5（`maxActiveCollabs`） | light のみ。`assertActiveCollabLimit` |
| 月次コラボ作成数 | 3（`monthlyCollabs`） | light かつ open 作成のみ。`assertCollabQuota` |
