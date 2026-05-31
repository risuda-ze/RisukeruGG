import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';

/** 直接URLアクセス（/schedule/:id）をスケジュール一覧にリダイレクト */
export function GET(_req: NextRequest) {
  redirect('/schedule');
}
