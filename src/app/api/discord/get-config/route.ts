import { NextRequest } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyBearerToken } from '@/lib/firebase/verifyBearerToken';
import type { DiscordTeamConfig } from '@/types/entities';
import { toTeamRole } from '@/lib/utils/teamRoles';

/**
 * Discord 連携設定を Admin SDK 経由で取得する。
 * クライアントSDK（Firestoreセキュリティルール）に依存せず確実に読み込む。
 * メンバーのみアクセス可能。
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
    return Response.json({ config: null });
  }

  const snap = await db.doc(`teams/${teamId}/discord/config`).get();
  if (!snap.exists) {
    return Response.json({ config: null });
  }

  const data = snap.data()!;
  // 通知トグルは未設定をデフォルト有効（opt-out）として扱う
  const config: DiscordTeamConfig = {
    webhookUrl: (data.webhookUrl as string) ?? '',
    guildId: (data.guildId as string | undefined) ?? undefined,
    channelId: (data.channelId as string | undefined) ?? undefined,
    channelName: (data.channelName as string | undefined) ?? undefined,
    notifyOnTaskCreate: (data.notifyOnTaskCreate as boolean) ?? true,
    notifyOnTaskUpdate: (data.notifyOnTaskUpdate as boolean) ?? true,
    notifyOnCollabCreate: (data.notifyOnCollabCreate as boolean) ?? true,
    notifyOnCollabResponse: (data.notifyOnCollabResponse as boolean) ?? true,
    notifyBefore1h: (data.notifyBefore1h as boolean) ?? true,
    notifyBefore15min: (data.notifyBefore15min as boolean) ?? true,
    // タスク管理 v2（ブリーフ）連携。未設定は既定値で返す
    briefThreadsEnabled: (data.briefThreadsEnabled as boolean | undefined) ?? true,
    briefChannelId: (data.briefChannelId as string | undefined) ?? undefined,
    briefChannelName: (data.briefChannelName as string | undefined) ?? undefined,
    digestEnabled: (data.digestEnabled as boolean | undefined) ?? true,
    digestChannelId: (data.digestChannelId as string | undefined) ?? undefined,
    digestChannelName: (data.digestChannelName as string | undefined) ?? undefined,
    digestTime: (data.digestTime as string | undefined) ?? '09:00',
  };

  return Response.json({ config });
}
