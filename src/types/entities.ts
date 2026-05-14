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

// CollabSessionStatusのUI表示名マッピング
export const COLLAB_STATUS_LABELS: Record<CollabStatus, string> = {
  open: '回答受付中',
  confirmed: '確定',
  expired: '期限切れ',
  cancelled: 'キャンセル',
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
  currentTeamId: string | null;
  plan: PlanType;
  planUpdatedAt: Date;
  monthlyTaskCount: number;
  monthlyCollabCount: number;
  countResetAt: Date;
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
  plan: PlanType;
  joinedAt: Date;
}

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  teamCode: string;
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
  id: string;
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
