# Phase 1 Data Model: メンバー予定表示バグ修正

**Feature**: 017-schedule-member-visibility-fix | **Date**: 2026-06-27

本バグ修正はデータモデルを **変更しない**。既存エンティティと認可境界の整理を目的とする。

## エンティティ: MemberCalendarEvent

定義: `src/types/entities.ts`（既存）

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `id` | string | ドキュメント ID（= `sourceEventId`） |
| `title` | string | `"{displayName} の予定"`（元タイトルは保存しない＝プライバシー保護） |
| `startAt` | Date | 開始日時 |
| `endAt` | Date | 終了日時 |
| `allDay` | boolean | 終日フラグ |
| `sourceEventId` | string | Google カレンダー側のイベント ID |
| `syncedAt` | Date | 同期日時 |
| `userId` | string | 予定の所有者 UID |
| `teamId` | string | 所属チーム ID（**コレクショングループクエリのフィルタキー**） |

## Firestore パス

```
teams/{teamId}/memberCalendars/{userId}/events/{eventId}
```

- 各ドキュメントは冗長的に `teamId` と `userId` を保持しており、コレクショングループクエリ（`collectionGroup('events')` + `where('teamId','==',…)`）で全メンバーの予定を一括取得できる。

## 認可境界（本修正の対象）

| 操作 | 主体 | 条件 | 担保するルール |
| --- | --- | --- | --- |
| 書き込み（同期） | 予定の所有者本人 | `request.auth.uid == userId` | 既存ネストルール `match /teams/{teamId}/memberCalendars/{userId}/events/{eventId}`（変更なし） |
| 単一ドキュメント読み取り | チームメンバー | `isTeamMember(teamId)` | 既存ネストルール（変更なし） |
| **コレクショングループ読み取り** | チームメンバー | `isTeamMember(resource.data.teamId)` | **【新規】再帰ワイルドカードルール** `match /{path=**}/events/{eventId}` |

**変更の本質**: コレクショングループ読み取りを認可する行を追加するのみ。エンティティのフィールド・パス・書き込み権限は不変。

## 状態遷移

該当なし（イミュータブルなイベントスナップショット。同期のたびに `set` で上書き）。
