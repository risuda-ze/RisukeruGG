# Data Model: スケジュール・UI改善

## 変更: ScheduleEntry (types/entities.ts)

既存フィールドは変更なし。`allDay` フィールドを後方互換 optional として追加。

```typescript
export interface ScheduleEntry {
  id: string
  title: string
  categoryId: string | null
  startAt: Date
  endAt: Date
  description: string
  participantIds: string[]
  collabPartnerName: string | null
  linkedTaskIds: string[]
  updatedAt: Date
  createdBy: string
  createdAt: Date
  source?: 'google'
  allDay?: boolean  // 終日フラグ（既存データには undefined = false として扱う）
}
```

### Firestore フィールド対応

| フィールド | 型 | 説明 |
|-----------|---|------|
| `allDay` | `boolean \| undefined` | 終日予定フラグ。未設定は `false` 扱い |

---

## 新コンポーネント: DateTimeInput

```typescript
// src/components/ui/DateTimeInput.tsx
interface DateTimeInputProps {
  label: string
  value: Date | null
  onChange: (date: Date | null) => void
  min?: Date
  required?: boolean
  error?: string
  hint?: string
}
```

---

## 新コンポーネント: MarkdownEditor

```typescript
// src/components/ui/MarkdownEditor.tsx
interface MarkdownEditorProps {
  label?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxLength?: number
  readOnly?: boolean   // true の場合プレビューのみ表示（編集不可）
  rows?: number
}
```

---

## 新ユーティリティ: formDraft

```typescript
// src/lib/formDraft.ts

// シリアライズ・デシリアライズ（Date を ISO 文字列で保存）
export function saveDraft<T>(key: string, data: T): void
export function loadDraft<T>(key: string): T | null
export function clearDraft(key: string): void

// ドラフトキー定数
export const DRAFT_KEYS = {
  SCHEDULE_NEW: 'draft:schedule:new',
  scheduleEdit: (id: string) => `draft:schedule:${id}`,
} as const
```

---

## 変更: User (types/entities.ts)

```typescript
export interface User {
  uid: string
  displayName: string
  email: string
  avatarUrl: string | null
  currentTeamId: string | null  // 変更なし: 現在表示中のアクティブチーム
  teamIds: string[]             // 【新規】所属している全チームIDリスト
  plan: PlanType
  // ...他のフィールドは変更なし
}
```

---

## Cloud Functions: 複数チーム対応

### joinTeam.ts の変更

```typescript
// 変更前（削除するロジック）
if (oldTeamId) {
  tx.delete(db.doc(`teams/${oldTeamId}/members/${uid}`))
  // currentTeamId を新チームに更新
}

// 変更後（追加のみ）
tx.set(db.doc(`teams/${teamId}/members/${uid}`), { role: 'editor', ... })
tx.update(db.doc(`users/${uid}`), {
  currentTeamId: teamId,
  teamIds: FieldValue.arrayUnion(teamId),  // 既存のチームIDは保持
})
```

### leaveSpecificTeam.ts (新規 Cloud Function)

```typescript
// functions/src/teams/leaveSpecificTeam.ts
export const leaveSpecificTeam = functions.https.onCall(
  async (data: { teamId: string }, context) => {
    // 1. 指定チームのメンバードキュメントを削除
    // 2. users/{uid}.teamIds から除外
    // 3. currentTeamId が退出チームの場合、残りの teamIds[0] に切り替え
    // 4. teamIds が空になる場合は solo チームを自動生成
  }
)
```

### switchActiveTeam.ts (新規 Cloud Function)

```typescript
// functions/src/teams/switchActiveTeam.ts
export const switchActiveTeam = functions.https.onCall(
  async (data: { teamId: string }, context) => {
    // teamIds に teamId が含まれているか確認（所属チェック）
    // users/{uid}.currentTeamId を更新するだけ
  }
)
```

---

## チームスイッチャー UI (repositories/teams.ts への追加)

```typescript
// src/lib/repositories/teams.ts
export const leaveSpecificTeam = httpsCallable<
  { teamId: string },
  { success: boolean }
>(functions, 'leaveSpecificTeam')

export const switchActiveTeam = httpsCallable<
  { teamId: string },
  { success: boolean }
>(functions, 'switchActiveTeam')
```

---

## 状態遷移: フォームドラフト

```
[モーダルを開く]
      ↓
loadDraft(key) → 値があれば初期値に復元
      ↓
[ユーザーが入力]
      ↓
[モーダルを閉じる]
  ├─ 「確定」ボタン → onSubmit → clearDraft(key) → 閉じる
  └─ その他（×ボタン / Esc / 背景クリック）→ saveDraft(key, formValues) → 閉じる
```
