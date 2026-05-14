import { NextResponse } from 'next/server';

// 認証ガードはクライアントコンポーネント（(protected)/layout.tsx）で行う。
// Proxy は静的アセットを除いたすべてのリクエストを素通しする。
export function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.png$|.*\\.svg$|sw.js|workbox-.*).*)',
  ],
};
