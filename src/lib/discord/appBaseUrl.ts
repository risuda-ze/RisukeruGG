import { NextRequest } from 'next/server';

/**
 * アプリのベースURLを返す（末尾スラッシュなし）。
 * Vercel 環境では req.nextUrl.origin が意図しない値になることがあるため
 * NEXTAUTH_URL を優先する。末尾スラッシュを必ず除去しないと、Discord OAuth2 の
 * redirect_uri 完全一致検証に落ちて「redirect_uriが無効です」エラーになる。
 */
export function getAppBaseUrl(req: NextRequest): string {
  return process.env.NEXTAUTH_URL?.replace(/\/$/, '') ?? req.nextUrl.origin;
}
