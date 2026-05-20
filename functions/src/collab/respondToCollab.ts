import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { db } from '../lib/admin';

interface RespondToCollabData {
  teamId: string;
  sessionId: string;
  respondentName?: string;
  dates: Record<string, 'ok' | 'ng' | 'pending'>;
  alternativeDates?: string[];
  note?: string | null;
}

export const respondToCollab = onCall(
  { region: 'asia-northeast1' },
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

    await db.runTransaction(async (tx) => {
      tx.update(sessionRef, updatePayload);

      /* チームの Owner/Editor へ通知 */
      const membersSnap = await db.collection(`teams/${teamId}/members`).get();
      for (const memberDoc of membersSnap.docs) {
        const member = memberDoc.data();
        if (member.role === 'operator' || member.role === 'member') {
          const notifRef = db.collection(`teams/${teamId}/notifications`).doc();
          tx.set(notifRef, {
            recipientId: memberDoc.id,
            category: 'collab',
            type: 'collab_responded',
            title: 'コラボ日程の回答が届きました',
            body: `「${session.title}」${respondentName ? `（${respondentName}）` : ''}への回答が届きました`,
            refType: 'collab',
            refId: sessionId,
            isRead: false,
            createdAt: now,
          });
        }
      }
    });

    return { success: true };
  }
);
