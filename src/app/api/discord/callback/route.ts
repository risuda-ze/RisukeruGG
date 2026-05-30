import { NextRequest } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Discord OAuth2 コールバックエンドポイント。
 * Discord 認証後にリダイレクトされる。
 *
 * 処理フロー:
 * 1. state（nonce）を検証し discord_link_requests/{nonce} から uid を取得
 * 2. code を使って Discord トークンを交換
 * 3. Discord /users/@me でユーザー情報を取得
 * 4. users/{uid}.discord を更新
 * 5. nonce を削除（使い捨て）
 * 6. /settings?discord=connected にリダイレクト
 */
export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // nonce

  if (!code || !state) {
    return Response.json({ error: 'code または state が不足しています' }, { status: 400 });
  }

  const db = getAdminFirestore();
  const nonceDoc = await db.doc(`discord_link_requests/${state}`).get();

  if (!nonceDoc.exists) {
    return Response.json({ error: 'nonce が見つかりません（期限切れまたは無効）' }, { status: 400 });
  }

  const nonceData = nonceDoc.data()!;
  const expiresAt = (nonceData.expiresAt as { toDate: () => Date }).toDate();
  if (new Date() > expiresAt) {
    // 期限切れ nonce を削除してからエラーを返す
    await nonceDoc.ref.delete();
    return Response.json({ error: 'nonce の有効期限が切れています' }, { status: 400 });
  }

  const uid = nonceData.uid as string;

  // Discord OAuth2 トークン交換
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const callbackUrl = `${req.nextUrl.origin}/api/discord/callback`;

  if (!clientId || !clientSecret) {
    return Response.json({ error: 'Discord 環境変数が設定されていません' }, { status: 503 });
  }

  const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: callbackUrl,
    }),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    console.error('Discord トークン交換失敗:', body);
    return Response.json({ error: 'Discord 認証に失敗しました' }, { status: 400 });
  }

  const tokenData = (await tokenRes.json()) as { access_token: string };

  // Discord ユーザー情報取得
  const userRes = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userRes.ok) {
    return Response.json({ error: 'Discord ユーザー情報の取得に失敗しました' }, { status: 400 });
  }

  const discordUser = (await userRes.json()) as { id: string; username: string };

  // Firestore の users/{uid}.discord を更新
  await db.doc(`users/${uid}`).update({
    'discord.userId': discordUser.id,
    'discord.username': discordUser.username,
    'discord.connectedAt': FieldValue.serverTimestamp(),
  });

  // nonce は使い捨て — 処理後に即削除
  await nonceDoc.ref.delete();

  // 設定ページにリダイレクト
  return Response.redirect(new URL('/settings?discord=connected', req.nextUrl.origin));
}
