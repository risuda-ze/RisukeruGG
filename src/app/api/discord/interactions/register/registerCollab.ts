import { getAdminFirestore } from '@/lib/firebase/admin';
import { DISCORD_ACTOR, createdFields } from '@/lib/firebase/auditAdmin';
import { parseProposalDateTime, type CollabProposal } from '@/lib/ai/parseProposal';

/**
 * Discord Bot 経由のコラボ調整登録。
 * Admin SDK で Firestore に直接書き込む（Security Rules をバイパス）。
 * 個人ユーザーは特定しないため createdBy は 'discord-bot' とする。
 */
export async function registerCollab(
  teamId: string,
  proposal: CollabProposal
): Promise<string> {
  const db = getAdminFirestore();

  // 有効期限: 提案日から30日後
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const collabRef = db.collection(`teams/${teamId}/collabSessions`).doc();

  await collabRef.set({
    title: proposal.title,
    partnerName: proposal.partnerName,
    teamId,
    // タイムゾーン無しの日時は JST として解釈する（UTC サーバーでのずれ防止）
    proposedDates: proposal.proposedDates.map((d) => parseProposalDateTime(d)),
    responses: null,
    expiresAt,
    status: 'open',
    confirmedDate: null,
    linkedScheduleId: null,
    ...createdFields(DISCORD_ACTOR), // 個人ユーザーを追跡しないため固定値
  });

  return collabRef.id;
}
