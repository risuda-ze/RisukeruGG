import { z } from 'zod';
import { TEAM_INSTRUCTIONS_MAX } from '@/lib/ai/systemPrompt';

/** 定型指示の上限（軽量機能に留める） */
export const AI_PRESETS_MAX = 10;

/** `%%PROPOSAL%%` マーカーは出力フォーマットの偽装に使えるため入力段階で除去する */
export function stripProposalMarkers(text: string): string {
  return text.replace(/%%\/?PROPOSAL%%/g, '');
}

export const aiPresetSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().trim().min(1, '名前は必須です').max(30, '名前は30文字以内で入力してください'),
  body: z
    .string()
    .transform(stripProposalMarkers)
    .pipe(z.string().trim().min(1, '本文は必須です').max(500, '本文は500文字以内で入力してください')),
});

export const teamAiSettingsSchema = z.object({
  teamInstructions: z
    .string()
    .transform(stripProposalMarkers)
    .pipe(z.string().trim().max(TEAM_INSTRUCTIONS_MAX, `追加指示は${TEAM_INSTRUCTIONS_MAX}文字以内で入力してください`)),
  presets: z
    .array(aiPresetSchema)
    .max(AI_PRESETS_MAX, `定型指示は${AI_PRESETS_MAX}件までです`)
    .refine((list) => new Set(list.map((p) => p.id)).size === list.length, { message: '定型指示の ID が重複しています' }),
});

export type TeamAiSettingsInput = z.infer<typeof teamAiSettingsSchema>;
