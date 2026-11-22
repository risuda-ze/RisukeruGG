import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { db, getAuthContext, requireMemberRole, getUserDoc } from '../lib/validateAuth';
import { LIGHT_PLAN_LIMITS } from '../lib/constants';
import { isPartyPlan } from '../lib/plan';

interface CreateTaskData {
  teamId: string;
  title: string;
  columnId: string;
  categoryId?: string | null;
  description?: string | null;
  assigneeId?: string | null;
  dueDate?: string | null;
  linkedScheduleId?: string | null;
}

export const createTask = onCall(
  { region: 'asia-northeast1' },
  async (request: CallableRequest<CreateTaskData>) => {
    const { teamId, title, columnId, categoryId, description, assigneeId, dueDate, linkedScheduleId } =
      request.data;

    if (!teamId || !title || !columnId) {
      throw new HttpsError('invalid-argument', '必須項目が不足しています');
    }

    const ctx = await getAuthContext(request, teamId);
    requireMemberRole(ctx);

    const userData = await getUserDoc(ctx.uid);

    // LIGHTプランの月次制限チェック（試用モード中は PARTY 相当で無制限）
    if (!isPartyPlan(userData.plan) && userData.monthlyTaskCount >= LIGHT_PLAN_LIMITS.monthlyTasks) {
      throw new HttpsError(
        'failed-precondition',
        `LIGHTプランのタスク作成上限（月${LIGHT_PLAN_LIMITS.monthlyTasks}件）に達しました。PARTYプランにアップグレードしてください`
      );
    }

    return await db.runTransaction(async (tx) => {
      const taskRef = db.collection(`teams/${teamId}/tasks`).doc();
      const now = FieldValue.serverTimestamp();

      tx.set(taskRef, {
        title,
        columnId,
        categoryId: categoryId ?? null,
        description: description ?? null,
        assigneeId: assigneeId ?? null,
        dueDate: dueDate ? new Date(dueDate) : null,
        linkedScheduleId: linkedScheduleId ?? null,
        updatedAt: now,
        createdBy: ctx.uid,
        createdAt: now,
      });

      // 月次カウントをインクリメント（LIGHTプランのみ。試用モード中はカウントしない）
      if (!isPartyPlan(userData.plan)) {
        tx.update(db.doc(`users/${ctx.uid}`), {
          monthlyTaskCount: FieldValue.increment(1),
        });
      }

      return { taskId: taskRef.id };
    });
  }
);
