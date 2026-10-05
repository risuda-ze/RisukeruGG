/**
 * Discord メンションの純粋関数群（I/O なし。ユニットテスト対象）。
 *
 * メンションは `<@ユーザーID>` 形式でなければ通知が飛ばないため、
 * ユーザー名から ID への解決結果を使って本文を組み立てる。
 */

/** Discord の Search Guild Members API が返すメンバー要素のうち、解決に必要な最小限 */
export interface GuildMemberSearchResult {
  user?: { id: string; username: string };
}

/**
 * サーバー内検索の結果から、ユーザー名が完全一致するメンバーの ID を返す。
 * 検索 API は前方一致で複数返すため、ここで厳密に絞り込む。
 * 大文字小文字は区別しない（保存時に小文字へ正規化しているため）。
 */
export function pickExactUsernameMatch(
  results: GuildMemberSearchResult[],
  username: string
): string | null {
  const target = username.trim().toLowerCase();
  if (!target) return null;
  const hit = results.find((r) => r.user?.username.toLowerCase() === target);
  return hit?.user?.id ?? null;
}

/** ユーザー ID から Discord のメンション記法を生成する */
export function formatUserMention(discordUserId: string): string {
  return `<@${discordUserId}>`;
}

/**
 * メンション本文を組み立てる。ID が解決できていればメンション、なければ表示名の文字列。
 * 未解決時に付ける案内文は呼び出し側で制御する（毎回は付けない）。
 */
export function formatMemberMention(
  member: { displayName: string; discordUserId: string | null }
): string {
  return member.discordUserId ? formatUserMention(member.discordUserId) : member.displayName;
}
