import { z } from 'zod';

export const scheduleEntrySchema = z
  .object({
    title: z.string().min(1).max(100),
    type: z.enum(['stream', 'video']),
    startAt: z.date(),
    endAt: z.date(),
    platform: z.enum(['youtube', 'twitch', 'both']).nullable(),
    status: z.enum(['planned', 'live', 'ended', 'cancelled']),
    description: z.string().max(1000).default(''),
    participantIds: z.array(z.string()).default([]),
    collabPartnerName: z.string().max(100).nullable().default(null),
    linkedTaskIds: z.array(z.string()).default([]),
  })
  .refine((data) => data.endAt > data.startAt, {
    message: '終了日時は開始日時より後にしてください',
    path: ['endAt'],
  });

export type ScheduleEntryInput = z.infer<typeof scheduleEntrySchema>;
