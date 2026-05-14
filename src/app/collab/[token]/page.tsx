'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { getCollabSession } from '@/lib/repositories/collabs';
import CollabResponseForm from '@/components/collab/CollabResponseForm';
import { Spinner } from '@/components/ui/Spinner';
import type { CollabSession } from '@/types/entities';

type PageState = 'loading' | 'form' | 'expired' | 'confirmed' | 'cancelled' | 'notfound' | 'done';

export default function CollabPublicPage() {
  const params = useParams();
  const token = params.token as string;

  // token format: {teamId}__{sessionId}
  // We embed teamId in the token to avoid exposing all teams
  // Actual format from contract: /collab/{sessionId} but we need teamId too
  // Use query param for teamId or embed in path — using path segment for simplicity
  // Since the URL is /collab/{sessionId} and we need teamId, we store teamId in Firestore
  // as a field on collabSessions and do a collection group query
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
        // token is "{teamId}__{sessionId}"
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
        if (result.status === 'confirmed') {
          setPageState('confirmed');
        } else if (result.status === 'cancelled') {
          setPageState('cancelled');
        } else if (result.status === 'expired' || result.expiresAt < now) {
          setPageState('expired');
        } else {
          setPageState('form');
        }
      } catch {
        setPageState('notfound');
      }
    }

    load();
  }, [token]);

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-zinc-200 p-6">
        {pageState === 'loading' && (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        )}

        {pageState === 'notfound' && (
          <div className="text-center py-8">
            <p className="text-2xl mb-2">🔍</p>
            <h1 className="text-lg font-bold text-zinc-900 mb-2">リンクが見つかりません</h1>
            <p className="text-sm text-zinc-500">URLが正しいか確認してください</p>
          </div>
        )}

        {pageState === 'expired' && (
          <div className="text-center py-8">
            <p className="text-2xl mb-2">⏰</p>
            <h1 className="text-lg font-bold text-zinc-900 mb-2">
              このリンクは有効期限切れです
            </h1>
            <p className="text-sm text-zinc-500">コラボ打診者に再送をお願いしてください</p>
          </div>
        )}

        {pageState === 'confirmed' && session && (
          <div className="text-center py-8">
            <p className="text-2xl mb-2">✅</p>
            <h1 className="text-lg font-bold text-zinc-900 mb-2">日程が確定しました</h1>
            {session.confirmedDate && (
              <p className="text-sm text-zinc-600">
                {format(session.confirmedDate, 'M月d日(E) HH:mm', { locale: ja })}
              </p>
            )}
          </div>
        )}

        {pageState === 'cancelled' && (
          <div className="text-center py-8">
            <p className="text-2xl mb-2">❌</p>
            <h1 className="text-lg font-bold text-zinc-900 mb-2">
              このコラボ調整はキャンセルされました
            </h1>
          </div>
        )}

        {pageState === 'form' && session && teamId && (
          <>
            <h1 className="text-xl font-bold text-zinc-900 mb-6">コラボ日程の回答</h1>
            <CollabResponseForm
              session={session}
              teamId={teamId}
              sessionId={session.id}
              onSuccess={() => setPageState('done')}
            />
          </>
        )}

        {pageState === 'done' && (
          <div className="text-center py-8">
            <p className="text-2xl mb-2">🎉</p>
            <h1 className="text-lg font-bold text-zinc-900 mb-2">回答を送信しました</h1>
            <p className="text-sm text-zinc-500">ご回答ありがとうございます</p>
          </div>
        )}
      </div>
    </div>
  );
}
