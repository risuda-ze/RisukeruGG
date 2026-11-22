import type { ThemePreference } from '@/types/entities';

/** 切り替えボタンを押したときの巡回順（UI-035） */
const THEME_ORDER: readonly ThemePreference[] = ['dark', 'light', 'system'];

/** 3 値以外（未設定・不正値）は null（未設定扱い） */
export function parseThemePreference(value: unknown): ThemePreference | null {
  return THEME_ORDER.includes(value as ThemePreference) ? (value as ThemePreference) : null;
}

export function nextThemePreference(current: ThemePreference): ThemePreference {
  return THEME_ORDER[(THEME_ORDER.indexOf(current) + 1) % THEME_ORDER.length];
}
