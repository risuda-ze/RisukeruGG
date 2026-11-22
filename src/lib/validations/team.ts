import { z } from 'zod';
import { MEMBER_DUTIES, MEMBER_NOTE_MAX } from '@/types/entities';

export const joinTeamSchema = z.object({
  teamCode: z.string().min(1).max(20),
});

export const createTeamSchema = z.object({
  name: z.string().min(1).max(50),
});

export type JoinTeamInput = z.infer<typeof joinTeamSchema>;
export type CreateTeamInput = z.infer<typeof createTeamSchema>;

/**
 * Discord ユーザー名（2023 年以降の新形式）の正規化。
 * 先頭の `@` と前後空白を取り除き、小文字に揃える。空文字は null（未設定）として扱う。
 */
export function normalizeDiscordUsername(raw: string): string | null {
  const trimmed = raw.trim().replace(/^@/, '').toLowerCase();
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Discord ユーザー名の形式チェック。
 * 2〜32 文字、英小文字・数字・`_`・`.` のみ、`.` の連続は不可（Discord の仕様に準拠）。
 */
export const discordUsernameSchema = z
  .string()
  .min(2, 'Discord ユーザー名は2文字以上で入力してください')
  .max(32, 'Discord ユーザー名は32文字以内で入力してください')
  .regex(/^[a-z0-9_.]+$/, '英小文字・数字・_・. のみ使用できます')
  .refine((v) => !v.includes('..'), '「.」を連続して使うことはできません');

/** 担当分野・ひとこと（TE-014）。ひとこと空文字は null（未設定）に正規化する */
export const memberProfileSchema = z.object({
  duties: z
    .array(z.enum(MEMBER_DUTIES))
    .refine((v) => new Set(v).size === v.length, '担当分野が重複しています'),
  note: z
    .string()
    .trim()
    .max(MEMBER_NOTE_MAX, `ひとことは${MEMBER_NOTE_MAX}文字以内で入力してください`)
    .refine((v) => !/[\r\n]/.test(v), 'ひとことに改行は使えません')
    .transform((v) => (v === '' ? null : v))
    .nullable(),
});
