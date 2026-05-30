import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { db, getAuthContext, requireOperatorOrMember } from '../lib/validateAuth';
import { sendDiscordWebhook } from '../discord/sendWebhook';

interface CreateScheduleData {
  teamId: string;
  title: string;
  categoryId: string | null;
  startAt: string;  // ISO string
  endAt: string;    // ISO string
  description: string;
  participantIds: string[];
  collabPartnerName: string | null;
  linkedTaskIds: string[];
  allDay?: boolean;
}

export const createSchedule = onCall(
  { region: 'asia-northeast1' },
  async (request: CallableRequest<CreateScheduleData>) => {
    const {
      teamId,
      title,
      categoryId,
      startAt,
      endAt,
      description,
      participantIds,
      collabPartnerName,
      linkedTaskIds,
      allDay,
    } = request.data;

    if (!teamId || !title || !startAt || !endAt) {
      throw new HttpsError('invalid-argument', '必須項目が不足しています');
    }

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new HttpsError('invalid-argument', '日時の形式が正しくありません');
    }

    const ctx = await getAuthContext(request, teamId);
    requireOperatorOrMember(ctx);

    const scheduleRef = db.collection(`teams/${teamId}/schedules`).doc();
    const now = FieldValue.serverTimestamp();

    await scheduleRef.set({
      title,
      categoryId: categoryId ?? null,
      startAt: startDate,
      endAt: endDate,
      description: description ?? '',
      participantIds: participantIds ?? [],
      collabPartnerName: collabPartnerName ?? null,
      linkedTaskIds: linkedTaskIds ?? [],
      allDay: allDay ?? false,
      createdBy: ctx.uid,
      updatedAt: now,
      createdAt: now,
    });

    // Discord Webhook 通知（失敗してもスケジュール作成本体を失敗させない）
    const discordConfigSnap = await db.doc(`teams/${teamId}/discord/config`).get();
    if (discordConfigSnap.exists) {
      const discordConfig = discordConfigSnap.data()!;
      if (discordConfig.webhookUrl && discordConfig.notifyOnCreate) {
        const startDate2 = new Date(startAt);
        const endDate2 = new Date(endAt);
        const dateStr = `${startDate2.toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          weekday: 'short',
        })} ${startDate2.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}〜${endDate2.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`;

        await sendDiscordWebhook(discordConfig.webhookUrl as string, {
          title: '📅 スケジュールが追加されました',
          color: 0x5865f2,
          fields: [
            { name: 'タイトル', value: title, inline: true },
            { name: '日時', value: dateStr, inline: true },
            ...(participantIds.length > 0
              ? [{ name: '参加者', value: `${participantIds.length}名`, inline: true }]
              : []),
          ],
        });
      }
    }

    return { scheduleId: scheduleRef.id };
  }
);
