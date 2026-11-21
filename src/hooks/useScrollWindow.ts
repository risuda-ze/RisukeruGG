'use client';

import { useEffect, useState } from 'react';

/**
 * スクロール領域の、スクロール量と表示領域の大きさ（仮想スクロール用）。
 * 返り値の `setEl` をスクロールする要素の ref に渡す。計測前の `win` は null で、
 * 計測は ResizeObserver の初回通知で行う。
 * 要素を state で持つのは、ポータル内など後から描画される要素にも追従するため。
 */
export function useScrollWindow(horizontal: boolean) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [win, setWin] = useState<{ offset: number; size: number } | null>(null);

  useEffect(() => {
    if (!el) return;
    const read = () =>
      setWin({
        offset: horizontal ? el.scrollLeft : el.scrollTop,
        size: horizontal ? el.clientWidth : el.clientHeight,
      });
    el.addEventListener('scroll', read, { passive: true });
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', read);
      observer.disconnect();
    };
  }, [el, horizontal]);

  return { el, setEl, win };
}
