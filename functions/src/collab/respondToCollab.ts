import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { db } from '../lib/admin';
import { notifyDiscord } from '../discord/notifyDiscord';
import { discordBotToken } from '../discord/botToken';

interface RespondToCollabData {
  teamId: string;
  sessionId: string;
  respondentName?: string;
  dates: Record<string, 'ok' | 'ng' | 'pending'>;
  alternativeDates?: string[];
  note?: string | null;
}

export const respondToCollab = onCall(
  { region: 'asia-northeast1', secrets: [discordBotToken] },
  async (request: CallableRequest<RespondToCollabData>) => {
    const { teamId, sessionId, respondentName, dates, alternativeDates, note } = request.data;

    if (!teamId || !sessionId || !dates) {
      throw new HttpsError('invalid-argument', '必須項目が不足しています');
    }

    const sessionRef = db.doc(`teams/${teamId}/collabSessions/${sessionId}`);
    const sessionSnap = await sessionRef.get();

    if (!sessionSnap.exists) {
      throw new HttpsError('not-found', 'セッションが見つかりません');
    }

    const session = sessionSnap.data()!;

    if (session.status !== 'open') {
      throw new HttpsError('failed-precondition', 'このセッションは受付終了しています');
    }

    const expiresAt = (session.expiresAt as Timestamp).toDate();
    if (expiresAt < new Date()) {
      throw new HttpsError('failed-precondition', 'このセッションは有効期限切れです');
    }

    const now = FieldValue.serverTimestamp();

    /* participantResponses 用のキーを生成（特殊文字をアンダースコアに変換） */
    const respondentKey = (respondentName ?? 'anonymous').replace(/[.#$[\]/]/g, '_');

    /* 'ok' / 'ng' のみを responses.dates に保存（'pending' は除外） */
    const datesForResponse: Record<string, 'ok' | 'ng'> = {};
    for (const [k, v] of Object.entries(dates)) {
      if (v === 'ok' || v === 'ng') datesForResponse[k] = v;
    }

    /* 代替日程を Timestamp に変換 */
    const altTimestamps = (alternativeDates ?? []).map((d) => Timestamp.fromDate(new Date(d)));

    const updatePayload: Record<string, unknown> = {
      responses: {
        dates: datesForResponse,
        alternativeDates: altTimestamps,
        respondedAt: now,
        note: note ?? null,
      },
      /* 回答者ごとの回答を participantResponses に記録 */
      [`participantResponses.${respondentKey}`]: dates,
    };

    /* 代替日程があれば proposedDates に追加 */
    if (altTimestamps.length > 0) {
      updatePayload['proposedDates'] = FieldValue.arrayUnion(...altTimestamps);
    }

    /* メモをコメントとして追記（Timestamp.now() を使用 — serverTimestamp は arrayUnion 内で使用不可） */
    if (note?.trim()) {
      updatePayload['comments'] = FieldValue.arrayUnion({
        id: `resp_${Date.now()}`,
        authorId: respondentKey,
        authorName: respondentName ?? 'anonymous',
        text: note.trim(),
        createdAt: Timestamp.now(),
      });
    }

    await sessionRef.update(updatePayload);

    // Discord 通知（失敗しても回答本体を失敗させない）
    try {
      await notifyDiscord(teamId, 'notifyOnCollabResponse', () => ({
        title: '💬 コラボ調整に回答がありました',
        color: 0x5865f2,
        fields: [
          { name: 'タイトル', value: session.title as string, inline: true },
          ...(respondentName ? [{ name: '回答者', value: respondentName, inline: true }] : []),
        ],
      }));
    } catch (err) {
      logger.warn('コラボ回答 Discord 通知に失敗しました', { teamId, err });
    }

    return { success: true };
  }
);
