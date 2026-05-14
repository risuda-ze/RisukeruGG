'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { Spinner } from '@/components/ui/Spinner';
import { TopBar } from '@/components/layout/TopBar';
import { BottomNav } from '@/components/layout/BottomNav';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !currentUser) {
      router.replace('/login');
    }
  }, [currentUser, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <main className="flex-1 pt-12 pb-16">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
