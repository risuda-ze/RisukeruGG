import { NextRequest } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/admin';

/**
 * Authorization ヘッダーの Firebase ID トークンを検証し uid を返す。
 * 失敗時は理由に応じた Response を返す（呼び出し側は instanceof Response で分岐する）。
 *
 * Admin SDK の初期化失敗（環境変数未設定・サービスアカウント不正など）と
 * トークン自体の検証失敗を別ログ・別ステータスに分けることで、
 * 「トークンが無効です」という表示の裏にある実際の原因を Vercel のログから追えるようにする。
 */
export async function verifyBearerToken(
  req: NextRequest
): Promise<{ uid: string } | Response> {
  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return Response.json({ error: '認証が必要です' }, { status: 401 });
  }
  const idToken = authorization.slice(7);

  let adminAuth: ReturnType<typeof getAdminAuth>;
  try {
    adminAuth = getAdminAuth();
  } catch (err) {
    console.error('[firebase-admin] 初期化エラー（環境変数・サービスアカウント設定を確認してください）:', err);
    return Response.json(
      { error: 'サーバー設定エラー: Firebase Admin SDK を初期化できませんでした' },
      { status: 500 }
    );
  }

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    return { uid: decoded.uid };
  } catch (err) {
    console.error('[firebase-admin] ID トークン検証エラー:', err);
    return Response.json({ error: 'トークンが無効です' }, { status: 401 });
  }
}
