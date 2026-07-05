import { NextRequest } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { fetchGuildTextChannels } from '@/lib/discord/sendBotMessage';
import { getAppBaseUrl as getBaseUrl } from '@/lib/discord/appBaseUrl';

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
  const baseUrl = getBaseUrl(req);

  // ユーザーが Discord 側でキャンセルした場合
  if (error) {
    return Response.redirect(`${baseUrl}/integrations/discord?discord=cancelled`);
  }

  if (!state || !guildId) {
    return Response.redirect(
      `${baseUrl}/integrations/discord?discord=error&reason=invalid-params`
    );
  }

  // 予期しない例外が 500 で止まらないよう全体をラップしてアプリ側にリダイレクトで返す
  try {
    return await handleCallback(baseUrl, state, guildId);
  } catch (err) {
    console.error('[discord/bot-invite-callback] 予期しないエラー:', err);
    return Response.redirect(
      `${baseUrl}/integrations/discord?discord=error&reason=server-error`
    );
  }
}

async function handleCallback(baseUrl: string, state: string, guildId: string): Promise<Response> {
  const db = getAdminFirestore();

  // nonce を検証して teamId を取得
  const nonceSnap = await db.doc(`discord_bot_invite_requests/${state}`).get();
  if (!nonceSnap.exists) {
    return Response.redirect(
      `${baseUrl}/integrations/discord?discord=error&reason=invalid-nonce`
    );
  }

  const nonceData = nonceSnap.data()!;
  const expiresAt = (nonceData.expiresAt as { toDate: () => Date }).toDate();
  if (new Date() > expiresAt) {
    await db.doc(`discord_bot_invite_requests/${state}`).delete();
    return Response.redirect(
      `${baseUrl}/integrations/discord?discord=error&reason=nonce-expired`
    );
  }

  const teamId = nonceData.teamId as string;

  // 1サーバー1チーム制約: 既に他チームがこの guildId を使用していないか確認
  let existingSnap;
  try {
    existingSnap = await db
      .collectionGroup('discord')
      .where('guildId', '==', guildId)
      .limit(1)
      .get();
  } catch (err) {
    console.error('[discord/bot-invite-callback] guildId 重複チェック失敗:', err);
    return Response.redirect(
      `${baseUrl}/integrations/discord?discord=error&reason=duplicate-check-failed`
    );
  }
  if (!existingSnap.empty) {
    const existingTeamId = existingSnap.docs[0]!.ref.parent.parent?.id;
    if (existingTeamId && existingTeamId !== teamId) {
      await db.doc(`discord_bot_invite_requests/${state}`).delete();
      return Response.redirect(
        `${baseUrl}/integrations/discord?discord=error&reason=already-linked`
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
      `${baseUrl}/integrations/discord?discord=error&reason=channel-fetch-failed`
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
    `${baseUrl}/integrations/discord?discord=channel-select&nonce=${state}`
  );
}
