import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { db } from '../lib/admin';

interface RespondToCollabData {
  teamId: string;
  sessionId: string;
  dates: Record<string, 'ok' | 'ng'>;
  alternativeDates?: string[];
  note?: string | null;
}

export const respondToCollab = onCall(
  { region: 'asia-northeast1' },
  async (request: CallableRequest<RespondToCollabData>) => {
    const { teamId, sessionId, dates, alternativeDates, note } = request.data;

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

    await db.runTransaction(async (tx) => {
      tx.update(sessionRef, {
        responses: {
          dates,
          alternativeDates: (alternativeDates ?? []).map((d) => new Date(d)),
          respondedAt: now,
          note: note ?? null,
        },
      });

      // チームのOwner/Editorへ通知
      const membersSnap = await db.collection(`teams/${teamId}/members`).get();
      for (const memberDoc of membersSnap.docs) {
        const member = memberDoc.data();
        if (member.role === 'owner' || member.role === 'editor') {
          const notifRef = db.collection(`teams/${teamId}/notifications`).doc();
          tx.set(notifRef, {
            recipientId: memberDoc.id,
            category: 'collab',
            type: 'collab_responded',
            title: 'コラボ日程の回答が届きました',
            body: `「${session.title}」への回答が届きました`,
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
