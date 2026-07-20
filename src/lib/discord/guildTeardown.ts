const DISCORD_API = 'https://discord.com/api/v10';

/**
 * 指定サーバーに登録済みのギルドコマンドを全削除する（空配列で PUT 上書き）。
 * registerGuildCommands の対（登録解除）。
 *
 * 登録解除フローで使用。失敗はログのみで呼び出し元を失敗させない（best-effort）。
 * Bot 退出より先に呼ぶこと（退出後はコマンド管理権限を失うため）。
 */
export async function deleteGuildCommands(guildId: string): Promise<void> {
  const appId = process.env.DISCORD_APPLICATION_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!appId || !botToken) {
    console.warn(
      'DISCORD_APPLICATION_ID または DISCORD_BOT_TOKEN が未設定のためコマンド削除をスキップします'
    );
    return;
  }

  try {
    const res = await fetch(
      `${DISCORD_API}/applications/${appId}/guilds/${guildId}/commands`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bot ${botToken}`,
        },
        body: JSON.stringify([]),
      }
    );
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`Discord ギルドコマンド削除失敗 (${res.status}):`, body);
    }
  } catch (err) {
    console.error('Discord ギルドコマンド削除中に例外が発生しました:', err);
  }
}

/**
 * Bot を指定サーバーから退出させる（DELETE /users/@me/guilds/{guildId}）。
 *
 * 登録解除フローで使用。失敗はログのみで呼び出し元を失敗させない（best-effort）。
 * 既に Bot が手動でサーバーから削除されている場合は 404 等になるが、その場合も無視する。
 */
export async function leaveGuild(guildId: string): Promise<void> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    console.warn('DISCORD_BOT_TOKEN が未設定のため Bot 退出をスキップします');
    return;
  }

  try {
    const res = await fetch(`${DISCORD_API}/users/@me/guilds/${guildId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bot ${botToken}` },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`Discord Bot 退出失敗 (${res.status}):`, body);
    }
  } catch (err) {
    console.error('Discord Bot 退出中に例外が発生しました:', err);
  }
}
