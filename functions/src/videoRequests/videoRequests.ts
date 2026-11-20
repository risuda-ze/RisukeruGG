import { onCall, type CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { db, getAuthContext, requireOperator, requireOwnerOrEditor } from '../lib/validateAuth';

import { videoRequestColumns } from './columns';

const REGION = 'asia-northeast1';

interface CreateVideoRequestData {
  teamId: string;
  title: string;
  editorMemberIds?: string[];
  editorDiscordIds?: string[];
  videoType: 'long' | 'short';
  summary: string;
  projectManagementUrl: string | null;
  notes: string | null;
  titleIdea: string | null;
  startAt: string | null;
  firstDraftDueAt: string | null;
  finalPackageDueAt: string | null;
}

interface UpdateVideoRequestData extends CreateVideoRequestData {
  videoRequestId: string;
}

type DiscordUpdateTarget = 'editor' | 'thumbnail' | 'both';

interface DiscordUpdateItem {
  target: DiscordUpdateTarget;
  label: string;
  value: string;
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()))
    throw new HttpsError('invalid-argument', '日付の形式が不正です');
  return parsed;
}

function sameStringArray(a: unknown, b: string[]): boolean {
  if (!Array.isArray(a) || a.length !== b.length) return false;
  return [...a].sort().every((value, index) => value === [...b].sort()[index]);
}

function sameDate(value: unknown, next: Date | null): boolean {
  if (value === null || value === undefined) return next === null;
  const current =
    value instanceof Date
      ? value
      : typeof (value as { toDate?: unknown }).toDate === 'function'
        ? (value as { toDate: () => Date }).toDate()
        : null;
  return current?.getTime() === next?.getTime();
}

function dateLabel(value: Date | null): string {
  return value ? value.toLocaleDateString('ja-JP') : '未設定';
}

async function findTaskStatusId(
  teamId: string,
  predicate: (status: FirebaseFirestore.DocumentData) => boolean
): Promise<string | null> {
  const statuses = await db.collection(`teams/${teamId}/taskStatuses`).get();
  return statuses.docs.find((status) => predicate(status.data()))?.id ?? null;
}

async function getProgressColumnId(teamId: string, request: FirebaseFirestore.DocumentData) {
  const config = request.progressTaskColumnId
    ? null
    : await db.doc(`teams/${teamId}/settings/videoRequests`).get();
  const id = request.progressTaskColumnId ?? config?.get('progressColumnId');
  if (!id || !(await db.doc(`teams/${teamId}/taskStatuses/${id}`).get()).exists)
    throw new HttpsError(
      'failed-precondition',
      'カテゴリ設定で動画依頼の制作中列を指定してください'
    );
  return id as string;
}

async function findDoneTaskStatusId(teamId: string): Promise<string | null> {
  return findTaskStatusId(teamId, (status) => status.role === 'done');
}

function validateInput(input: CreateVideoRequestData) {
  if (!input.teamId || !input.title?.trim() || !input.summary?.trim()) {
    throw new HttpsError('invalid-argument', '必須項目が不足しています');
  }
  if (!input.projectManagementUrl?.trim() || !input.titleIdea?.trim()) {
    throw new HttpsError('invalid-argument', 'プロマネのリンクとタイトル案（仮）は必須です');
  }
  try {
    const url = new URL(input.projectManagementUrl);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('protocol');
  } catch {
    throw new HttpsError(
      'invalid-argument',
      'プロマネのリンクは http:// または https:// で入力してください'
    );
  }
  if (input.editorDiscordIds !== undefined) {
    const ids = input.editorDiscordIds;
    if (
      !Array.isArray(ids) ||
      !ids.length ||
      ids.some((id) => typeof id !== 'string' || !/^\d{17,20}$/.test(id))
    ) {
      throw new HttpsError(
        'invalid-argument',
        'DiscordユーザーIDを17〜20桁の半角数字で入力してください'
      );
    }
  } else if (!Array.isArray(input.editorMemberIds) || input.editorMemberIds.length === 0) {
    throw new HttpsError('invalid-argument', '担当編集者を1名以上選択してください');
  }
  if (!input.firstDraftDueAt || !input.finalPackageDueAt) {
    throw new HttpsError('invalid-argument', '初稿納期と完パケ納期を入力してください');
  }
  const start = parseDate(input.startAt);
  const firstDraft = parseDate(input.firstDraftDueAt);
  const finalPackage = parseDate(input.finalPackageDueAt);
  if (start && firstDraft && firstDraft < start) {
    throw new HttpsError('invalid-argument', '初稿納期は編集開始日以降の日付を指定してください');
  }
  if (start && finalPackage && finalPackage < start) {
    throw new HttpsError('invalid-argument', '完パケ納期は編集開始日以降の日付を指定してください');
  }
  if (firstDraft && finalPackage && firstDraft > finalPackage) {
    throw new HttpsError('invalid-argument', '完パケ納期は初稿納期以降の日付を指定してください');
  }
}

