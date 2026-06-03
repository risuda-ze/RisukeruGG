import { NextRequest } from 'next/server';
import { registerGuildCommands } from '@/lib/discord/registerGuildCommands';

/**
 * 指定した Discord サーバー（guild）にギルドコマンドとして /risukerugg を登録する。
 * グローバルコマンドは使用しない（無関係なサーバーにコマンドが表示されるのを防ぐ）。
 *
 * この API は /api/discord/save-guild-config から直接関数呼び出しに切り替え済み。
 * 外部からの独立呼び出しにも使用可能だが INTERNAL_API_SECRET による保護が必須。
 */
export async function POST(req: NextRequest): Promise<Response> {
  const secret = req.headers.get('X-Internal-Secret');
  const expectedSecret = process.env.INTERNAL_API_SECRET;

  // INTERNAL_API_SECRET 未設定の場合はエンドポイントを無効化する
  if (!expectedSecret) {
    console.error('[register-guild-commands] INTERNAL_API_SECRET が設定されていません');
    return Response.json({ error: 'サーバー設定エラーです' }, { status: 503 });
  }

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

  try {
    await registerGuildCommands(guildId);
    return Response.json({ success: true, guildId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'コマンド登録失敗';
    console.error(`ギルドコマンド登録失敗 (guildId=${guildId}):`, err);
    return Response.json({ error: message }, { status: 500 });
  }
}
