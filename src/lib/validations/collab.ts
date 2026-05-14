import { z } from 'zod';

export const collabSessionSchema = z.object({
  title: z.string().min(1).max(100),
  partnerName: z.string().min(1).max(100),
  proposedDates: z.array(z.date()).min(1).max(5),
  expiresInDays: z.number().int().min(1).max(30),
});

export const collabResponseSchema = z.object({
  dates: z.record(z.string(), z.enum(['ok', 'ng'])),
  alternativeDates: z.array(z.date()).default([]),
  note: z.string().max(200).nullable().default(null),
});

export type CollabSessionInput = z.infer<typeof collabSessionSchema>;
export type CollabResponseInput = z.infer<typeof collabResponseSchema>;
