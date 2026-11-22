import { NextRequest } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyBearerToken } from '@/lib/firebase/verifyBearerToken';
import { getAppBaseUrl } from '@/lib/discord/appBaseUrl';
import { toTeamRole } from '@/lib/utils/teamRoles';

/**
 * Discord Bot 招待 OAuth2 開始エンドポイント。
 * メンバーが「Botをサーバーに追加」ボタンを押した際に呼び出す。
 *
 * CSRF 保護: nonce を discord_bot_invite_requests/{nonce} に保存し、
 * コールバック時に state パラメータと照合する。
 */
export async function POST(req: NextRequest): Promise<Response> {
  // Firebase ID トークンで メンバー認証
  const authResult = await verifyBearerToken(req);
  if (authResult instanceof Response) return authResult;
  const { uid } = authResult;

  // リクエストボディから teamId を取得
  let teamId: string;
  try {
    const body = (await req.json()) as { teamId?: string };
    if (!body.teamId) {
      return Response.json({ error: 'teamId が必要です' }, { status: 400 });
    }
    teamId = body.teamId;
  } catch {
    return Response.json({ error: '無効なリクエストボディです' }, { status: 400 });
  }

  // メンバー権限の確認
  const db = getAdminFirestore();
  const memberSnap = await db.doc(`teams/${teamId}/members/${uid}`).get();
  if (!memberSnap.exists || toTeamRole(memberSnap.data()?.role) !== 'member') {
    return Response.json({ error: 'メンバー権限が必要です' }, { status: 403 });
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) {
    return Response.json({ error: 'DISCORD_CLIENT_ID が設定されていません' }, { status: 503 });
  }

  const callbackUrl = `${getAppBaseUrl(req)}/api/discord/bot-invite-callback`;

  // CSRF 用 nonce を生成して Firestore に保存（10 分で期限切れ）
  const nonce = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db.doc(`discord_bot_invite_requests/${nonce}`).set({
    teamId,
    uid,
    expiresAt,
    createdAt: FieldValue.serverTimestamp(),
  });

  // Bot 招待用 Discord OAuth2 URL を組み立て
  // scope: bot（サーバーへの Bot 参加）+ applications.commands（ギルドコマンド登録）
  // permissions（IN-026）:
  //   VIEW_CHANNEL (1<<10) + SEND_MESSAGES (1<<11) + READ_MESSAGE_HISTORY (1<<16)
  //   + CREATE_PUBLIC_THREADS (1<<35) + SEND_MESSAGES_IN_THREADS (1<<38)
  //   = 309237713920。ブリーフ別スレッド（タスク管理 v2）に必要。
  //   以前（2048 = SEND_MESSAGES のみ）で招待済みのサーバーは再招待で権限を更新する
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: 'bot applications.commands',
    permissions: '309237713920',
    state: nonce,
  });
  const authUrl = `https://discord.com/oauth2/authorize?${params.toString()}`;

  return Response.json({ authUrl });
}