async function getEditorsInTransaction(
  tx: FirebaseFirestore.Transaction,
  teamId: string,
  editorMemberIds: string[]
): Promise<string[]> {
  const ids = [...new Set(editorMemberIds)];
  const editorDocs = await Promise.all(
    ids.map((memberId) => tx.get(db.doc(`teams/${teamId}/members/${memberId}`)))
  );
  const cachedDiscordIds: string[] = [];
  for (const member of editorDocs) {
    if (!member.exists)
      throw new HttpsError('not-found', '選択した担当編集者がチームに見つかりません');
    const data = member.data()!;
    if (!data.discordUserId && !data.discordUsername) {
      throw new HttpsError(
        'failed-precondition',
        '担当編集者のDiscordユーザー名が未登録です。チーム管理で登録してください'
      );
    }
    if (typeof data.discordUserId === 'string') cachedDiscordIds.push(data.discordUserId);
  }
  return [...new Set(cachedDiscordIds)];
}

export const createVideoRequest = onCall(
  { region: REGION },
  async (request: CallableRequest<CreateVideoRequestData>) => {
    const input = request.data;
    validateInput(input);
    const ctx = await getAuthContext(request, input.teamId);
    requireOwnerOrEditor(ctx);
    const videoRequestRef = db.collection(`teams/${input.teamId}/videoRequests`).doc();
    const taskRef = db.collection(`teams/${input.teamId}/tasks`).doc();
    const thumbnailTask = taskRef.parent.doc();
    const now = FieldValue.serverTimestamp();
    await db.runTransaction(async (tx) => {
      const config = (await tx.get(db.doc(`teams/${input.teamId}/settings/videoRequests`))).data();
      if (!config)
        throw new HttpsError('failed-precondition', 'カテゴリ設定で動画依頼の列を指定してください');
      const mapping = videoRequestColumns(config);
      if (!mapping)
        throw new HttpsError('failed-precondition', '動画依頼の3つの列を設定してください');
      const { pendingColumnId, progressColumnId, reviewColumnId } = mapping;
      const ids = [pendingColumnId, progressColumnId, reviewColumnId];
      const columns = await Promise.all(
        ids.map((id) => tx.get(db.doc(`teams/${input.teamId}/taskStatuses/${id}`)))
      );
      if (columns.some((col) => !col.exists || col.get('role') === 'done'))
        throw new HttpsError('failed-precondition', '動画依頼の列設定を確認してください');
      const editorMemberIds = input.editorDiscordIds ? [] : [...new Set(input.editorMemberIds)];
      const editorDiscordIds = input.editorDiscordIds
        ? [...new Set(input.editorDiscordIds)]
        : await getEditorsInTransaction(tx, input.teamId, editorMemberIds);
      tx.set(taskRef, {
        title: `動画依頼: ${input.title.trim()}`,
        columnId: pendingColumnId,
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
      if (config.createThumbnailTask)
        tx.set(thumbnailTask, {
          thumbnailRequestId: videoRequestRef.id,
          title: `サムネイル制作: ${input.title.trim()}`,
          columnId: pendingColumnId,
          dueDate: parseDate(input.finalPackageDueAt),
          createdBy: ctx.uid,
          createdAt: now,
          updatedAt: now,
        });
      tx.set(videoRequestRef, {
        thumbnailTaskId: config.createThumbnailTask ? thumbnailTask.id : null,
        thumbnailStatus: config.createThumbnailTask ? 'pending_discord' : null,
        teamId: input.teamId,
        title: input.title.trim(),
        editorMemberIds,
        editorDiscordIds,
        videoType: input.videoType === 'short' ? 'short' : 'long',
        summary: input.summary.trim(),
        projectManagementUrl: input.projectManagementUrl || null,
        notes: input.notes || null,
        titleIdea: input.titleIdea || null,
        startAt: parseDate(input.startAt),
        firstDraftDueAt: parseDate(input.firstDraftDueAt),
        finalPackageDueAt: parseDate(input.finalPackageDueAt),
        ownerResourceUrls: [],
        deliveryUrls: [],
        status: 'pending_discord',
        taskId: taskRef.id,
        progressTaskColumnId: progressColumnId,
        taskColumnId: pendingColumnId,
        reviewTaskColumnId: reviewColumnId,
        discord: {
          // queued は重複作成対策済みの新Bot専用。旧Botの pending 監視から分離する。
          status: 'queued',
          editorThreadIds: [],
          editorThreadUrls: [],
          thumbnailThreadId: null,
          thumbnailThreadUrl: null,
          error: null,
        },
        createdBy: ctx.uid,
        createdAt: now,
        updatedAt: now,
      });
    });
    return { videoRequestId: videoRequestRef.id, taskId: taskRef.id };
  }
);

export const updateVideoRequest = onCall(
  { region: REGION },
  async (request: CallableRequest<UpdateVideoRequestData>) => {
    const input = request.data;
    if (!input.videoRequestId)
      throw new HttpsError('invalid-argument', '動画依頼が指定されていません');
    validateInput(input);
    const ctx = await getAuthContext(request, input.teamId);
    requireOwnerOrEditor(ctx);
    const requestRef = db.doc(`teams/${input.teamId}/videoRequests/${input.videoRequestId}`);
    const now = FieldValue.serverTimestamp();
    await db.runTransaction(async (tx) => {
      const current = await tx.get(requestRef);
      if (!current.exists) throw new HttpsError('not-found', '動画依頼が見つかりません');
      const editorMemberIds = input.editorDiscordIds ? [] : [...new Set(input.editorMemberIds)];
      const editorDiscordIds = input.editorDiscordIds
        ? [...new Set(input.editorDiscordIds)]
        : await getEditorsInTransaction(tx, input.teamId, editorMemberIds);
      const currentData = current.data()!;
      const discord = currentData.discord as { status?: string } | undefined;
      const next = {
        title: input.title.trim(),
        editorMemberIds,
        editorDiscordIds,
        videoType: input.videoType === 'short' ? 'short' : 'long',
        summary: input.summary.trim(),
        projectManagementUrl: input.projectManagementUrl!.trim(),
        notes: input.notes || null,
        titleIdea: input.titleIdea!.trim(),
        startAt: parseDate(input.startAt),
        firstDraftDueAt: parseDate(input.firstDraftDueAt),
        finalPackageDueAt: parseDate(input.finalPackageDueAt),
        updatedAt: now,
      };
      const changes: DiscordUpdateItem[] = [];
      const addChange = (target: DiscordUpdateTarget, label: string, value: string) =>
        changes.push({ target, label, value });
      if (currentData.title !== next.title) addChange('both', 'タイトル', next.title);
      if (
        !sameStringArray(currentData.editorDiscordIds ?? [], next.editorDiscordIds) ||
        (next.editorMemberIds.length > 0 &&
          !sameStringArray(currentData.editorMemberIds, next.editorMemberIds))
      ) {
        addChange(
          'editor',
          '担当編集者',
          next.editorDiscordIds.length
            ? next.editorDiscordIds.map((id) => `<@${id}>`).join(' ')
            : '担当編集者を変更しました'
        );
      }
      if (currentData.videoType !== next.videoType)
        addChange('editor', '動画の種類', next.videoType === 'short' ? 'ショート動画' : '横動画');
      if (currentData.summary !== next.summary) addChange('editor', '編集内容', next.summary);
      if (currentData.projectManagementUrl !== next.projectManagementUrl)
        addChange('editor', 'プロマネ', next.projectManagementUrl);
      if (currentData.notes !== next.notes)
        addChange('editor', '共有事項', next.notes ?? '（なし）');
      if (currentData.titleIdea !== next.titleIdea)
        addChange('thumbnail', 'タイトル案（仮）', next.titleIdea);
      if (!sameDate(currentData.startAt, next.startAt))
        addChange('editor', '編集開始日', dateLabel(next.startAt));
      if (!sameDate(currentData.firstDraftDueAt, next.firstDraftDueAt))
        addChange('editor', '初稿納期', dateLabel(next.firstDraftDueAt));
      if (!sameDate(currentData.finalPackageDueAt, next.finalPackageDueAt))
        addChange('both', '完パケ納期', dateLabel(next.finalPackageDueAt));
      tx.update(requestRef, next);
      if (currentData.thumbnailTaskId) {
        tx.update(db.doc(`teams/${input.teamId}/tasks/${currentData.thumbnailTaskId}`), {
          title: `サムネイル制作: ${next.title}`,
          dueDate: next.finalPackageDueAt,
          updatedAt: now,
        });
      }
      if (currentData.taskId) {
        const taskUpdate: Record<string, unknown> = {
          title: `動画依頼: ${next.title}`,
          description: next.summary,
          dueDate: next.finalPackageDueAt,
          updatedAt: now,
        };
        tx.update(db.doc(`teams/${input.teamId}/tasks/${currentData.taskId}`), taskUpdate);
      }
      if (discord?.status === 'created' && changes.length > 0) {
        tx.set(requestRef.collection('discordEvents').doc(), {
          type: 'request_updated',
          // 旧Botの pending 監視とは分離し、差分通知対応Botだけが処理する。
          status: 'queued',
          changes,
          createdBy: ctx.uid,
          createdAt: now,
          updatedAt: now,
        });
      } else if (discord?.status === 'failed') {
        tx.update(requestRef, {
          'discord.status': 'pending',
          'discord.error': null,
          updatedAt: now,
        });
      }
    });
  }
);

export const reviewThumbnail = onCall(
  { region: REGION },
  async (
    request: CallableRequest<{
      teamId: string;
      videoRequestId: string;
      action: 'revise' | 'approve';
      message?: string;
    }>
  ) => {
    const { teamId, videoRequestId, action } = request.data;
    requireOwnerOrEditor(await getAuthContext(request, teamId));
    const message = request.data.message?.trim();
    if (action !== 'approve' && (action !== 'revise' || !message || message.length > 1500))
      throw new HttpsError('invalid-argument', '修正内容を入力してください');
    const ref = db.doc(`teams/${teamId}/videoRequests/${videoRequestId}`);
    const now = FieldValue.serverTimestamp();
    await db.runTransaction(async (tx) => {
      const data = (await tx.get(ref)).data();
      if (
        !data?.thumbnailTaskId ||
        (data.thumbnailStatus !== 'review_requested' &&
          !(action === 'approve' && data.thumbnailStatus === 'in_progress'))
      ) {
        throw new HttpsError('failed-precondition', '現在のサムネの状態ではこの操作はできません');
      }
      const columnId =
        action === 'approve'
          ? await findDoneTaskStatusId(teamId)
          : await getProgressColumnId(teamId, data);
      if (!columnId) throw new HttpsError('failed-precondition', '移動先の列を設定してください');
      tx.update(ref, {
        thumbnailStatus: action === 'approve' ? 'completed' : 'in_progress',
        updatedAt: now,
      });
      tx.update(db.doc(`teams/${teamId}/tasks/${data.thumbnailTaskId}`), {
        columnId,
        updatedAt: now,
      });
      tx.set(ref.collection('discordEvents').doc(), {
        type: action === 'approve' ? 'thumbnail_approved' : 'thumbnail_revision',
        message: message ?? '',
        status: 'queued',
        createdBy: request.auth!.uid,
        createdAt: now,
        updatedAt: now,
      });
    });
  }
);

export const requestVideoRevision = onCall(
  { region: REGION },
  async (request: CallableRequest<{ teamId: string; videoRequestId: string; message: string }>) => {
    const { teamId, videoRequestId, message } = request.data;
    if (!teamId || !videoRequestId || !message?.trim())
      throw new HttpsError('invalid-argument', '必須項目が不足しています');
    const ctx = await getAuthContext(request, teamId);
    requireOwnerOrEditor(ctx);
    const ref = db.doc(`teams/${teamId}/videoRequests/${videoRequestId}`);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError('not-found', '動画依頼が見つかりません');
    const progressColumnId = await getProgressColumnId(teamId, snap.data()!);
    const event = ref.collection('discordEvents').doc();
    const now = FieldValue.serverTimestamp();
    await db.runTransaction(async (tx) => {
      tx.update(ref, { status: 'in_progress', updatedAt: now });
      const taskId = snap.data()!.taskId as string | undefined;
      if (taskId && progressColumnId) {
        tx.update(db.doc(`teams/${teamId}/tasks/${taskId}`), {
          columnId: progressColumnId,
          updatedAt: now,
        });
      }
      tx.set(event, {
        type: 'revision_requested',
        message: message.trim(),
        status: 'queued',
        createdBy: ctx.uid,
        createdAt: now,
        updatedAt: now,
      });
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
    const doneColumnId = await findDoneTaskStatusId(teamId);
    if (!doneColumnId)
      throw new HttpsError('failed-precondition', '完了のタスク状態が見つかりません');
    const event = ref.collection('discordEvents').doc();
    const now = FieldValue.serverTimestamp();
    await db.runTransaction(async (tx) => {
      tx.update(ref, { status: 'completed', updatedAt: now });
      if (taskId) {
        tx.update(db.doc(`teams/${teamId}/tasks/${taskId}`), {
          columnId: doneColumnId,
          updatedAt: now,
        });
      }
      tx.set(event, {
        type: 'approved',
        status: 'queued',
        createdBy: ctx.uid,
        createdAt: now,
        updatedAt: now,
      });
    });
  }
);

/** オーナーがプロジェクトファイル・素材などの共有URLを追加する。納品状態は変更しない。 */
export const addVideoOwnerResourceUrl = onCall(
  { region: REGION },
  async (request: CallableRequest<{ teamId: string; videoRequestId: string; url: string }>) => {
    const { teamId, videoRequestId, url } = request.data;
    if (!teamId || !videoRequestId || !url?.trim()) {
      throw new HttpsError('invalid-argument', '共有資料のURLを入力してください');
    }
    let deliveryUrl: URL;
    try {
      deliveryUrl = new URL(url.trim());
      if (!['http:', 'https:'].includes(deliveryUrl.protocol)) throw new Error('protocol');
    } catch {
      throw new HttpsError(
        'invalid-argument',
        '共有資料のURLは http:// または https:// で入力してください'
      );
    }
    const ctx = await getAuthContext(request, teamId);
    requireOperator(ctx);
    const ref = db.doc(`teams/${teamId}/videoRequests/${videoRequestId}`);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError('not-found', '動画依頼が見つかりません');
    const now = FieldValue.serverTimestamp();
    await db.runTransaction(async (tx) => {
      tx.update(ref, {
        ownerResourceUrls: FieldValue.arrayUnion(deliveryUrl.toString()),
        updatedAt: now,
      });
    });
  }
);
