import 'dotenv/config';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { handleRisukeruVideoRequestInteraction, startRisukeruVideoRequestSync } from './sync.js';

for (const key of ['DISCORD_TOKEN', 'GUILD_ID', 'RISUKERU_TEAM_ID']) {
  if (!process.env[key]) throw new Error(`${key} を設定してください`);
}
const ids = (value) =>
  (value || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});
const config = {
  client,
  guildId: process.env.GUILD_ID,
  targetChannelId: process.env.TARGET_CHANNEL_ID,
  fallbackSourceChannelId: process.env.SOURCE_CHANNEL_ID,
  editorChannelMap: JSON.parse(process.env.EDITOR_CHANNEL_MAP || '{}'),
  archiveDuration: Number(process.env.THREAD_AUTO_ARCHIVE_DURATION || 10080),
  thumbnailMentionIdsLong: ids(
    process.env.THUMBNAIL_MENTION_IDS_LONG || process.env.THUMBNAIL_MENTION_IDS
  ),
  thumbnailMentionIdsShort: ids(process.env.THUMBNAIL_MENTION_IDS_SHORT),
};
let db;
client.once(Events.ClientReady, () => {
  db = startRisukeruVideoRequestSync(config);
  if (!db) {
    client.destroy();
    throw new Error('動画依頼用のFirestore接続を設定してください');
  }
});
client.on(Events.InteractionCreate, async (interaction) => {
  if (!db || interaction.guildId !== config.guildId) return;
  try {
    await handleRisukeruVideoRequestInteraction(interaction, db, config);
  } catch (error) {
    console.error('動画依頼操作に失敗しました', error);
    const content = '操作に失敗しました。依頼の状態と入力を確認してください。';
    if (interaction.deferred) await interaction.editReply(content);
    else if (!interaction.replied) await interaction.reply({ content, ephemeral: true });
  }
});
await client.login(process.env.DISCORD_TOKEN);
