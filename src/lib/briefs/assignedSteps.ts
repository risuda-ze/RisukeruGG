import type { Brief, Step } from '@/types/briefs';
import { isStepClosed } from './transitions';

/**
 * 指定メンバーが担当中の工程（未完了・アーカイブ済みブリーフを除く）を締切順に返す。
 * /briefs/mine とメンバー詳細で共用する。
 */
export function selectAssignedSteps(
  steps: Step[],
  briefs: Brief[],
  uid: string | undefined
): { step: Step; brief: Brief }[] {
  const briefById = new Map(briefs.map((b) => [b.id, b]));
  return steps
    .filter((s) => s.assigneeId === uid && !isStepClosed(s.status))
    .filter((s) => {
      const b = briefById.get(s.briefId);
      return b && b.status !== 'archived';
    })
    .sort((a, b) => {
      // 締切あり → 近い順、締切なしは末尾。同日なら着手可能を先に
      const ad = a.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
      const bd = b.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
      if (ad !== bd) return ad - bd;
      return (a.status === 'waiting' ? 1 : 0) - (b.status === 'waiting' ? 1 : 0);
    })
    .map((s) => ({ step: s, brief: briefById.get(s.briefId)! }));
}
