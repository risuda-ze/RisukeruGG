import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 認証不要のパスパターン
const PUBLIC_PATHS = ['/login', '/collab/'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公開パスはそのまま通す
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // セッションCookieでログイン状態を確認
  // Firebase Authのセッション管理はクライアントサイドで行うため、
  // ここではCookieの存在確認のみ実施し、詳細検証はクライアントコンポーネントで行う
  const sessionCookie = request.cookies.get('session');

  if (!sessionCookie && pathname.startsWith('/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.png$|.*\\.svg$|sw.js|workbox-.*).*)',
  ],
};
