'use client';

import { useMemo } from 'react';
import { canEditRole } from '@/lib/utils/teamRoles';
import { useAuthStore } from '@/stores/auth';
import { firestoreBriefsPort } from '@/lib/repositories/briefs';
import * as ops from '@/lib/briefs/operations';
import type { OperationContext } from '@/lib/briefs/operations';
import type { Playbook, StepStatus } from '@/types/briefs';
import type { AddStepInput, CreateBriefInput, UpdateBriefHeaderInput } from '@/lib/validations/briefs';

/**
 * 画面から操作層（D-1）を呼ぶためのフック。
 * 実行文脈（チーム・操作者・ロール・入口 = web）を束ね、Firestore クライアント実装のポートで実行する。
 */
export function useBriefOps() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const currentTeam = useAuthStore((s) => s.currentTeam);
  const members = useAuthStore((s) => s.members);

  const teamId = currentTeam?.id ?? null;
  const uid = currentUser?.uid ?? null;
  const role = members.find((m) => m.userId === uid)?.role ?? null;
  const canEdit = canEditRole(role);

  return useMemo(() => {
    const ctx = (): OperationContext => {
      if (!teamId) throw new Error('チームが選択されていません');
      return { teamId, actorId: uid, role, source: 'web', now: new Date() };
    };
    const port = firestoreBriefsPort;
    return {
      teamId,
      canEdit,
      createBrief: (input: CreateBriefInput, playbook: Playbook | null) =>
        ops.createBrief(port, ctx(), input, playbook),
      updateBriefHeader: (briefId: string, input: UpdateBriefHeaderInput) =>
        ops.updateBriefHeader(port, ctx(), briefId, input),
      changeStepStatus: (briefId: string, stepId: string, to: StepStatus) =>
        ops.changeStepStatus(port, ctx(), briefId, stepId, to),
      assignStep: (briefId: string, stepId: string, assigneeId: string | null) =>
        ops.assignStep(port, ctx(), briefId, stepId, assigneeId),
      setStepDueDate: (briefId: string, stepId: string, dueDate: Date | null) =>
        ops.setStepDueDate(port, ctx(), briefId, stepId, dueDate),
      setStepFields: (briefId: string, stepId: string, fields: Record<string, unknown>) =>
        ops.setStepFields(port, ctx(), briefId, stepId, fields),
      renameStep: (briefId: string, stepId: string, title: string) =>
        ops.renameStep(port, ctx(), briefId, stepId, title),
      addStep: (briefId: string, input: AddStepInput) => ops.addStep(port, ctx(), briefId, input),
      removeStep: (briefId: string, stepId: string) => ops.removeStep(port, ctx(), briefId, stepId),
    };
  }, [teamId, uid, role, canEdit]);
}
