import { logger } from 'firebase-functions/v2';

/** Discord Embed フィールド */
export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

/** Discord Embed オブジェクト（最小限の型定義） */
export interface DiscordEmbed {
  title: string;
  color: number;
  fields: DiscordEmbedField[];
  footer?: { text: string };
}

/**
 * Discord Webhook URL に Embed メッセージを送信する。
 * 送信失敗はログに記録するのみで、呼び出し元の処理を失敗させない。
 */
export async function sendDiscordWebhook(
  webhookUrl: string,
  embed: DiscordEmbed
): Promise<void> {
  // Webhook URL の簡易バリデーション
  if (!webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
    logger.warn('Discord Webhook URL が正しい形式ではありません', { webhookUrl });
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      logger.warn(`Discord Webhook 送信失敗: HTTP ${response.status}`, { body });
    }
  } catch (err) {
    // ネットワークエラーはログのみ（スケジュール作成・リマインダーを失敗させない）
    logger.warn('Discord Webhook 送信中に例外が発生しました', { err });
  }
}
