import { NextRequest } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';

/**
 * Bot 招待フロー中のチャンネル選択画面でチャンネル一覧を取得する。
 * nonce をキーに Firestore の discord_bot_invite_pending から読み出す。
 */
export async function GET(req: NextRequest): Promise<Response> {
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
  return Response.json({
    guildId: data.guildId as string,
    channels: (data.channels as Array<{ id: string; name: string }>) ?? [],
  });
}
