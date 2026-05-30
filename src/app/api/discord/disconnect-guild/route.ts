import { NextRequest } from 'next/server';
import { getAdminFirestore, getAdminAuth } from '@/lib/firebase/admin';

/**
 * Discord Bot 接続解除エンドポイント。
 * teams/{teamId}/discord/config から guildId と channelId を削除する。
 * operator のみ実行可能。
 */
export async function POST(req: NextRequest): Promise<Response> {
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

  const db = getAdminFirestore();

  // operator 権限の確認
  const memberSnap = await db.doc(`teams/${teamId}/members/${uid}`).get();
  if (!memberSnap.exists || memberSnap.data()?.role !== 'operator') {
    return Response.json({ error: 'operator 権限が必要です' }, { status: 403 });
  }

  // guildId と channelId を Firestore から削除（FieldValue.delete() を使用）
  const { FieldValue } = await import('firebase-admin/firestore');
  await db.doc(`teams/${teamId}/discord/config`).update({
    guildId: FieldValue.delete(),
    channelId: FieldValue.delete(),
  });

  return Response.json({ success: true });
}
