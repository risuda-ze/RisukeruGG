/**
 * Discord スラッシュコマンド登録スクリプト
 *
 * Sprint 3 着手前に一度だけ実行する。
 * 実行後は Discord Developer Portal のコマンド一覧に /risukerugg が表示される。
 *
 * 必要な環境変数:
 *   DISCORD_APPLICATION_ID — Developer Portal のアプリ ID
 *   DISCORD_BOT_TOKEN      — Bot Token
 *
 * 実行方法:
 *   node scripts/register-discord-commands.mjs
 *
 * （Sprint 1 MVP では不要。Sprint 3 着手前に実行すること）
 */

const APPLICATION_ID = process.env.DISCORD_APPLICATION_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!APPLICATION_ID || !BOT_TOKEN) {
  console.error(
    'エラー: DISCORD_APPLICATION_ID と DISCORD_BOT_TOKEN を環境変数に設定してください。\n' +
      '例: DISCORD_APPLICATION_ID=xxx DISCORD_BOT_TOKEN=yyy node scripts/register-discord-commands.mjs'
  );
  process.exit(1);
}

const commands = [
  {
    name: 'risukerugg',
    description: 'RisukeruGG の AI アシスタントにメッセージを送る',
    options: [
      {
        name: 'message',
        description: 'AI に伝えたいこと（例: 来週月曜に配信入れたい）',
        type: 3, // STRING
        required: true,
      },
    ],
  },
];

const url = `https://discord.com/api/v10/applications/${APPLICATION_ID}/commands`;

const response = await fetch(url, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bot ${BOT_TOKEN}`,
  },
  body: JSON.stringify(commands),
});

if (!response.ok) {
  const text = await response.text();
  console.error(`コマンド登録に失敗しました (HTTP ${response.status}):`, text);
  process.exit(1);
}

const result = await response.json();
console.log(`✅ コマンド登録完了: ${result.length} 件`);
result.forEach((cmd) => console.log(`  /${cmd.name} (id: ${cmd.id})`));
