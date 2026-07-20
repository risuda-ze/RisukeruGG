import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions/v2';
import { Timestamp } from 'firebase-admin/firestore';
import { db } from '../lib/admin';
import { notifyDiscord } from '../discord/notifyDiscord';
import { discordBotToken } from '../discord/botToken';
import type { DiscordEmbedField } from '../discord/sendWebhook';

const REGION = 'asia-northeast1';
const TASK_DOCUMENT = 'teams/{teamId}/tasks/{taskId}';

/** カラム ID を表示名に解決する（見つからなければ null） */
async function resolveColumnName(
  teamId: string,
  columnId: string | null | undefined
): Promise<string | null> {
  if (!columnId) return null;
  const snap = await db.doc(`teams/${teamId}/taskStatuses/${columnId}`).get();
  return snap.exists ? ((snap.data()!.name as string) ?? null) : null;
}

/** メンバー UID を表示名に解決する（見つからなければ null） */
async function resolveMemberName(
  teamId: string,
  uid: string | null | undefined
): Promise<string | null> {
  if (!uid) return null;
  const snap = await db.doc(`teams/${teamId}/members/${uid}`).get();
  return snap.exists ? ((snap.data()!.displayName as string) ?? null) : null;
}

/** 締切（Firestore Timestamp）を millis に正規化。未設定は null */
function dueMillis(due: unknown): number | null {
  return due instanceof Timestamp ? due.toMillis() : null;
}

/** 締切表示用フォーマット（未設定は「なし」） */
function formatDue(due: unknown): string {
  const ms = dueMillis(due);
  if (ms === null) return 'なし';
  return new Date(ms).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * タスク作成時に Discord へ通知する。
 * Discord Bot 経由の作成（createdBy === 'discord-bot'）は、Bot 自身が
 * チャンネルへ返信するため二重通知になる。その分をスキップする。
 */
export const notifyTaskCreated = onDocumentCreated(
  { document: TASK_DOCUMENT, region: REGION, secrets: [discordBotToken] },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const task = snap.data();
    if (task.createdBy === 'discord-bot') return;

    const { teamId } = event.params;

    try {
      await notifyDiscord(teamId, 'notifyOnTaskCreate', async () => {
        const [columnName, assigneeName] = await Promise.all([
          resolveColumnName(teamId, task.columnId as string),
          resolveMemberName(teamId, task.assigneeId as string),
        ]);

        const fields: DiscordEmbedField[] = [
          { name: 'タイトル', value: (task.title as string) || '(無題)', inline: true },
        ];
        if (columnName) fields.push({ name: 'ステータス', value: columnName, inline: true });
        if (assigneeName) fields.push({ name: '担当', value: assigneeName, inline: true });

        return { title: '📝 タスクが追加されました', color: 0x4ade80, fields };
      });
    } catch (err) {
      logger.warn('タスク作成 Discord 通知に失敗しました', { teamId, err });
    }
  }
);

/**
 * タスク変更時に Discord へ通知する。
 * 主要フィールド（タイトル / ステータス（カラム）/ 担当者 / 締切）が
 * 変化した場合のみ送信する。説明・カテゴリ・コメント等の変更では通知しない。
 */
export const notifyTaskUpdated = onDocumentUpdated(
  { document: TASK_DOCUMENT, region: REGION, secrets: [discordBotToken] },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    // 変化判定は生値で行い、通知しないケースでは追加の Firestore 読み取りを避ける。
    // 名前解決（カラム名・担当者名）は送信確定後に buildEmbed 内で行う。
    const titleChanged = before.title !== after.title;
    const columnChanged = (before.columnId ?? null) !== (after.columnId ?? null);
    const assigneeChanged = (before.assigneeId ?? null) !== (after.assigneeId ?? null);
    const dueChanged = dueMillis(before.dueDate) !== dueMillis(after.dueDate);

    // 主要フィールドに変化が無ければ通知しない（説明・カテゴリ・コメント等の変更）
    if (!titleChanged && !columnChanged && !assigneeChanged && !dueChanged) return;

    const { teamId } = event.params;

    try {
      await notifyDiscord(teamId, 'notifyOnTaskUpdate', async () => {
        const changes: DiscordEmbedField[] = [];

        if (titleChanged) {
          changes.push({
            name: 'タイトル',
            value: `${(before.title as string) || '(無題)'} → ${(after.title as string) || '(無題)'}`,
            inline: false,
          });
        }
        if (columnChanged) {
          const [fromName, toName] = await Promise.all([
            resolveColumnName(teamId, before.columnId as string),
            resolveColumnName(teamId, after.columnId as string),
          ]);
          changes.push({
            name: 'ステータス',
            value: `${fromName ?? '—'} → ${toName ?? '—'}`,
            inline: false,
          });
        }
        if (assigneeChanged) {
          const [fromName, toName] = await Promise.all([
            resolveMemberName(teamId, before.assigneeId as string),
            resolveMemberName(teamId, after.assigneeId as string),
          ]);
          changes.push({
            name: '担当',
            value: `${fromName ?? 'なし'} → ${toName ?? 'なし'}`,
            inline: false,
          });
        }
        if (dueChanged) {
          changes.push({
            name: '締切',
            value: `${formatDue(before.dueDate)} → ${formatDue(after.dueDate)}`,
            inline: false,
          });
        }

        return {
          title: '✏️ タスクが更新されました',
          color: 0xef9f27,
          fields: [
            { name: 'タスク', value: (after.title as string) || '(無題)', inline: false },
            ...changes,
          ],
        };
      });
    } catch (err) {
      logger.warn('タスク更新 Discord 通知に失敗しました', { teamId, err });
    }
  }
);
