import { onDocumentCreated, onDocumentUpdated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions/v2';
import { discordBotToken } from '../discord/botToken';
import {
  ensureBriefThread,
  loadBriefContext,
  postStepReadyNotification,
  refreshBriefSummary,
  refreshStepMessage,
} from './discordSync';

const REGION = 'asia-northeast1';
const BRIEF_DOCUMENT = 'teams/{teamId}/briefs/{briefId}';
const STEP_DOCUMENT = 'teams/{teamId}/briefs/{briefId}/steps/{stepId}';

/**
 * ブリーフ作成時: スレッドと要約を作り、最初から着手可能な工程の通知を投稿する（IN-023 / IN-024）。
 */
export const onBriefCreatedSyncDiscord = onDocumentCreated(
  { document: BRIEF_DOCUMENT, region: REGION, secrets: [discordBotToken] },
  async (event) => {
    const { teamId, briefId } = event.params;
    try {
      const ctx = await loadBriefContext(teamId, briefId);
      if (!ctx) return;
      const threadId = await ensureBriefThread(teamId, briefId, ctx);
      if (!threadId) return;
      // ensureBriefThread が discord を書いたので、以降の投稿のために文脈を更新する
      ctx.briefData.discord = { threadId };
      for (const step of ctx.steps.filter((s) => s.status === 'ready')) {
        await postStepReadyNotification(teamId, briefId, step.id, ctx);
      }
    } catch (err) {
      logger.warn('ブリーフ作成時の Discord 同期に失敗しました', { teamId, briefId, err });
    }
  }
);

/**
 * ブリーフ更新時: タイトル・公開予定日・状態が変わったら要約を書き換える。
 * `discord` フィールド自体の更新（スレッド作成）では何もしない。
 */
export const onBriefUpdatedSyncDiscord = onDocumentUpdated(
  { document: BRIEF_DOCUMENT, region: REGION, secrets: [discordBotToken] },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    const changed =
      before.title !== after.title ||
      before.status !== after.status ||
      String(before.publishAt?.toMillis?.() ?? '') !== String(after.publishAt?.toMillis?.() ?? '');
    if (!changed) return;

    const { teamId, briefId } = event.params;
    try {
      const ctx = await loadBriefContext(teamId, briefId);
      if (!ctx) return;
      await refreshBriefSummary(teamId, briefId, ctx);
    } catch (err) {
      logger.warn('ブリーフ更新時の Discord 同期に失敗しました', { teamId, briefId, err });
    }
  }
);

/**
 * 工程の変更時: ready になったら通知、閉じたらボタンを外し、表示に関わる変更なら要約を更新する。
 * `discordMessageId` だけの変更（通知投稿の記録）では何もしない。
 */
export const onStepWrittenSyncDiscord = onDocumentWritten(
  { document: STEP_DOCUMENT, region: REGION, secrets: [discordBotToken] },
  async (event) => {
    const before = event.data?.before.exists ? event.data.before.data() : null;
    const after = event.data?.after.exists ? event.data.after.data() : null;
    const { teamId, briefId, stepId } = event.params;

    const statusChanged = before?.status !== after?.status;
    const visibleChanged =
      statusChanged ||
      before?.title !== after?.title ||
      before?.assigneeId !== after?.assigneeId ||
      String(before?.dueDate?.toMillis?.() ?? '') !== String(after?.dueDate?.toMillis?.() ?? '') ||
      (before === null) !== (after === null);
    if (!visibleChanged) return;

    try {
      const ctx = await loadBriefContext(teamId, briefId);
      if (!ctx) return;
      const link = ctx.briefData.discord as { threadId?: string } | null | undefined;
      if (!link?.threadId) return; // スレッド未作成（連携なし、または作成トリガー側が投稿する）

      if (after && statusChanged) {
        if (after.status === 'ready') {
          await postStepReadyNotification(teamId, briefId, stepId, ctx);
        } else {
          await refreshStepMessage(teamId, briefId, stepId, ctx);
        }
      }
      await refreshBriefSummary(teamId, briefId, ctx);
    } catch (err) {
      logger.warn('工程変更時の Discord 同期に失敗しました', { teamId, briefId, stepId, err });
    }
  }
);
