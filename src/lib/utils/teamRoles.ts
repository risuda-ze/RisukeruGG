import type { UserRole } from '@/types/entities';

export const ROLE_LABELS: Record<UserRole, string> = {
  operator: 'オペレーター',
  member: 'メンバー',
  rom: 'ROM専',
};

export const ROLE_BADGE: Record<UserRole, 'purple' | 'amber' | 'muted'> = {
  operator: 'purple',
  member: 'amber',
  rom: 'muted',
};
