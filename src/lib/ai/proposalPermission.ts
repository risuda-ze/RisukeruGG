import type { TeamRole } from '@/types/entities';
import { isMemberRole } from '@/lib/utils/teamRoles';

/**
 * AI の提案を登録できるか。
 * タスク・コラボ（task / collab / task_update）の作成・更新はメンバーのみ。スケジュールは所属者全員が作れる。
 */
export function canRegisterProposals(
  role: TeamRole | null | undefined,
  proposals: ReadonlyArray<{ type: string }>
): boolean {
  if (!role) return false;
  if (isMemberRole(role)) return true;
  return proposals.length > 0 && proposals.every((p) => p.type === 'schedule');
}
