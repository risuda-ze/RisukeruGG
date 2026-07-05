import { NextRequest } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyBearerToken } from '@/lib/firebase/verifyBearerToken';

/**
 * Discord Bot 接続解除エンドポイント。
 * teams/{teamId}/discord/config から guildId と channelId を削除する。
 * operator のみ実行可能。
 */
export async function POST(req: NextRequest): Promise<Response> {
  const authResult = await verifyBearerToken(req);
  if (authResult instanceof Response) return authResult;
  const { uid } = authResult;

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
