import { test, expect } from '@playwright/test';

// smoke（Emulator 不要）。ログイン後の表示は tests/e2e/unavailability/unavailability-view.spec.ts で確認する
test('対応不可時間ページは未認証だとログインへリダイレクトする', async ({ page }) => {
  await page.goto('/unavailability');
  await expect(page).toHaveURL(/login/);
});
