import { NextRequest } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { fetchGuildTextChannels } from '@/lib/discord/sendBotMessage';
import { verifyBearerToken } from '@/lib/firebase/verifyBearerToken';
import { toTeamRole } from '@/lib/utils/teamRoles';

/**
 * 接続済みチームの Discord 通知チャンネルを変更する。
 * Bot 招待フローをやり直さずに、通知先チャンネルだけを更新できる。
 *
 * 認証: Firebase Bearer トークン必須。対象チームのメンバーのみ変更可能。
 * channelId は Bot トークンで取得した実チャンネル一覧と照合して検証する（改ざん防止）。
 */
export async function POST(req: NextRequest): Promise<Response> {
  const authResult = await verifyBearerToken(req);
  if (authResult instanceof Response) return authResult;
  const { uid } = authResult;

  let teamId: string, channelId: string;
  try {
    const body = (await req.json()) as { teamId?: string; channelId?: string };
    if (!body.teamId || !body.channelId) {
      return Response.json({ error: 'teamId, channelId が必要です' }, { status: 400 });
    }
    teamId = body.teamId;
    channelId = body.channelId;
  } catch {
    return Response.json({ error: '無効なリクエストボディです' }, { status: 400 });
  }

  const db = getAdminFirestore();

  // メンバー権限の確認
  const memberSnap = await db.doc(`teams/${teamId}/members/${uid}`).get();
  if (!memberSnap.exists || toTeamRole(memberSnap.data()?.role) !== 'member') {
    return Response.json({ error: 'メンバー権限が必要です' }, { status: 403 });
  }

  // 接続済み（guildId 設定済み）であることを確認
  const configRef = db.doc(`teams/${teamId}/discord/config`);
  const configSnap = await configRef.get();
  const guildId = configSnap.data()?.guildId as string | undefined;
  if (!configSnap.exists || !guildId) {
    return Response.json({ error: 'Discord Bot が接続されていません' }, { status: 400 });
  }

  // channelId が実在するテキストチャンネルか検証
  let channels: Array<{ id: string; name: string }>;
  try {
    channels = await fetchGuildTextChannels(guildId);
  } catch (err) {
    console.error('[discord/update-channel] チャンネル一覧取得失敗:', err);
    return Response.json(
      { error: 'チャンネル一覧の取得に失敗しました。Bot がサーバーに参加しているか確認してください。' },
      { status: 502 }
    );
  }
  const channel = channels.find((c) => c.id === channelId);
  if (!channel) {
    return Response.json({ error: '無効なチャンネル ID です' }, { status: 400 });
  }

  // channelId と表示用のチャンネル名を保存
  await configRef.set({ channelId, channelName: channel.name }, { merge: true });

  return Response.json({ success: true });
}
