/** チーム内ロール（保存値）。`member` = メンバー（全権限）、`staff` = スタッフ */
export type TeamRole = 'member' | 'staff';

/**
 * 保存値をロールに変換する。
 * `member` 以外（旧値や未知の値）は管理者にしないため `staff` に倒す。
 */
export function toTeamRole(raw: unknown): TeamRole {
  return raw === 'member' ? 'member' : 'staff';
}
