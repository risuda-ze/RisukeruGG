import { NextRequest } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyBearerToken } from '@/lib/firebase/verifyBearerToken';
import type { DiscordTeamConfig } from '@/types/entities';

/**
 * Discord 連携設定を Admin SDK 経由で取得する。
 * クライアントSDK（Firestoreセキュリティルール）に依存せず確実に読み込む。
 * operator のみアクセス可能。
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

  // operator 権限確認
  const memberSnap = await db.doc(`teams/${teamId}/members/${uid}`).get();
  if (!memberSnap.exists || memberSnap.data()?.role !== 'operator') {
    return Response.json({ config: null });
  }

  const snap = await db.doc(`teams/${teamId}/discord/config`).get();
  if (!snap.exists) {
    return Response.json({ config: null });
  }

  const data = snap.data()!;
  const config: DiscordTeamConfig = {
    webhookUrl: (data.webhookUrl as string) ?? '',
    guildId: (data.guildId as string | undefined) ?? undefined,
    channelId: (data.channelId as string | undefined) ?? undefined,
    notifyOnCreate: (data.notifyOnCreate as boolean) ?? false,
    notifyBefore1h: (data.notifyBefore1h as boolean) ?? false,
    notifyBefore15min: (data.notifyBefore15min as boolean) ?? false,
  };

  return Response.json({ config });
}
