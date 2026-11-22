/** チーム内ロール（保存値）。`member` = メンバー（全権限）、`staff` = スタッフ */
export type TeamRole = 'member' | 'staff';

/**
 * 保存値をロールに変換する。
 * ponytail: 移行中の互換。旧 `operator` / `owner` は管理者として扱う（変更仕様 two-roles の PR C で `member` へ書き換えた後に外す）。
 * 上記以外（旧 `rom` / `editor` / `viewer` や未知の値）は管理者にしないため `staff` に倒す。
 */
export function toTeamRole(raw: unknown): TeamRole {
  return raw === 'member' || raw === 'operator' || raw === 'owner' ? 'member' : 'staff';
}
