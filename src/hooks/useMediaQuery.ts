'use client';

import { useEffect, useState } from 'react';

/** ウィンドウ幅が指定 px 以下かどうかを返す（サーバーサイドは false） */
export function useMediaQuery(maxWidthPx: number): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(`(max-width: ${maxWidthPx}px)`).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${maxWidthPx}px)`);

    function handler(e: MediaQueryListEvent) {
      setMatches(e.matches);
    }

    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [maxWidthPx]);

  return matches;
}
