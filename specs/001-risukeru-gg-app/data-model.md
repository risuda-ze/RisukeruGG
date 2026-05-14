# Data Model: リスケるGG MVP

**Phase 1 完了日**: 2026-05-12
**更新日**: 2026-05-13（認証方式・プランシステム・チームコード対応）
**ストレージ**: Cloud Firestore（ドキュメント指向）

---

## Firestoreコレクション構造

```
users/
  {userId}/                         # Firebase Auth の UID（Google OAuth）
    displayName: string
    email: string                   # Googleアカウントのメールアドレス
    avatarUrl: string | null
    currentTeamId: string | null    # 現在所属チームID（1チームのみ）
    plan: "light" | "party"         # ユーザーのプラン
    planUpdatedAt: Timestamp        # プラン変更日時
    monthlyTaskCount: number        # 当月作成タスク数（LIGHTプラン制限用）
    monthlyCollabCount: number      # 当月作成コラボ数（LIGHTプラン制限用）
    countResetAt: Timestamp         # 最後のカウントリセット日時（毎月1日 JST）
    createdAt: Timestamp
    notificationPreferences: {      # PARTYプランのみ有効（LIGHTはsystemのみ）
      collab: { inApp: boolean; push: boolean }
      tasks: { inApp: boolean; push: boolean }
      reminders: { inApp: boolean; push: boolean }
      system: { inApp: boolean; push: boolean }
    }
    fcmTokens: string[]             # FCMデバイストークン（複数デバイス対応）
    googleCalendar: {
      connected: boolean
      accessToken: string | null    # Google OAuth アクセストークン（Googleカレンダー用）
      refreshToken: string | null
      syncError: string | null      # 最後の同期エラーメッセージ（nullなら正常）
      lastSyncedAt: Timestamp | null
    } | null

teams/
  {teamId}/
    name: string
    ownerId: string                 # users/{userId}
    teamCode: string                # チーム参加用コード（英数字8文字、ユニーク）
    createdAt: Timestamp

    members/
      {userId}/                     # Firebase Auth UID をドキュメントIDとして使用
        role: "owner" | "editor" | "viewer"
        displayName: string
        avatarUrl: string | null
        plan: "light" | "party"     # 参加時点のプランスナップショット（制限チェック用）
        joinedAt: Timestamp

    kanbanColumns/
      {columnId}/
        name: string                # 例: "TODO", "進行中", "完了"
        order: number               # 表示順序（昇順）
        color: string               # Tailwind色クラス または HEXコード
        createdAt: Timestamp

    schedules/
      {scheduleId}/
        title: string
        type: "stream" | "video"    # 配信枠 or 動画投稿予定
        startAt: Timestamp
        endAt: Timestamp
        platform: "youtube" | "twitch" | "both" | null
        status: "planned" | "live" | "ended" | "cancelled"
        description: string
        participantIds: string[]    # users/{userId}[]
        collabPartnerName: string | null  # フリーテキスト（コラボ相手名）
        linkedTaskIds: string[]     # tasks/{taskId}[] （動画タイプのみ使用）
        updatedAt: Timestamp        # 楽観的ロック用バージョンフィールド
        createdBy: string           # users/{userId}
        createdAt: Timestamp

    tasks/
      {taskId}/
        title: string
        columnId: string            # kanbanColumns/{columnId}
        category: "shooting" | "editing" | "thumbnail" | "announcement" | "other"
        assigneeId: string | null   # users/{userId} （未アサインはnull）
        dueDate: Timestamp | null
        linkedScheduleId: string | null  # schedules/{scheduleId}
        updatedAt: Timestamp        # 楽観的ロック用バージョンフィールド
        createdBy: string           # users/{userId}
        createdAt: Timestamp

    collabSessions/
      {sessionId}/                  # UUID v4 をドキュメントIDとして使用（= URLトークン）
        title: string
        partnerName: string         # コラボ相手名（フリーテキスト）
        createdBy: string           # users/{userId}
        teamId: string              # teams/{teamId}
        proposedDates: Timestamp[]  # 候補日程リスト（最低1件・最大5件）
        responses: {
          dates: {
            [isoDateString: string]: "ok" | "ng"
          }
          alternativeDates: Timestamp[]  # 代替日提案（任意）
          respondedAt: Timestamp
          note: string | null
        } | null
        expiresAt: Timestamp        # 作成者指定（1〜30日）
        status: "open" | "confirmed" | "expired" | "cancelled"
        confirmedDate: Timestamp | null
        linkedScheduleId: string | null  # 確定後に作成されたschedules/{scheduleId}
        createdAt: Timestamp

    notifications/
      {notificationId}/
        recipientId: string         # users/{userId}
        category: "collab" | "tasks" | "reminders" | "system"
        type: string                # 例: "collab_response", "task_assigned", "stream_reminder_1h"
        title: string               # 通知タイトル
        body: string                # 通知本文
        refType: "schedule" | "task" | "collab" | "team" | null
        refId: string | null        # 参照先エンティティのID
        isRead: boolean
        createdAt: Timestamp

teamCodes/
  {teamCode}/                       # チームコードを直接ドキュメントIDとして使用（高速ルックアップ）
    teamId: string                  # teams/{teamId}
    createdAt: Timestamp            # リセット日時（リセット時に上書き）
```

