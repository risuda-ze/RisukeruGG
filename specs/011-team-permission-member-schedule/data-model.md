# Data Model: チーム権限バグ修正 & メンバースケジュール閲覧機能

## 既存エンティティの変更

### TeamMember（変更）

**変更内容**: 1チームに複数の `operator` ロールを許可する

**変更箇所**:
- `src/components/team/RoleChangeDialog.tsx`: `currentOperatorId` prop を削除、強制降格ロジックを削除
- `src/app/(protected)/team/page.tsx`: `member.role !== 'operator'` 条件を削除

**Firestoreパス**: `teams/{teamId}/members/{userId}` （変更なし）

```typescript
// 既存（変更なし）
interface TeamMember {
  userId: string;
  role: 'operator' | 'member' | 'rom';  // 複数operatorを許可（制約はUIのみから除去）
  displayName: string;
  avatarUrl: string | null;
  plan: string;
  joinedAt: Date;
}
```

---

## 新規エンティティ

### MemberCalendarEvent（新規）

ユーザーのGoogleカレンダーから同期された予定エントリ。タイトルは「{ユーザー名} の予定」として保存し、元のタイトルは保持しない。

**Firestoreパス**: `teams/{teamId}/memberCalendars/{userId}/events/{eventId}`

```typescript
interface MemberCalendarEvent {
  id: string;                   // Firestore Document ID（sourceEventIdをハッシュ化またはそのまま使用）
  title: string;                // "{displayName} の予定" （固定フォーマット）
  startAt: Timestamp;           // 開始日時
  endAt: Timestamp;             // 終了日時
  allDay: boolean;              // 終日イベントか
  sourceEventId: string;        // GoogleカレンダーのeventId（重複排除用）
  syncedAt: Timestamp;          // 同期日時
}
```

**Security Rules 追加**:
```
match /teams/{teamId}/memberCalendars/{userId}/events/{eventId} {
  allow read: if isTeamMember(teamId);
  allow write: if request.auth != null && request.auth.uid == userId;
}
```

---

## State Transitions（チーム切り替え）

```
[チームA表示中]
    ↓ handleSwitch(teamBId)
[switching=true] → switchActiveTeam CF呼び出し
    ↓ CF完了: users/{uid}.currentTeamId = teamBId
[Firestore onSnapshot 発火] → currentTeamId 更新
    ↓ 各ストア useEffect (teamId 依存) が再実行
[チームB表示中]
```

チーム切り替え後に確実にデータを更新するため:
- `switchActiveTeam` 完了後に `router.refresh()` を呼び出す
- またはページコンポーネントが `currentTeamId` を `useEffect` の依存として持ち、データ再取得を行う

---

## ログイン時の同期フロー

```
[ログイン成功]
    ↓ onAuthStateChanged コールバック
[users/{uid} onSnapshot 開始]
    ↓ currentTeamId 確定
[googleAccessToken が sessionStorage にある場合]
    ↓ fetchGCalEvents() → Google Calendar API
[イベント取得成功（最大250件）]
    ↓ Firestoreに書き込み（writeBatch）
teams/{currentTeamId}/memberCalendars/{uid}/events/{sourceEventId}
    title: "{displayName} の予定"
    startAt, endAt, allDay, sourceEventId, syncedAt
```

---

## スケジュール画面の表示データソース

| ソース | データ取得先 | 表示制御 |
|--------|------------|---------|
| 自分のGoogleカレンダー | `fetchGCalEvents()` (Google API直接) | トグル or 常時表示 |
| メンバーの予定 | `teams/{teamId}/memberCalendars/*/events` | トグルで表示/非表示 |
| チームの予定 | `teams/{teamId}/schedules` | 既存表示（変更なし） |

**重複排除ルール**:
- 「メンバーの予定」の中で `userId === currentUser.uid` のイベントは、「自分のGoogleカレンダー」が有効な場合は非表示（Firestoreに保存された自分の予定を直接取得版で上書き）

---

## AI コンテキスト拡張

**アーキテクチャ**: 既存の `/api/ai/chat` はクライアントが `buildContext()` でデータを組み立てて POST body で渡す設計。memberCalendars も同じパターンに従い、サーバーサイドでの Firestore アクセスは行わない。

### クライアント側 (`AIChatPage.tsx` の `buildContext()`)

```typescript
// 追加するフィールド
memberCalendars: memberCalendarEvents
  .filter(e => e.userId !== currentUser.uid)  // 自分の重複を除外
  .filter(e => isWithin14Days(e.startAt))      // 今日〜14日先
  .slice(0, 20 * teamMemberCount)              // 全体上限
  .map(e => ({
    userId: e.userId,
    displayName: members.find(m => m.userId === e.userId)?.displayName ?? e.userId,
    startAt: format(e.startAt, 'yyyy/MM/dd HH:mm'),
    endAt: format(e.endAt, 'HH:mm'),
    allDay: e.allDay,
  }))
```

### サーバー側 (`route.ts` のシステムプロンプト整形)

```typescript
// context に追加するフィールド
memberCalendars?: Array<{
  userId: string;
  displayName: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
}>

// システムプロンプトに追加する文字列
【メンバーの予定（2週間以内）】
{formatMemberCalendars(context?.memberCalendars ?? [])}
```

取得範囲: 今日の0:00〜14日後の23:59
