import { db } from '../lib/admin';
import { sendDiscordWebhook, type DiscordEmbed } from './sendWebhook';
import { sendBotChannelMessage } from './sendBotMessage';

/** teams/{teamId}/discord/config の通知トグルキー */
export type DiscordNotifyFlag =
  | 'notifyOnTaskCreate'
  | 'notifyOnTaskUpdate'
  | 'notifyOnCollabCreate'
  | 'notifyOnCollabResponse';

/**
 * チームの Discord 設定を読み、指定トグルが有効なら Embed を送信する。
 *
 * - トグルキーが未設定（旧スキーマ・新規チーム）の場合はデフォルト有効として扱う（opt-out）。
 *   `=== false` の場合のみスキップする。
 * - 送信先は channelId（Bot API）を優先し、なければ webhookUrl にフォールバックする。
 * - 送信失敗は各送信関数内でログのみ。呼び出し元の処理は失敗させない。
 * - Embed は「送信すると確定した後」に生成する（buildEmbed の遅延評価）。これにより
 *   Discord 未連携・通知 OFF のチームでは、Embed 構築に伴う追加の Firestore 読み取り
 *   （担当者名・カラム名の解決など）を一切行わずに早期 return できる。
 */
export async function notifyDiscord(
  teamId: string,
  flag: DiscordNotifyFlag,
  buildEmbed: () => DiscordEmbed | Promise<DiscordEmbed>
): Promise<void> {
  const snap = await db.doc(`teams/${teamId}/discord/config`).get();
  if (!snap.exists) return;

  const config = snap.data()!;
  // channelId（Bot 通知）または webhookUrl（フォールバック）が無ければ送信先なし
  if (!config.channelId && !config.webhookUrl) return;
  // 未設定はデフォルト有効。明示的に false のときだけスキップ。
  if (config[flag] === false) return;

  const embed = await buildEmbed();

  if (config.channelId) {
    await sendBotChannelMessage(config.channelId as string, embed);
  } else if (config.webhookUrl) {
    await sendDiscordWebhook(config.webhookUrl as string, embed);
  }
}
