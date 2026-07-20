'use client';

import { useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase/client';
import { useAuthStore } from '@/stores/auth';
import { evaluateBetaAccess, isClosedBetaEnabled, type BetaAccessStatus } from '@/lib/betaAccess';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';

/**
 * クローズドベータ入場制限ゲート（T11）。
 *
 * - `NEXT_PUBLIC_CLOSED_BETA === 'true'` のときだけ判定を行う。
 * - allowlist 在籍ユーザーは通常どおり children を表示する。
 * - allowlist 外ユーザーには待機画面（サインアウト＋利用申請）のみを表示する。
 *
 * 実際のデータアクセス拒否は firestore.rules が担保しており、本ゲートは表示制御。
 */
export function BetaGate({ children }: { children: React.ReactNode }) {
  const currentUser = useAuthStore((s) => s.currentUser);
  // フラグ OFF のときは判定不要 → 初期状態から素通り
  const [status, setStatus] = useState<BetaAccessStatus | 'checking'>(
    isClosedBetaEnabled() ? 'checking' : 'allowed'
  );

  useEffect(() => {
    // フラグ OFF は初期状態（'allowed'）のまま素通り。未ログインは判定材料が無いので待機。
    // ここでは同期的な setState を行わず、判定結果は非同期コールバックでのみ反映する。
    if (!isClosedBetaEnabled() || !currentUser) return;

    let cancelled = false;
    evaluateBetaAccess(currentUser.email)
      .then((result) => {
        if (!cancelled) setStatus(result);
      })
      .catch(() => {
        // 判定失敗時は保守的に待機画面を表示する（在籍を確認できないため）
        if (!cancelled) setStatus('waiting');
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <Spinner size="lg" />
      </div>
    );
  }

  if (status === 'waiting') {
    return <BetaWaitingScreen />;
  }

  return <>{children}</>;
}

type RequestState = 'idle' | 'submitting' | 'success' | 'error';

/** allowlist 外ユーザー向けの待機画面。 */
function BetaWaitingScreen() {
  const signOut = useAuthStore((s) => s.signOut);
  const [requestState, setRequestState] = useState<RequestState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleRequestAccess() {
    if (requestState === 'submitting' || requestState === 'success') return;
    setRequestState('submitting');
    setErrorMessage(null);
    try {
      const requestBetaAccess = httpsCallable(functions, 'requestBetaAccess');
      await requestBetaAccess({});
      setRequestState('success');
    } catch (err: unknown) {
      setRequestState('error');
      if (
        err &&
        typeof err === 'object' &&
        'message' in err &&
        typeof (err as { message: unknown }).message === 'string'
      ) {
        setErrorMessage((err as { message: string }).message);
      } else {
        setErrorMessage('申請の送信に失敗しました。しばらくしてからお試しください');
      }
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-bg overflow-hidden">
      {/* グリッドオーバーレイ（ログイン画面と同系のトーン） */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(var(--purple-l) 1px, transparent 1px), linear-gradient(90deg, var(--purple-l) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(127,119,221,.18) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="rounded-[16px] bg-surface border border-border p-8 shadow-lg text-center">
          <h1 className="text-xl font-bold text-text tracking-tight mb-3">
            正式公開までお待ちください
          </h1>
          <p className="text-sm text-muted leading-relaxed mb-6">
            リスケるGG は現在クローズドベータ期間中です。
            <br />
            ご利用には招待が必要です。利用を希望される場合は、下のボタンから申請してください。
          </p>

          {requestState === 'success' ? (
            <div className="rounded-[10px] bg-green/10 border border-green/30 px-4 py-3 text-sm text-green mb-6">
              申請を受け付けました。招待の準備が整い次第ご連絡します。
            </div>
          ) : (
            <>
              {requestState === 'error' && errorMessage && (
                <div className="rounded-[10px] bg-live/10 border border-live/30 px-4 py-3 text-sm text-live mb-4">
                  {errorMessage}
                </div>
              )}
              <Button
                variant="primary"
                onClick={handleRequestAccess}
                loading={requestState === 'submitting'}
                className="w-full mb-3"
              >
                利用を申請する
              </Button>
            </>
          )}

          <Button variant="secondary" onClick={() => signOut()} className="w-full">
            サインアウト
          </Button>
        </div>
      </div>
    </div>
  );
}
