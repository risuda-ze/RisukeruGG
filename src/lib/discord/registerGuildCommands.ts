const DISCORD_API = 'https://discord.com/api/v10';

/**
 * /risukerugg コマンド定義。
 * - message: AI へのメッセージ（任意。preset だけでも送れる）
 * - preset: チームの定型指示（AI 設定）。オートコンプリートで候補を出す（AI-023 / IN-030）
 * Discord の制約で必須オプションは任意オプションより前に置く必要があるが、両方任意なので順序は自由。
 */
const RISUKERUGG_COMMAND = {
  name: 'risukerugg',
  description: 'RisukeruGG AI アシスタントに話しかける',
  options: [
    { name: 'message', description: 'AIへのメッセージ', type: 3, required: false },
    { name: 'preset', description: '定型指示（AI設定で登録したもの）', type: 3, required: false, autocomplete: true },
  ],
};

/**
 * 指定した Discord サーバー（guild）に /risukerugg ギルドコマンドを登録する。
 * HTTP 自己呼び出しを排除するため、API ルートではなく共有ユーティリティとして実装する。
 * 失敗時は例外を投げる（呼び出し元でエラーハンドリングすること）。
 */
export async function registerGuildCommands(guildId: string): Promise<void> {
  const appId = process.env.DISCORD_APPLICATION_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!appId || !botToken) {
    throw new Error('DISCORD_APPLICATION_ID または DISCORD_BOT_TOKEN が設定されていません');
  }

  const res = await fetch(
    `${DISCORD_API}/applications/${appId}/guilds/${guildId}/commands`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${botToken}`,
      },
      body: JSON.stringify([RISUKERUGG_COMMAND]),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`ギルドコマンド登録失敗 (${res.status}): ${body}`);
  }
}
