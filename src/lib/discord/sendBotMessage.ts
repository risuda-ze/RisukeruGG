const DISCORD_API = 'https://discord.com/api/v10';

interface DiscordEmbed {
  title: string;
  color: number;
  fields: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: { text: string };
}

/**
 * Discord Bot API 経由でチャンネルに Embed メッセージを送信する（Next.js APIルート用）。
 * Bot token は DISCORD_BOT_TOKEN 環境変数から取得する。
 * 送信失敗はエラーをログ記録するのみで呼び出し元を失敗させない。
 */
export async function sendBotChannelMessage(
  channelId: string,
  embed: DiscordEmbed
): Promise<void> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    console.warn('DISCORD_BOT_TOKEN が設定されていません。Bot 通知をスキップします。');
    return;
  }

  try {
    const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${botToken}`,
      },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`Discord Bot チャンネル送信失敗 (${res.status}):`, body);
    }
  } catch (err) {
    console.error('Discord Bot チャンネル送信中に例外が発生しました:', err);
  }
}

/**
 * Discord Bot API で指定サーバーのテキストチャンネル一覧を取得する。
 * GUILD_TEXT (type 0) のチャンネルのみ返す。
 */
export async function fetchGuildTextChannels(
  guildId: string
): Promise<Array<{ id: string; name: string }>> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    throw new Error('DISCORD_BOT_TOKEN が設定されていません');
  }

  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
    headers: { Authorization: `Bot ${botToken}` },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Discord チャンネル一覧取得失敗 (${res.status}): ${body}`);
  }

  const channels = (await res.json()) as Array<{ id: string; name: string; type: number }>;
  // GUILD_TEXT (type: 0) のみ返す
  return channels
    .filter((c) => c.type === 0)
    .map((c) => ({ id: c.id, name: c.name }));
}
