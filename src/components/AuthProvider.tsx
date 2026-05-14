'use client';

import { useEffect } from 'react';
import { initAuthListener } from '@/stores/auth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const unsubscribe = initAuthListener();
    return () => unsubscribe();
  }, []);

  return <>{children}</>;
}
