import { z } from 'zod';

export const joinTeamSchema = z.object({
  teamCode: z.string().min(1).max(20),
});

export const createTeamSchema = z.object({
  name: z.string().min(1).max(50),
});

export type JoinTeamInput = z.infer<typeof joinTeamSchema>;
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
