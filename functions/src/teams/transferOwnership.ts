import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { db, getAuthContext, requireOwner } from '../lib/validateAuth';

interface TransferOwnershipData {
  teamId: string;
  newOwnerId: string;
}

export const transferOwnership = onCall(
  { region: 'asia-northeast1' },
  async (request: CallableRequest<TransferOwnershipData>) => {
    const { teamId, newOwnerId } = request.data;

    if (!teamId || !newOwnerId) {
      throw new HttpsError('invalid-argument', 'teamId と newOwnerId が必要です');
    }

    const ctx = await getAuthContext(request, teamId);
    requireOwner(ctx);

    if (ctx.uid === newOwnerId) {
      throw new HttpsError('invalid-argument', '自分自身には移譲できません');
    }

    return await db.runTransaction(async (tx) => {
      const newOwnerSnap = await tx.get(db.doc(`teams/${teamId}/members/${newOwnerId}`));
      if (!newOwnerSnap.exists) {
        throw new HttpsError('not-found', '移譲先のメンバーが見つかりません');
      }

      const now = FieldValue.serverTimestamp();

      tx.update(db.doc(`teams/${teamId}/members/${newOwnerId}`), { role: 'owner' });
      tx.update(db.doc(`teams/${teamId}/members/${ctx.uid}`), { role: 'editor' });
      tx.update(db.doc(`teams/${teamId}`), { ownerId: newOwnerId });

      for (const recipientId of [ctx.uid, newOwnerId]) {
        const notifRef = db.collection(`teams/${teamId}/notifications`).doc();
        tx.set(notifRef, {
          recipientId,
          category: 'system',
          type: 'ownership_transferred',
          title: '所有権の移譲',
          body:
            recipientId === newOwnerId
              ? 'あなたがチームのOwnerになりました'
              : '所有権を移譲しました。あなたのロールはEditorになりました',
          refType: 'team',
          refId: teamId,
          isRead: false,
          createdAt: now,
        });
      }

      return { success: true };
    });
  }
);
