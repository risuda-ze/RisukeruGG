import { NextRequest } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyBearerToken } from '@/lib/firebase/verifyBearerToken';
import { deleteGuildCommands, leaveGuild } from '@/lib/discord/guildTeardown';
import { toTeamRole } from '@/lib/utils/teamRoles';

/**
 * Discord Bot 登録解除エンドポイント。
 * Discord 側（スラッシュコマンド・Bot 参加・AI セッション）と Firestore 側
 * （連携情報・通知設定）を一括でクリーンアップする。メンバーのみ実行可能。
 *
 * Discord API 呼び出しは best-effort。失敗しても Firestore の連携情報は必ず削除し、
 * アプリ上は「未連携」状態に戻す（Bot を手動で追い出した後の解除にも対応）。
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

  // メンバー権限の確認
  const memberSnap = await db.doc(`teams/${teamId}/members/${uid}`).get();
  if (!memberSnap.exists || toTeamRole(memberSnap.data()?.role) !== 'member') {
    return Response.json({ error: 'メンバー権限が必要です' }, { status: 403 });
  }

  const configRef = db.doc(`teams/${teamId}/discord/config`);
  const configSnap = await configRef.get();
  const guildId = configSnap.exists
    ? (configSnap.data()?.guildId as string | undefined)
    : undefined;

  // Discord 側のクリーンアップ（best-effort）
  if (guildId) {
    // コマンド削除は Bot 退出より先に行う（退出後は管理権限を失うため）
    await deleteGuildCommands(guildId);
    await leaveGuild(guildId);
    // AI 会話セッションの削除（失敗しても連携解除は続行する）
    try {
      await db.doc(`discord_sessions/${guildId}`).delete();
    } catch (err) {
      console.error('discord_sessions の削除に失敗しました:', err);
    }
  }

  // 連携情報・通知設定を config ドキュメントごと削除（未連携状態へ初期化）
  if (configSnap.exists) {
    await configRef.delete();
  }

  return Response.json({ success: true });
}
