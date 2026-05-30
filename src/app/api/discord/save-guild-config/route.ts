import { NextRequest } from 'next/server';
import { getAdminFirestore, getAdminAuth } from '@/lib/firebase/admin';

/**
 * Bot 招待フローの最終ステップ: guildId + channelId を Firestore に保存し、
 * ギルドコマンドを登録する。
 *
 * operator が通知チャンネルを選択して「保存する」を押した際に呼び出す。
 */
export async function POST(req: NextRequest): Promise<Response> {
  // Firebase ID トークンで operator 認証
  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return Response.json({ error: '認証が必要です' }, { status: 401 });
  }
  const idToken = authorization.slice(7);

  let uid: string;
  try {
    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return Response.json({ error: 'トークンが無効です' }, { status: 401 });
  }

  let teamId: string, guildId: string, channelId: string, nonce: string;
  try {
    const body = (await req.json()) as {
      teamId?: string;
      guildId?: string;
      channelId?: string;
      nonce?: string;
    };
    if (!body.teamId || !body.guildId || !body.channelId || !body.nonce) {
      return Response.json({ error: 'teamId, guildId, channelId, nonce が必要です' }, { status: 400 });
    }
    teamId = body.teamId;
    guildId = body.guildId;
    channelId = body.channelId;
    nonce = body.nonce;
  } catch {
    return Response.json({ error: '無効なリクエストボディです' }, { status: 400 });
  }

  const db = getAdminFirestore();

  // operator 権限の確認
  const memberSnap = await db.doc(`teams/${teamId}/members/${uid}`).get();
  if (!memberSnap.exists || memberSnap.data()?.role !== 'operator') {
    return Response.json({ error: 'operator 権限が必要です' }, { status: 403 });
  }

  // pending データの検証（改ざん防止）
  const pendingSnap = await db.doc(`discord_bot_invite_pending/${nonce}`).get();
  if (!pendingSnap.exists) {
    return Response.json({ error: '招待セッションが見つかりません。やり直してください。' }, { status: 400 });
  }
  const pendingData = pendingSnap.data()!;
  if (pendingData.teamId !== teamId || pendingData.guildId !== guildId) {
    return Response.json({ error: '不正なリクエストです' }, { status: 403 });
  }

  // channelId が pending のチャンネル一覧に含まれるか検証
  const validChannels = (pendingData.channels as Array<{ id: string; name: string }>) ?? [];
  const isValidChannel = validChannels.some((c) => c.id === channelId);
  if (!isValidChannel) {
    return Response.json({ error: '無効なチャンネル ID です' }, { status: 400 });
  }

  // teams/{teamId}/discord/config に guildId と channelId を保存
  await db.doc(`teams/${teamId}/discord/config`).set(
    { guildId, channelId },
    { merge: true }
  );

  // pending データを削除
  await db.doc(`discord_bot_invite_pending/${nonce}`).delete();

  // ギルドコマンドを登録（内部呼び出し）
  const appUrl = process.env.NEXTAUTH_URL ?? req.nextUrl.origin;
  try {
    await fetch(`${appUrl}/api/discord/register-guild-commands`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 内部呼び出し用のシークレットヘッダー
        'X-Internal-Secret': process.env.INTERNAL_API_SECRET ?? 'dev-secret',
      },
      body: JSON.stringify({ guildId }),
    });
  } catch (err) {
    // コマンド登録失敗はログのみ（設定保存は成功させる）
    console.error('ギルドコマンド登録失敗:', err);
  }

  return Response.json({ success: true });
}
