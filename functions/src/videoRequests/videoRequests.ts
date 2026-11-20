import { onCall, type CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { db, getAuthContext, requireOwnerOrEditor } from '../lib/validateAuth';

const REGION = 'asia-northeast1';

interface CreateVideoRequestData {
  teamId: string;
  title: string;
  editorDiscordIds: string[];
  videoType: 'long' | 'short';
  summary: string;
  projectManagementUrl: string | null;
  notes: string | null;
  titleIdea: string | null;
  startAt: string | null;
  firstDraftDueAt: string | null;
  finalPackageDueAt: string | null;
  taskColumnId: string;
  reviewTaskColumnId: string;
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new HttpsError('invalid-argument', '日付の形式が不正です');
  return parsed;
}

export const createVideoRequest = onCall({ region: REGION }, async (request: CallableRequest<CreateVideoRequestData>) => {
  const input = request.data;
  if (!input.teamId || !input.title?.trim() || !input.summary?.trim() || !input.taskColumnId || !input.reviewTaskColumnId) {
    throw new HttpsError('invalid-argument', '必須項目が不足しています');
  }
  if (!Array.isArray(input.editorDiscordIds) || input.editorDiscordIds.length === 0) {
    throw new HttpsError('invalid-argument', '編集者のDiscordユーザーIDを1名以上指定してください');
  }
  if (input.editorDiscordIds.some((id) => !/^\d{15,22}$/.test(id))) {
    throw new HttpsError('invalid-argument', 'DiscordユーザーIDの形式が不正です');
  }
  const ctx = await getAuthContext(request, input.teamId);
  requireOwnerOrEditor(ctx);
  const videoRequestRef = db.collection(`teams/${input.teamId}/videoRequests`).doc();
  const taskRef = db.collection(`teams/${input.teamId}/tasks`).doc();
  const now = FieldValue.serverTimestamp();
  await db.runTransaction(async (tx) => {
    const column = await tx.get(db.doc(`teams/${input.teamId}/taskStatuses/${input.taskColumnId}`));
    if (!column.exists) throw new HttpsError('not-found', '選択したタスク状態が見つかりません');
    const reviewColumn = await tx.get(db.doc(`teams/${input.teamId}/taskStatuses/${input.reviewTaskColumnId}`));
    if (!reviewColumn.exists) throw new HttpsError('not-found', '納品時のタスク状態が見つかりません');
    tx.set(taskRef, {
      title: `動画依頼: ${input.title.trim()}`,
      columnId: input.taskColumnId,
      categoryId: null,
      description: input.summary.trim(),
      assigneeId: null,
      dueDate: parseDate(input.finalPackageDueAt),
      dueDateAllDay: true,
      linkedScheduleId: null,
      videoRequestId: videoRequestRef.id,
      updatedAt: now,
      createdBy: ctx.uid,
      createdAt: now,
    });
    tx.set(videoRequestRef, {
      teamId: input.teamId,
      title: input.title.trim(),
      editorDiscordIds: [...new Set(input.editorDiscordIds)],
      videoType: input.videoType === 'short' ? 'short' : 'long',
      summary: input.summary.trim(),
      projectManagementUrl: input.projectManagementUrl || null,
      notes: input.notes || null,
      titleIdea: input.titleIdea || null,
      startAt: parseDate(input.startAt),
      firstDraftDueAt: parseDate(input.firstDraftDueAt),
      finalPackageDueAt: parseDate(input.finalPackageDueAt),
      deliveryUrls: [],
      status: 'pending_discord',
      taskId: taskRef.id,
      taskColumnId: input.taskColumnId,
      reviewTaskColumnId: input.reviewTaskColumnId,
      discord: { status: 'pending', editorThreadIds: [], editorThreadUrls: [], thumbnailThreadId: null, thumbnailThreadUrl: null, error: null },
      createdBy: ctx.uid,
      createdAt: now,
      updatedAt: now,
    });
  });
  return { videoRequestId: videoRequestRef.id, taskId: taskRef.id };
});

export const requestVideoRevision = onCall(
  { region: REGION },
  async (request: CallableRequest<{ teamId: string; videoRequestId: string; message: string }>) => {
    const { teamId, videoRequestId, message } = request.data;
    if (!teamId || !videoRequestId || !message?.trim()) throw new HttpsError('invalid-argument', '必須項目が不足しています');
    const ctx = await getAuthContext(request, teamId);
    requireOwnerOrEditor(ctx);
    const ref = db.doc(`teams/${teamId}/videoRequests/${videoRequestId}`);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError('not-found', '動画依頼が見つかりません');
    const event = ref.collection('discordEvents').doc();
    const now = FieldValue.serverTimestamp();
    await db.runTransaction(async (tx) => {
      tx.update(ref, { status: 'in_progress', updatedAt: now });
      tx.set(event, { type: 'revision_requested', message: message.trim(), status: 'pending', createdBy: ctx.uid, createdAt: now, updatedAt: now });
    });
  }
);

export const approveVideoRequest = onCall(
  { region: REGION },
  async (request: CallableRequest<{ teamId: string; videoRequestId: string }>) => {
    const { teamId, videoRequestId } = request.data;
    const ctx = await getAuthContext(request, teamId);
    requireOwnerOrEditor(ctx);
    const ref = db.doc(`teams/${teamId}/videoRequests/${videoRequestId}`);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError('not-found', '動画依頼が見つかりません');
    const taskId = snap.data()!.taskId as string;
    const now = FieldValue.serverTimestamp();
    await db.runTransaction(async (tx) => {
      tx.update(ref, { status: 'completed', updatedAt: now });
      if (taskId) tx.update(db.doc(`teams/${teamId}/tasks/${taskId}`), { updatedAt: now });
    });
  }
);
