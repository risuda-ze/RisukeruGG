import { defineSecret } from 'firebase-functions/params';

/**
 * Discord Bot トークン（Secret Manager 管理）。
 * Bot API 送信（sendBotChannelMessage）を行う関数は options の `secrets` に
 * これを指定して実行環境へ DISCORD_BOT_TOKEN を注入すること。
 * 未指定だと process.env.DISCORD_BOT_TOKEN が空になり、Bot 通知は黙ってスキップされる。
 */
export const discordBotToken = defineSecret('DISCORD_BOT_TOKEN');
