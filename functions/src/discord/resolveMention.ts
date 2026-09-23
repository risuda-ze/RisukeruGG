import { logger } from 'firebase-functions/v2';
import { db } from '../lib/admin';
import {
  formatMemberMention,
  pickExactUsernameMatch,
  type GuildMemberSearchResult,
} from './mentionFormat';

const DISCORD_API = 'https://discord.com/api/v10';

/** メンション解決に必要なメンバー情報（`teams/{teamId}/members/{uid}` の一部） */
export interface MentionableMember {
  userId: string;
  displayName: string;
  discordUsername: string | null;
  discordUserId: string | null;
}

/**
 * Discord の Search Guild Members API でユーザー名からユーザー ID を引く。
 * 特権 Intent（GUILD_MEMBERS）は不要。見つからない・失敗時は null。
 */
export async function searchGuildMemberId(
  guildId: string,
  username: string
): Promise<string | null> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    logger.warn('DISCORD_BOT_TOKEN が設定されていません。メンション解決をスキップします。');
    return null;
  }

  try {
    const params = new URLSearchParams({ query: username, limit: '10' });
    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/members/search?${params}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      logger.warn(`Discord メンバー検索失敗: HTTP ${res.status}`, { body });
      return null;
    }
    const results = (await res.json()) as GuildMemberSearchResult[];
    return pickExactUsernameMatch(results, username);
  } catch (err) {
    logger.warn('Discord メンバー検索中に例外が発生しました', { err });
    return null;
  }
}

/**
 * メンバーのメンション文字列を返す（TE-012 / IN-015）。
 *
 * 1. `discordUserId` がキャッシュ済みならそれを使う
 * 2. なければ `discordUsername` でサーバー内検索し、見つかれば `discordUserId` をメンバー doc にキャッシュ
 * 3. 解決できなければ表示名の文字列を返す（通知は飛ばないが本文は成立する）
 */
export async function resolveMemberMention(
  teamId: string,
  guildId: string,
  member: MentionableMember
): Promise<string> {
  if (member.discordUserId) return formatMemberMention(member);
  if (!member.discordUsername) return member.displayName;

  const resolvedId = await searchGuildMemberId(guildId, member.discordUsername);
  if (!resolvedId) return member.displayName;

  // 次回以降の検索を省くためキャッシュする。失敗しても本文生成は続行する
  try {
    await db.doc(`teams/${teamId}/members/${member.userId}`).update({ discordUserId: resolvedId });
  } catch (err) {
    logger.warn('discordUserId のキャッシュ保存に失敗しました', { teamId, userId: member.userId, err });
  }

  return formatMemberMention({ displayName: member.displayName, discordUserId: resolvedId });
}
