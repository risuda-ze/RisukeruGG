import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { fetchGuildTextChannels } from '@/lib/discord/sendBotMessage';
import { verifyBearerToken } from '@/lib/firebase/verifyBearerToken';

/** 'HH:00' 形式のみ（毎時起動のダイジェストに合わせる） */
const BodySchema = z.object({
  teamId: z.string().min(1),
  briefThreadsEnabled: z.boolean(),
  briefChannelId: z.string().nullable(),
  digestEnabled: z.boolean(),
  digestChannelId: z.string().nullable(),
  digestTime: z.string().regex(/^([01]\d|2[0-3]):00$/),
});

/**
 * タスク管理 v2（ブリーフ）の Discord 連携設定を更新する（IN-023 / IN-027）。
 * operator のみ。チャンネル ID は Bot トークンで取得した実チャンネル一覧と照合する。
 * null のチャンネルは「通知チャンネルと同じ」を意味し、フィールドを削除する。
 */
export async function POST(req: NextRequest): Promise<Response> {
  const authResult = await verifyBearerToken(req);
  if (authResult instanceof Response) return authResult;
  const { uid } = authResult;

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: '無効なリクエストボディです' }, { status: 400 });
  }
  const { teamId, briefThreadsEnabled, briefChannelId, digestEnabled, digestChannelId, digestTime } = parsed.data;

  const db = getAdminFirestore();
  const memberSnap = await db.doc(`teams/${teamId}/members/${uid}`).get();
  if (!memberSnap.exists || memberSnap.data()?.role !== 'operator') {
    return Response.json({ error: 'operator 権限が必要です' }, { status: 403 });
  }

  const configRef = db.doc(`teams/${teamId}/discord/config`);
  const configSnap = await configRef.get();
  const guildId = configSnap.data()?.guildId as string | undefined;
  if (!configSnap.exists || !guildId) {
    return Response.json({ error: 'Discord Bot が接続されていません' }, { status: 400 });
  }

  // チャンネル ID の実在確認（指定がある場合のみ）
  let channels: Array<{ id: string; name: string }> = [];
  if (briefChannelId || digestChannelId) {
    try {
      channels = await fetchGuildTextChannels(guildId);
    } catch (err) {
      console.error('[discord/update-brief-settings] チャンネル一覧取得失敗:', err);
      return Response.json({ error: 'チャンネル一覧の取得に失敗しました' }, { status: 502 });
    }
  }
  const pick = (id: string | null) => (id ? channels.find((c) => c.id === id) ?? null : null);
  const briefChannel = pick(briefChannelId);
  const digestChannel = pick(digestChannelId);
  if ((briefChannelId && !briefChannel) || (digestChannelId && !digestChannel)) {
    return Response.json({ error: '無効なチャンネル ID です' }, { status: 400 });
  }

  const { FieldValue } = await import('firebase-admin/firestore');
  await configRef.set(
    {
      briefThreadsEnabled,
      briefChannelId: briefChannel ? briefChannel.id : FieldValue.delete(),
      briefChannelName: briefChannel ? briefChannel.name : FieldValue.delete(),
      digestEnabled,
      digestChannelId: digestChannel ? digestChannel.id : FieldValue.delete(),
      digestChannelName: digestChannel ? digestChannel.name : FieldValue.delete(),
      digestTime,
    },
    { merge: true }
  );

  return Response.json({ success: true });
}
