'use client';

import { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { db } from '@/lib/firebase/client';
import { nextThemePreference, parseThemePreference } from '@/lib/utils/theme';
import { useAuthStore } from '@/stores/auth';
import { Icon, type IconName } from '@/components/ui/Icon';
import { cn } from '@/lib/utils/cn';
import type { ThemePreference } from '@/types/entities';

const THEME_LABELS: Record<ThemePreference, { label: string; icon: IconName }> = {
  dark: { label: 'ダーク', icon: 'dark_mode' },
  light: { label: 'ライト', icon: 'light_mode' },
  system: { label: '端末に合わせる', icon: 'computer' },
};

const noopSubscribe = () => () => {};

/** テーマ切り替えボタン（UI-035）。押すたびに ダーク → ライト → 端末に合わせる */
export function ThemeToggle({
  collapsed = false,
  className,
}: {
  collapsed?: boolean;
  className?: string;
}) {
  const { theme, setTheme } = useTheme();
  // サーバーでは選択がわからないため、マウント後にだけ現在の選択を出す
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
  const current = (mounted && parseThemePreference(theme)) || 'dark';
  const { label, icon } = THEME_LABELS[current];

  function handleClick() {
    const next = nextThemePreference(current);
    setTheme(next);
    const uid = useAuthStore.getState().currentUser?.uid;
    if (!uid) return;
    // 失敗しても表示は切り替えたまま（UI-036）
    updateDoc(doc(db, 'users', uid), { theme: next }).catch(() => {
      toast.error('テーマの保存に失敗しました');
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`テーマ: ${label}（押して切り替え）`}
      className={cn(
        'flex w-full items-center rounded-sm text-text-2 transition-colors hover:bg-surface-2 hover:text-text',
        collapsed ? 'justify-center py-2' : 'gap-3 px-3 py-2.5',
        className
      )}
    >
      <Icon name={icon} size={18} />
      {!collapsed && <span className="whitespace-nowrap text-sm font-medium">テーマ: {label}</span>}
    </button>
  );
}
