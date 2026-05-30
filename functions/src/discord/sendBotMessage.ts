import { logger } from 'firebase-functions/v2';
import type { DiscordEmbed } from './sendWebhook';

const DISCORD_API = 'https://discord.com/api/v10';

/**
 * Discord Bot API 経由でチャンネルに Embed メッセージを送信する。
 * channelId が設定されている場合（Sprint 2 以降）に使用する。
 * 送信失敗はログに記録するのみで、呼び出し元の処理を失敗させない。
 */
export async function sendBotChannelMessage(
  channelId: string,
  embed: DiscordEmbed
): Promise<void> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    logger.warn('DISCORD_BOT_TOKEN が設定されていません。Bot 通知をスキップします。');
    return;
  }

  try {
    const response = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${botToken}`,
      },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      logger.warn(`Discord Bot チャンネル送信失敗: HTTP ${response.status}`, { body });
    }
  } catch (err) {
    // ネットワークエラーはログのみ（スケジュール作成・リマインダーを失敗させない）
    logger.warn('Discord Bot チャンネル送信中に例外が発生しました', { err });
  }
}
