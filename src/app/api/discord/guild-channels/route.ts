import { NextRequest } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { fetchGuildTextChannels } from '@/lib/discord/sendBotMessage';
import { verifyBearerToken } from '@/lib/firebase/verifyBearerToken';
import { toTeamRole } from '@/lib/utils/teamRoles';

/**
 * 接続済みチームの Discord サーバーからテキストチャンネル一覧を取得する。
 * 連携後に通知チャンネルを変更する際の選択肢として使う。
 *
 * 認証: Firebase Bearer トークン必須。対象チームのメンバーのみ取得可能。
 */
export async function GET(req: NextRequest): Promise<Response> {
  const authResult = await verifyBearerToken(req);
  if (authResult instanceof Response) return authResult;
  const { uid } = authResult;

  const teamId = req.nextUrl.searchParams.get('teamId');
  if (!teamId) {
    return Response.json({ error: 'teamId が必要です' }, { status: 400 });
  }

  const db = getAdminFirestore();

  // メンバー権限の確認
  const memberSnap = await db.doc(`teams/${teamId}/members/${uid}`).get();
  if (!memberSnap.exists || toTeamRole(memberSnap.data()?.role) !== 'member') {
    return Response.json({ error: 'メンバー権限が必要です' }, { status: 403 });
  }

  // 接続済み（guildId 設定済み）であることを確認
  const configSnap = await db.doc(`teams/${teamId}/discord/config`).get();
  const guildId = configSnap.data()?.guildId as string | undefined;
  if (!configSnap.exists || !guildId) {
    return Response.json({ error: 'Discord Bot が接続されていません' }, { status: 400 });
  }

  try {
    const channels = await fetchGuildTextChannels(guildId);
    return Response.json({ guildId, channels });
  } catch (err) {
    // Bot がサーバーから削除されている場合など
    console.error('[discord/guild-channels] チャンネル一覧取得失敗:', err);
    return Response.json(
      { error: 'チャンネル一覧の取得に失敗しました。Bot がサーバーに参加しているか確認してください。' },
      { status: 502 }
    );
  }
}
