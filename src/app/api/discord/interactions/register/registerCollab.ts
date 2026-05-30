import { getAdminFirestore } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { CollabProposal } from '@/lib/ai/parseProposal';

/**
 * Discord Bot 経由のコラボ調整登録。
 * Admin SDK で Firestore に直接書き込む（Security Rules をバイパス）。
 */
export async function registerCollab(
  teamId: string,
  risukeruUserId: string,
  proposal: CollabProposal
): Promise<string> {
  const db = getAdminFirestore();

  // 有効期限: 提案日から30日後
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const collabRef = db.collection(`teams/${teamId}/collabSessions`).doc();
  const now = FieldValue.serverTimestamp();

  await collabRef.set({
    title: proposal.title,
    partnerName: proposal.partnerName,
    createdBy: risukeruUserId,
    teamId,
    proposedDates: proposal.proposedDates.map((d) => new Date(d)),
    responses: null,
    expiresAt,
    status: 'open',
    confirmedDate: null,
    linkedScheduleId: null,
    createdAt: now,
  });

  return collabRef.id;
}
