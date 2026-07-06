'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { Spinner } from '@/components/ui/Spinner';
import { AppShell } from '@/components/layout/AppShell';

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

  return <AppShell>{children}</AppShell>;
}
