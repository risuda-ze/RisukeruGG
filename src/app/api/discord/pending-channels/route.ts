import { NextRequest } from 'next/server';
import { getAdminFirestore, getAdminAuth } from '@/lib/firebase/admin';

/**
 * Bot 招待フロー中のチャンネル選択画面でチャンネル一覧を取得する。
 * nonce をキーに Firestore の discord_bot_invite_pending から読み出す。
 *
 * 認証: Firebase Bearer トークンを必須とし、対象チームの operator のみ取得可能。
 * nonce は URL に露出するため、認証なしでは Discord サーバーのチャンネル情報が漏洩するリスクがある。
 */
export async function GET(req: NextRequest): Promise<Response> {
  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return Response.json({ error: '認証が必要です' }, { status: 401 });
  }
  const idToken = authorization.slice(7);

  let uid: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return Response.json({ error: 'トークンが無効です' }, { status: 401 });
  }

  const nonce = req.nextUrl.searchParams.get('nonce');
  if (!nonce) {
    return Response.json({ error: 'nonce が必要です' }, { status: 400 });
  }

  const db = getAdminFirestore();
  const snap = await db.doc(`discord_bot_invite_pending/${nonce}`).get();

  if (!snap.exists) {
    return Response.json({ error: 'チャンネル情報が見つかりません。やり直してください。' }, { status: 404 });
  }

  const data = snap.data()!;
  const teamId = data.teamId as string;

  // 対象チームの operator であることを確認
  const memberSnap = await db.doc(`teams/${teamId}/members/${uid}`).get();
  if (!memberSnap.exists || memberSnap.data()?.role !== 'operator') {
    return Response.json({ error: 'アクセス権限がありません' }, { status: 403 });
  }

  return Response.json({
    guildId: data.guildId as string,
    channels: (data.channels as Array<{ id: string; name: string }>) ?? [],
  });
}
