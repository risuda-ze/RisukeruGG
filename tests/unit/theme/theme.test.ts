import { describe, expect, it } from 'vitest';
import { nextThemePreference, parseThemePreference } from '@/lib/utils/theme';

describe('nextThemePreference', () => {
  it('ダーク → ライト → 端末に合わせる → ダーク の順に巡回する', () => {
    expect(nextThemePreference('dark')).toBe('light');
    expect(nextThemePreference('light')).toBe('system');
    expect(nextThemePreference('system')).toBe('dark');
  });
});

describe('parseThemePreference', () => {
  it('3 値はそのまま返す', () => {
    expect(parseThemePreference('dark')).toBe('dark');
    expect(parseThemePreference('light')).toBe('light');
    expect(parseThemePreference('system')).toBe('system');
  });

  it('3 値以外は未設定（null）として扱う', () => {
    for (const v of [undefined, null, '', 'Dark', 'blue', 1, {}]) {
      expect(parseThemePreference(v)).toBeNull();
    }
  });
});
