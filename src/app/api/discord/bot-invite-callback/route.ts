import { NextRequest } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { fetchGuildTextChannels } from '@/lib/discord/sendBotMessage';

/**
 * Discord Bot 招待 OAuth2 コールバック。
 * Discord がユーザーをここにリダイレクトしてくる（code, guild_id, state を含む）。
 *
 * 処理フロー:
 * 1. state（nonce）から teamId を解決・検証
 * 2. 1サーバー1チーム制約を確認
 * 3. Bot API でチャンネル一覧を取得して Firestore に一時保存
 * 4. チャンネル選択画面へリダイレクト
 */
export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = req.nextUrl;
  const state = searchParams.get('state');
  const guildId = searchParams.get('guild_id');
  const error = searchParams.get('error');

  // ユーザーが Discord 側でキャンセルした場合
  if (error) {
    return Response.redirect(new URL('/team?discord=cancelled', req.nextUrl.origin));
  }

  if (!state || !guildId) {
    return Response.redirect(
      new URL('/team?discord=error&reason=invalid-params', req.nextUrl.origin)
    );
  }

  const db = getAdminFirestore();

  // nonce を検証して teamId を取得
  const nonceSnap = await db.doc(`discord_bot_invite_requests/${state}`).get();
  if (!nonceSnap.exists) {
    return Response.redirect(
      new URL('/team?discord=error&reason=invalid-nonce', req.nextUrl.origin)
    );
  }

  const nonceData = nonceSnap.data()!;
  const expiresAt = (nonceData.expiresAt as { toDate: () => Date }).toDate();
  if (new Date() > expiresAt) {
    await db.doc(`discord_bot_invite_requests/${state}`).delete();
    return Response.redirect(
      new URL('/team?discord=error&reason=nonce-expired', req.nextUrl.origin)
    );
  }

  const teamId = nonceData.teamId as string;

  // 1サーバー1チーム制約: 既に他チームがこの guildId を使用していないか確認
  // Admin SDK での collectionGroup クエリ
  const existingSnap = await db
    .collectionGroup('discord')
    .where('guildId', '==', guildId)
    .limit(1)
    .get();
  if (!existingSnap.empty) {
    const existingTeamId = existingSnap.docs[0]!.ref.parent.parent?.id;
    if (existingTeamId && existingTeamId !== teamId) {
      await db.doc(`discord_bot_invite_requests/${state}`).delete();
      return Response.redirect(
        new URL('/team?discord=error&reason=already-linked', req.nextUrl.origin)
      );
    }
  }

  // Bot API でチャンネル一覧を取得
  let channels: Array<{ id: string; name: string }> = [];
  try {
    channels = await fetchGuildTextChannels(guildId);
  } catch (err) {
    console.error('チャンネル一覧取得失敗:', err);
    return Response.redirect(
      new URL('/team?discord=error&reason=channel-fetch-failed', req.nextUrl.origin)
    );
  }

  // チャンネル一覧を Firestore に一時保存（nonce をキーとして使い回す）
  await db.doc(`discord_bot_invite_pending/${state}`).set({
    teamId,
    guildId,
    channels,
    createdAt: FieldValue.serverTimestamp(),
  });

  // nonce は使い捨て（pending に移行したので削除）
  await db.doc(`discord_bot_invite_requests/${state}`).delete();

  // チャンネル選択画面へリダイレクト
  return Response.redirect(
    new URL(`/team?discord=channel-select&nonce=${state}`, req.nextUrl.origin)
  );
}
