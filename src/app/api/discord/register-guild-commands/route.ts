import { NextRequest } from 'next/server';

const DISCORD_API = 'https://discord.com/api/v10';

/** /risukerugg スラッシュコマンドの定義 */
const RISUKERUGG_COMMAND = {
  name: 'risukerugg',
  description: 'RisukeruGG AI アシスタントに話しかける',
  options: [
    {
      name: 'message',
      description: 'AIへのメッセージ',
      type: 3, // STRING
      required: true,
    },
  ],
};

/**
 * 指定した Discord サーバー（guild）にギルドコマンドとして /risukerugg を登録する。
 * グローバルコマンドは使用しない（無関係なサーバーにコマンドが表示されるのを防ぐ）。
 *
 * この API は /api/discord/save-guild-config から内部呼び出しされる。
 * X-Internal-Secret ヘッダーで保護する（本番環境では環境変数で設定する）。
 */
export async function POST(req: NextRequest): Promise<Response> {
  // 内部呼び出しのみ許可
  const secret = req.headers.get('X-Internal-Secret');
  const expectedSecret = process.env.INTERNAL_API_SECRET ?? 'dev-secret';
  if (secret !== expectedSecret) {
    return Response.json({ error: '内部 API のみ呼び出し可能です' }, { status: 403 });
  }

  let guildId: string;
  try {
    const body = (await req.json()) as { guildId?: string };
    if (!body.guildId) {
      return Response.json({ error: 'guildId が必要です' }, { status: 400 });
    }
    guildId = body.guildId;
  } catch {
    return Response.json({ error: '無効なリクエストボディです' }, { status: 400 });
  }

  const appId = process.env.DISCORD_APPLICATION_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!appId || !botToken) {
    return Response.json(
      { error: 'DISCORD_APPLICATION_ID または DISCORD_BOT_TOKEN が設定されていません' },
      { status: 503 }
    );
  }

  // ギルドコマンドとして登録（PUT で上書き）
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
    console.error(`ギルドコマンド登録失敗 (${res.status}):`, body);
    return Response.json(
      { error: `ギルドコマンド登録失敗: HTTP ${res.status}` },
      { status: 500 }
    );
  }

  return Response.json({ success: true, guildId });
}
