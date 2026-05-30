import { getAdminFirestore } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { ScheduleProposal } from '@/lib/ai/parseProposal';

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
  const now = FieldValue.serverTimestamp();

  await scheduleRef.set({
    title: proposal.title,
    categoryId: null,
    startAt: new Date(proposal.startAt),
    endAt: new Date(proposal.endAt),
    description: proposal.description ?? '',
    participantIds,
    collabPartnerName: null,
    linkedTaskIds: [],
    allDay: false,
    createdBy: 'discord-bot',  // 個人ユーザーを追跡しないため固定値
    updatedAt: now,
    createdAt: now,
  });

  return scheduleRef.id;
}
