'use client';

import { useState } from 'react';

/** ヒントバーの非表示状態を localStorage で永続化するフック */
export function useHintDismiss(key: string) {
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(key) !== '1';
  });

  function dismiss() {
    if (typeof window !== 'undefined') localStorage.setItem(key, '1');
    setVisible(false);
  }

  function show() {
    if (typeof window !== 'undefined') localStorage.removeItem(key);
    setVisible(true);
  }

  return { visible, dismiss, show };
}
