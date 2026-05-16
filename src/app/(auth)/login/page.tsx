'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const { signIn } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signIn();
      router.push('/dashboard');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const code = (err as { code: string }).code;
        if (code === 'auth/popup-blocked') {
          setError('ポップアップがブロックされました。ポップアップを許可してください');
        } else if (code === 'auth/popup-closed-by-user') {
          setError('サインインがキャンセルされました');
        } else {
          setError('サインインに失敗しました。もう一度お試しください');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    /* ── 全画面ダークテーマ背景 ────────────────────────────── */
    <div className="relative flex min-h-screen items-center justify-center bg-bg overflow-hidden">
      {/* グリッドオーバーレイ */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(var(--purple-l) 1px, transparent 1px), linear-gradient(90deg, var(--purple-l) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* ラジアルグラデーション（中央パープル光源） */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(127,119,221,.18) 0%, transparent 70%)',
        }}
      />

      {/* ── ログインカード ─────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="rounded-[16px] bg-surface border border-border p-8 shadow-lg">
          {/* ロゴ + マスコット */}
          <div className="flex flex-col items-center mb-8">
            <div className="mb-4">
              <svg viewBox="0 0 56 56" fill="none" className="h-14 w-14">
                <rect width="56" height="56" rx="14" fill="var(--purple-d)" />
                <path
                  d="M14 28c0-7.7 6.3-14 14-14s14 6.3 14 14-6.3 14-14 14-14-6.3-14-14Z"
                  fill="var(--purple)"
                  opacity=".3"
                />
                <rect x="22.5" y="20" width="3" height="10" rx="1.5" fill="var(--purple-l)" />
                <rect x="19" y="24" width="10" height="3" rx="1.5" fill="var(--purple-l)" />
                <circle cx="38" cy="23" r="2.5" fill="var(--amber)" />
                <circle cx="33" cy="31" r="2.5" fill="var(--amber)" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-text tracking-tight">リスケるGG</h1>
            <p className="text-sm text-muted mt-1">配信チームのスケジュール管理</p>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="mb-5 rounded-[10px] bg-live/10 border border-live/30 px-4 py-3 text-sm text-live">
              {error}
            </div>
          )}

          {/* Googleサインインボタン */}
          <Button
            variant="primary"
            onClick={handleSignIn}
            loading={loading}
            className="w-full"
            aria-label="Googleでサインイン"
          >
            {!loading && (
              /* Google ロゴ */
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
                <path
                  fill="#EA4335"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#4A90D9"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#FBBC05"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
                <path
                  fill="#EA4335"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
              </svg>
            )}
            Googleでサインイン
          </Button>

          <p className="text-center text-[11px] text-muted mt-5">
            サインインすることで利用規約・プライバシーポリシーに同意します
          </p>
        </div>
      </div>
    </div>
  );
}
