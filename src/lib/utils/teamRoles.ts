import type { UserRole } from '@/types/entities';

export const ROLE_LABELS: Record<UserRole, string> = {
  operator: 'オペレーター',
  member: 'メンバー',
  staff: 'スタッフ',
  rom: 'ROM専',
};

export const ROLE_BADGE: Record<UserRole, 'purple' | 'amber' | 'muted'> = {
  operator: 'purple',
  member: 'amber',
  staff: 'amber',
  rom: 'muted',
};

/**
 * 編集権限を持つロールか。
 * ponytail: 移行中の互換。`staff` は旧 `member` と同じ編集者として扱う。意味の切り替え（変更仕様 two-roles の PR B）で置き換える
 */
export function canEditRole(role: UserRole | null | undefined): boolean {
  return role === 'operator' || role === 'member' || role === 'staff';
}
