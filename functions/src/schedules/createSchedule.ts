import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { db, getAuthContext } from '../lib/validateAuth';

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

    return { scheduleId: scheduleRef.id };
  }
);
