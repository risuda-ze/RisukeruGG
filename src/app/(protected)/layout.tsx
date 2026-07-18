'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { Spinner } from '@/components/ui/Spinner';
import { AppShell } from '@/components/layout/AppShell';
import { BetaGate } from '@/components/BetaGate';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const loading = useAuthStore((s) => s.loading);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !currentUser) {
      router.replace('/login');
    }
  }, [currentUser, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  // クローズドベータ期間中は allowlist 判定を挟む（allowlist 外は待機画面のみ）
  return (
    <BetaGate>
      <AppShell>{children}</AppShell>
    </BetaGate>
  );
}
