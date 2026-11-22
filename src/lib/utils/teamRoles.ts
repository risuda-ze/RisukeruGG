import type { TeamRole } from '@/types/entities';

export const ROLE_LABELS: Record<TeamRole, string> = {
  member: 'メンバー',
  staff: 'スタッフ',
};

export const ROLE_BADGE: Record<TeamRole, 'purple' | 'amber'> = {
  member: 'purple',
  staff: 'amber',
};

/**
 * 保存値をロールに変換する。
 * ponytail: 移行中の互換。旧 `operator` / `owner` は `member` として扱う（変更仕様 two-roles の PR C で書き換えた後に外す）。
 * 旧 `rom` / `editor` / `viewer` や未知の値は管理者にしないため `staff` に倒す。
 */
export function toTeamRole(raw: unknown): TeamRole {
  return raw === 'member' || raw === 'operator' || raw === 'owner' ? 'member' : 'staff';
}

/** メンバー（チームの全権限）か */
export function isMemberRole(role: TeamRole | null | undefined): boolean {
  return role === 'member';
}

/**
 * 作成者本人かメンバーか。スタッフが「自分が作ったもの」を扱えるかの判定。
 * `createdBy` が無い・Discord 経由（'discord-bot'）・退会済みは誰にも一致せず、メンバーのみが扱える。
 */
export function canManageCreated(
  role: TeamRole | null | undefined,
  createdBy: string | null | undefined,
  uid: string | null | undefined
): boolean {
  return isMemberRole(role) || (!!uid && !!createdBy && createdBy === uid);
}
