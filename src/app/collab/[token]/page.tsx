'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { getCollabSession } from '@/lib/repositories/collabs';
import CollabResponseForm from '@/components/collab/CollabResponseForm';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import type { CollabSession } from '@/types/entities';

type PageState = 'loading' | 'form' | 'expired' | 'confirmed' | 'cancelled' | 'notfound' | 'done';

export default function CollabPublicPage() {
  const params = useParams();
  const token = params.token as string;

  const [pageState, setPageState] = useState<PageState>('loading');
  const [session, setSession] = useState<CollabSession | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!token) {
        setPageState('notfound');
        return;
      }

      try {
        const parts = token.split('__');
        if (parts.length !== 2) {
          setPageState('notfound');
          return;
        }

        const [tid, sid] = parts;
        const result = await getCollabSession(tid, sid);

        if (!result) {
          setPageState('notfound');
          return;
        }

        setSession(result);
        setTeamId(tid);

        const now = new Date();
        if (result.status === 'confirmed') setPageState('confirmed');
        else if (result.status === 'cancelled') setPageState('cancelled');
        else if (result.status === 'expired' || result.expiresAt < now) setPageState('expired');
        else setPageState('form');
      } catch {
        setPageState('notfound');
      }
    }
    load();
  }, [token]);

  return (
    /* ── 全画面ダークテーマ ────────────────────────────────── */
    <div className="min-h-screen bg-bg flex flex-col">
      {/* ロゴヘッダー */}
      <header className="h-[56px] border-b border-border bg-surface flex items-center px-6">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 32 32" fill="none" className="h-7 w-7 shrink-0">
            <rect width="32" height="32" rx="8" fill="var(--purple-d)" />
            <rect x="13" y="12" width="2" height="6" rx="1" fill="var(--purple-l)" />
            <rect x="11" y="14" width="6" height="2" rx="1" fill="var(--purple-l)" />
            <circle cx="22" cy="14" r="1.2" fill="var(--amber)" />
            <circle cx="19" cy="17" r="1.2" fill="var(--amber)" />
          </svg>
          <span className="text-sm font-bold text-text">リスケるGG</span>
        </div>
      </header>

      {/* コンテンツ */}
      <div className="flex-1 flex items-start justify-center p-4 md:p-8">
        <div className="w-full max-w-lg md:max-w-5xl">
          {pageState === 'loading' && (
            <div className="flex justify-center py-16">
              <Spinner size="lg" />
            </div>
          )}

          {pageState === 'notfound' && (
            <Card className="text-center py-10">
              <p className="text-3xl mb-3">🔍</p>
              <h1 className="text-base font-semibold text-text mb-2">リンクが見つかりません</h1>
              <p className="text-sm text-text-muted">URLが正しいか確認してください</p>
            </Card>
          )}

          {pageState === 'expired' && (
            <Card className="text-center py-10">
              <p className="text-3xl mb-3">⏰</p>
              <h1 className="text-base font-semibold text-text mb-2">
                このリンクは有効期限切れです
              </h1>
              <p className="text-sm text-text-muted">コラボ調整者に再送をお願いしてください</p>
            </Card>
          )}

          {pageState === 'confirmed' && session && (
            <Card className="text-center py-10">
              <p className="text-3xl mb-3">✅</p>
              <h1 className="text-base font-semibold text-text mb-2">日程が確定しました</h1>
              {session.confirmedDate && (
                <p className="text-sm text-purple-l font-num">
                  {format(session.confirmedDate, 'M月d日(E) HH:mm', { locale: ja })}
                </p>
              )}
            </Card>
          )}

          {pageState === 'cancelled' && (
            <Card className="text-center py-10">
              <p className="text-3xl mb-3">❌</p>
              <h1 className="text-base font-semibold text-text mb-2">
                このコラボ調整はキャンセルされました
              </h1>
            </Card>
          )}

          {pageState === 'done' && (
            <Card className="text-center py-10">
              <p className="text-3xl mb-3">🎉</p>
              <h1 className="text-base font-semibold text-text mb-2">回答を送信しました</h1>
              <p className="text-sm text-text-muted mb-4">ご回答ありがとうございます</p>
              <div
                className="text-left rounded-[10px] px-4 py-3 text-[12px] text-text-muted"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <p className="font-semibold text-text mb-1">回答を修正したい場合は</p>
                <p>このページの URL を再度開いて、同じお名前で回答し直してください。最後に送信した回答が有効になります。</p>
              </div>
            </Card>
          )}

          {pageState === 'form' && session && teamId && (
            <Card noPadding>
              <div className="px-[18px] py-[14px] border-b border-border">
                <h1 className="text-base font-semibold text-text">コラボ日程の回答</h1>
              </div>
              <div className="p-[18px]">
                <CollabResponseForm
                  session={session}
                  teamId={teamId}
                  sessionId={session.id}
                  onSuccess={() => setPageState('done')}
                />
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