---

## エンティティ間のリレーション図

```
users ──────────────────────────────────────┐
  │                                          │
  │ currentTeamId (単一)                      │ createdBy
  ▼                                          │
teams ◄─────────────────────────────────────┘
  ├── members/{userId}    (role, plan snapshot)
  ├── kanbanColumns/      (order, color)
  ├── schedules/          (updatedAt for optimistic lock)
  │     └── linkedTaskIds[] ──► tasks/
  ├── tasks/              (columnId ──► kanbanColumns/)
  │     └── assigneeId ──► users/
  ├── collabSessions/     (sessionId = URLトークン)
  │     └── linkedScheduleId ──► schedules/
  └── notifications/      (recipientId ──► users/)

teamCodes/                (独立コレクション、チームコード → チームID の高速逆引き)
```

---

## 型定義（TypeScript）

```typescript
// src/types/entities.ts

export type UserRole = 'owner' | 'editor' | 'viewer';
export type PlanType = 'light' | 'party';
export type ScheduleType = 'stream' | 'video';
export type ScheduleStatus = 'planned' | 'live' | 'ended' | 'cancelled';
export type Platform = 'youtube' | 'twitch' | 'both';
export type TaskCategory = 'shooting' | 'editing' | 'thumbnail' | 'announcement' | 'other';
export type CollabStatus = 'open' | 'confirmed' | 'expired' | 'cancelled';
export type NotificationCategory = 'collab' | 'tasks' | 'reminders' | 'system';

export const LIGHT_PLAN_LIMITS = {
  maxTeamMembers: 2,
  monthlyTasks: 5,
  monthlyCollabs: 3,
} as const;

export interface NotificationPreferences {
  collab: { inApp: boolean; push: boolean };
  tasks: { inApp: boolean; push: boolean };
  reminders: { inApp: boolean; push: boolean };
  system: { inApp: boolean; push: boolean };
}

export interface User {
  uid: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  currentTeamId: string | null;     // 1チームのみ所属
  plan: PlanType;
  planUpdatedAt: Date;
  monthlyTaskCount: number;
  monthlyCollabCount: number;
  countResetAt: Date;               // 毎月1日 0:00 JST にリセット
  createdAt: Date;
  notificationPreferences: NotificationPreferences;
  fcmTokens: string[];
  googleCalendar: {
    connected: boolean;
    syncError: string | null;
    lastSyncedAt: Date | null;
  } | null;
}

export interface TeamMember {
  userId: string;
  role: UserRole;
  displayName: string;
  avatarUrl: string | null;
  plan: PlanType;                   # 制限チェック用スナップショット
  joinedAt: Date;
}

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  teamCode: string;                 // 英数字8文字のユニークコード
  createdAt: Date;
}

export interface KanbanColumn {
  id: string;
  name: string;
  order: number;
  color: string;
  createdAt: Date;
}

export interface ScheduleEntry {
  id: string;
  title: string;
  type: ScheduleType;
  startAt: Date;
  endAt: Date;
  platform: Platform | null;
  status: ScheduleStatus;
  description: string;
  participantIds: string[];
  collabPartnerName: string | null;
  linkedTaskIds: string[];
  updatedAt: Date;
  createdBy: string;
  createdAt: Date;
}

export interface Task {
  id: string;
  title: string;
  columnId: string;
  category: TaskCategory;
  assigneeId: string | null;
  dueDate: Date | null;
  linkedScheduleId: string | null;
  updatedAt: Date;
  createdBy: string;
  createdAt: Date;
}

export interface CollabSession {
  id: string;           // URLトークン（UUID v4）
  title: string;
  partnerName: string;
  createdBy: string;
  teamId: string;
  proposedDates: Date[];
  responses: {
    dates: Record<string, 'ok' | 'ng'>;
    alternativeDates: Date[];
    respondedAt: Date;
    note: string | null;
  } | null;
  expiresAt: Date;
  status: CollabStatus;
  confirmedDate: Date | null;
  linkedScheduleId: string | null;
  createdAt: Date;
}

export interface Notification {
  id: string;
  recipientId: string;
  category: NotificationCategory;
  type: string;
  title: string;
  body: string;
  refType: 'schedule' | 'task' | 'collab' | 'team' | null;
  refId: string | null;
  isRead: boolean;
  createdAt: Date;
}
```

