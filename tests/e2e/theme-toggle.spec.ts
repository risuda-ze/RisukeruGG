import { test, expect } from '@playwright/test';
import { signInWithEmulator } from '../helpers/auth';

/**
 * テーマ切り替え E2E（emulator プロジェクト専用。UI-033〜UI-037）
 *
 * 実行前提: Firebase Emulator 起動済み + node scripts/seed.mjs でシード投入済み
 * 実行方法: pnpm test:e2e --project=emulator tests/e2e/theme-toggle.spec.ts
 */

const TEST_USER = { email: 'taro@example.com', password: 'password123' };

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(
    () =>
      (window as Window & { __firebaseEmulatorsConnected?: boolean })
        .__firebaseEmulatorsConnected === true,
    { timeout: 10000 }
  );
  await signInWithEmulator(page, TEST_USER.email, TEST_USER.password);
});

test('切り替え後にリロード・別端末相当でも選択が維持され、system は OS 設定に追従する', async ({
  page,
}) => {
  const html = page.locator('html');
  const toggle = (label: string) =>
    page.getByRole('button', { name: `テーマ: ${label}（押して切り替え）` });

  await page.goto('/schedule');
  await expect(toggle('ダーク')).toBeVisible({ timeout: 10000 });
  await expect(html).toHaveAttribute('data-theme', 'dark');

  // ダーク → ライト
  await toggle('ダーク').click();
  await expect(html).toHaveAttribute('data-theme', 'light');

  // リロードしても維持（localStorage）
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'light');

  // localStorage を消しても users/{uid}.theme から復元される（別端末でのログイン相当）
  await page.evaluate(() => localStorage.removeItem('risukeru-theme'));
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'light', { timeout: 10000 });

  // ライト → 端末に合わせる: OS 設定に追従
  await toggle('ライト').click();
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(html).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(html).toHaveAttribute('data-theme', 'dark');

  // 端末に合わせる → ダーク（シードユーザーの状態を既定に戻す）
  await toggle('端末に合わせる').click();
  await expect(toggle('ダーク')).toBeVisible();
});
