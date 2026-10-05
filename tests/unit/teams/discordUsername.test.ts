import { describe, expect, it } from 'vitest';
import { discordUsernameSchema, normalizeDiscordUsername } from '@/lib/validations/team';

/**
 * Discord ユーザー名の正規化と形式チェック（TE-012）。
 */
describe('normalizeDiscordUsername', () => {
  it('先頭の @ と前後空白を除き小文字にする', () => {
    expect(normalizeDiscordUsername(' @Risu_GG ')).toBe('risu_gg');
  });

  it('空文字・@ のみは null（未設定）', () => {
    expect(normalizeDiscordUsername('')).toBeNull();
    expect(normalizeDiscordUsername('  @ ')).toBeNull();
  });
});

describe('discordUsernameSchema', () => {
  it('英小文字・数字・_・. の 2〜32 文字を許可する', () => {
    expect(discordUsernameSchema.safeParse('risu.gg_01').success).toBe(true);
    expect(discordUsernameSchema.safeParse('ab').success).toBe(true);
    expect(discordUsernameSchema.safeParse('a'.repeat(32)).success).toBe(true);
  });

  it('長さ・文字種・連続ドットを拒否する', () => {
    expect(discordUsernameSchema.safeParse('a').success).toBe(false);
    expect(discordUsernameSchema.safeParse('a'.repeat(33)).success).toBe(false);
    expect(discordUsernameSchema.safeParse('Risu').success).toBe(false);
    expect(discordUsernameSchema.safeParse('risu gg').success).toBe(false);
    expect(discordUsernameSchema.safeParse('risu..gg').success).toBe(false);
  });
});
