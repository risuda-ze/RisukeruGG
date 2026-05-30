import { NextRequest } from 'next/server';
import { getAdminFirestore, getAdminAuth } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Discord OAuth2 連携開始エンドポイント。
 * クライアントが呼び出すと nonce を生成して Discord OAuth2 URL を返す。
 *
 * CSRF 保護: nonce を discord_link_requests/{nonce} に保存し、
 * コールバック時に state パラメータと照合する（H2/H4 対応）。
 */
export async function POST(req: NextRequest): Promise<Response> {
  // Firebase ID トークンで認証確認
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

  const clientId = process.env.DISCORD_CLIENT_ID;
  const callbackUrl = process.env.NEXTAUTH_URL
    ? `${process.env.NEXTAUTH_URL}/api/discord/callback`
    : `${req.nextUrl.origin}/api/discord/callback`;

  if (!clientId) {
    return Response.json({ error: 'DISCORD_CLIENT_ID が設定されていません' }, { status: 503 });
  }

  // CSRF 用 nonce を生成して Firestore に保存（10 分で期限切れ）
  const nonce = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  const db = getAdminFirestore();
  await db.doc(`discord_link_requests/${nonce}`).set({
    uid,
    expiresAt,
    createdAt: FieldValue.serverTimestamp(),
  });

  // Discord OAuth2 URL を組み立て
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: 'identify',
    state: nonce,
  });
  const authUrl = `https://discord.com/oauth2/authorize?${params.toString()}`;

  return Response.json({ authUrl });
}
