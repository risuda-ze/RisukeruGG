import { getAdminFirestore } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { TaskProposal } from '@/lib/ai/parseProposal';

/**
 * Discord Bot 経由のタスク登録。
 * Admin SDK で Firestore に直接書き込む（Security Rules をバイパス）。
 * 個人ユーザーは特定しないため createdBy は 'discord-bot' とする。
 */
export async function registerTask(
  teamId: string,
  proposal: TaskProposal,
  members: Array<{ userId: string; displayName: string }>,
  columns: Array<{ id: string; name: string }>
): Promise<string> {
  const db = getAdminFirestore();

  // assigneeName を userId に解決する
  const assigneeId =
    proposal.assigneeName
      ? (members.find((m) => m.displayName === proposal.assigneeName)?.userId ?? null)
      : null;

  // columnName を columnId に解決する（見つからなければ最初のカラム）
  const targetColumn =
    (proposal.columnName ? columns.find((c) => c.name === proposal.columnName) : null) ??
    columns[0];

  const taskRef = db.collection(`teams/${teamId}/tasks`).doc();
  const now = FieldValue.serverTimestamp();

  await taskRef.set({
    title: proposal.title,
    columnId: targetColumn?.id ?? '',
    categoryId: null,
    description: proposal.description ?? null,
    assigneeId,
    dueDate: proposal.dueDate ? new Date(proposal.dueDate) : null,
    linkedScheduleId: null,
    createdBy: 'discord-bot',  // 個人ユーザーを追跡しないため固定値
    updatedAt: now,
    createdAt: now,
  });

  return taskRef.id;
}
