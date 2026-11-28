import { getAdminFirestore } from '@/lib/firebase/admin';
import { DISCORD_ACTOR, createdFields } from '@/lib/firebase/auditAdmin';
import { parseProposalDateTime, type ScheduleProposal } from '@/lib/ai/parseProposal';

/**
 * Discord Bot 経由のスケジュール登録。
 * Admin SDK で Firestore に直接書き込む（Security Rules をバイパス）。
 * 個人ユーザーは特定しないため createdBy は 'discord-bot' とする。
 */
export async function registerSchedule(
  teamId: string,
  proposal: ScheduleProposal,
  members: Array<{ userId: string; displayName: string }>
): Promise<string> {
  const db = getAdminFirestore();

  // participantNames を userId に解決する
  const participantIds = (proposal.participantNames ?? [])
    .map((name) => members.find((m) => m.displayName === name)?.userId)
    .filter((id): id is string => id !== undefined);

  const scheduleRef = db.collection(`teams/${teamId}/schedules`).doc();

  await scheduleRef.set({
    title: proposal.title,
    categoryId: null,
    // タイムゾーン無しの日時は JST として解釈する（UTC サーバーでのずれ防止）
    startAt: parseProposalDateTime(proposal.startAt),
    endAt: parseProposalDateTime(proposal.endAt),
    description: proposal.description ?? '',
    participantIds,
    collabPartnerName: null,
    linkedTaskIds: [],
    allDay: proposal.allDay ?? false,
    ...createdFields(DISCORD_ACTOR), // 個人ユーザーを追跡しないため固定値
  });

  return scheduleRef.id;
}
