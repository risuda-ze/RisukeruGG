'use client';

import { useEffect } from 'react';
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';
import { useAuthStore } from '@/stores/auth';

/** users/{uid}.theme が変わったら端末の表示と localStorage を合わせる（UI-037） */
function ThemeSync() {
  const { setTheme } = useTheme();
  useEffect(
    () =>
      // 値の変化時だけ反映する。ボタン押下直後に古い値で戻さないよう、現在の選択とは比べない
      useAuthStore.subscribe((s, prev) => {
        if (s.theme && s.theme !== prev.theme) setTheme(s.theme);
      }),
    [setTheme]
  );
  return null;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="dark"
      themes={['dark', 'light']}
      enableSystem
      storageKey="risukeru-theme"
      // color-scheme は tokens.css の各テーマブロックが持つ
      enableColorScheme={false}
      disableTransitionOnChange
    >
      <ThemeSync />
      {children}
    </NextThemesProvider>
  );
}