---

## バリデーションルール（Zod）

```typescript
// src/lib/validations/schedule.ts
import { z } from 'zod';

export const scheduleEntrySchema = z.object({
  title: z.string().min(1).max(100),
  type: z.enum(['stream', 'video']),
  startAt: z.date(),
  endAt: z.date(),
  platform: z.enum(['youtube', 'twitch', 'both']).nullable(),
  status: z.enum(['planned', 'live', 'ended', 'cancelled']),
  description: z.string().max(1000).default(''),
  participantIds: z.array(z.string()).default([]),
  collabPartnerName: z.string().max(100).nullable().default(null),
}).refine(
  (data) => data.endAt > data.startAt,
  { message: '終了日時は開始日時より後にしてください', path: ['endAt'] }
);

export const collabSessionSchema = z.object({
  title: z.string().min(1).max(100),
  partnerName: z.string().min(1).max(100),
  proposedDates: z.array(z.date()).min(1).max(5),
  expiresInDays: z.number().int().min(1).max(30),
});

export const kanbanColumnSchema = z.object({
  name: z.string().min(1).max(30),
  color: z.string(),
  order: z.number().int().min(0),
});

export const taskSchema = z.object({
  title: z.string().min(1).max(200),
  columnId: z.string().min(1),
  category: z.enum(['shooting', 'editing', 'thumbnail', 'announcement', 'other']),
  assigneeId: z.string().nullable().default(null),
  dueDate: z.date().nullable().default(null),
  linkedScheduleId: z.string().nullable().default(null),
});

export const joinTeamSchema = z.object({
  teamCode: z.string().min(1).max(20),
});
```

---

## 状態遷移

### ScheduleEntry.status
```
planned → live → ended
planned → cancelled
live → cancelled
ended → (終端)
cancelled → (終端)
```

### CollabSession.status
```
open → confirmed  (日程確定)
open → expired    (有効期限切れ、Cloud Schedulerが自動更新)
open → cancelled  (Owner/Editorが手動キャンセル)
confirmed → cancelled (確定後キャンセル)
expired → (終端)
```

### Task.columnId（カスタムカラム）
- カラム間の移動は制約なし（任意のカラムに移動可能）
- カラム削除時: そのカラムのタスクはデフォルト最初のカラムに移動

### User.currentTeamId（チーム所属）
```
null（ソロチーム所属）
  → チーム作成: teams/{newTeamId} にオーナーとして参加
  → チームコード参加: 既存チームへEditorとして参加

チーム所属中
  → 脱退（Editor/Viewer）: ソロチームに戻る（自動生成）
  → 脱退（Owner）: 所有権移譲後にソロチームに戻る
  → 別チームへの参加: 現在のチームを自動脱退してから新チームに参加
```

---

## プラン制限定数

| プラン | メンバー上限 | タスク（月） | コラボ（月） | 通知 | 広告 |
|--------|------------|------------|------------|------|------|
| LIGHT  | 2名        | 5件        | 3件        | systemのみ | あり |
| PARTY  | 無制限     | 無制限     | 無制限     | 4カテゴリ | なし |

月次カウントリセット: 毎月1日 0:00 JST（Cloud Schedulerが `15 0 1 * *` UTC で実行）
