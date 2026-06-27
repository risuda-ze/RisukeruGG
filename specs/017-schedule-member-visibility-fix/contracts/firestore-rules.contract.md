# Contract: events コレクショングループ読み取りルール

**Feature**: 017-schedule-member-visibility-fix

## 対象

Firestore セキュリティルール（`firestore.rules`）— `events` コレクショングループの読み取り認可。

## 追加するルール（契約）

`match /databases/{database}/documents` 直下（既存の `match /teams/{teamId} {…}` ブロックと同階層）に追加:

```
// メンバー予定のコレクショングループ読み取りを許可
// （teams/{teamId}/memberCalendars/{userId}/events を collectionGroup('events') で横断取得するため）
// 書き込みは既存のネストルールが担保するため、ここでは read のみ許可する
match /{path=**}/events/{eventId} {
  allow read: if request.auth != null && isTeamMember(resource.data.teamId);
}
```

## 入出力契約

| ケース | 入力（クエリ主体・条件） | 期待される結果 |
| --- | --- | --- |
| C1 | チーム T のメンバーが `collectionGroup('events').where('teamId','==',T)` を購読 | ✅ 許可。T に属する全 `events` を返す |
| C2 | 非メンバーが `where('teamId','==',T)` を購読 | ❌ 拒否（`permission-denied`）。`isTeamMember(T)` が false |
| C3 | メンバーが他チーム U の `teamId` を指定 | ❌ 拒否。`resource.data.teamId == U` に対し `isTeamMember(U)` が false |
| C4 | 未認証ユーザー | ❌ 拒否。`request.auth == null` |
| C5 | 所有者本人による write（ログイン時同期） | ✅ 許可（既存ネストルールが担保、本ルールは read のみで影響なし） |

## 不変条件（回帰防止）

- 既存のネストルール `match /teams/{teamId}/memberCalendars/{userId}/events/{eventId}` の write 条件（`request.auth.uid == userId`）を変更しないこと。
- 本ルールは `read` のみを追加し、`write` を付与しないこと（コレクショングループ経由の書き込みを許可してはならない）。
- `events` という名前のサブコレクションは `memberCalendars/{userId}/events` のみ。新たな `events` コレクションを追加する場合は本ルールの影響範囲を再評価すること。

## 検証方法

- Firestore エミュレータ or 本番デプロイ後、2 アカウント（同一チーム / 別チーム）で C1〜C4 を確認。
- `firebase firestore:rules:validate` で構文検証。
