# Contract — Cloud Function `createCollabSessionDraft`

**Type**: Firebase Callable Function v2 (`onCall`)
**Region**: `asia-northeast1`
**Auth**: 要認証。呼び出しユーザーは対象チームの `operator` または `member`

## Request

```ts
{
  teamId: string;
  title: string;                 // 1–100 文字
  status: 'draft' | 'open';
  content?: string;              // 0–1000 文字
  participants: { id: string; name: string; type: 'member' | 'external' }[]; // 1 件以上
  proposedDates: string[];       // ISO8601 文字列、1 件以上、各要素は有効な日付
  icon?: string;
}
```

## Response（成功）

```ts
{ sessionId: string }
```

## エラーコード契約（すべて `HttpsError`）

CF は **`HttpsError` 以外の例外を外部へ漏らさない**。内部例外は `logger.error` で記録のうえ `internal` に変換する。

| `code` | 発生条件 | `message`（利用者向け・日本語） |
|---|---|---|
| `unauthenticated` | 未認証 | 認証が必要です |
| `permission-denied` | チーム非所属 / 権限不足（rom 等） | チームメンバーではありません／オペレーターまたはメンバー権限が必要です |
| `not-found` | ユーザードキュメント不在 | ユーザーが見つかりません |
| `invalid-argument` | 必須欠落 / status 不正 / 参加者0件 / 候補日程0件 / **日付形式不正（追加）** | 各項目に応じた説明 |
| `failed-precondition` | light プラン上限到達（同時進行 / 月次） | 上限の説明とアップグレード案内 |
| `internal` | 上記以外の想定外例外（**ログ記録済み**） | コラボの作成中にサーバーエラーが発生しました。時間をおいて再試行してください |

## クライアント側マッピング契約

呼び出し元（`CollabDetailModal.handleCreate`）は `FunctionsError.code` を見て画面表示を決定する（`plan.md` の表を参照）。`internal` を含むすべてのコードに対し、`internal` という生文字列を**画面に出さない**こと。

## ログ契約（`internal` 経路）

`logger.error('createCollabSessionDraft failed', { teamId, uid, status, proposedDatesCount, participantsCount, error })`
- 機微情報（認証トークン・メール等）は出力しない。
