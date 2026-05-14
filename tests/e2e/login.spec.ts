import { test, expect } from '@playwright/test';

test.describe('ログインジャーニー', () => {
  test('ログインページが表示される', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Googleでサインイン')).toBeVisible();
  });

  test('未認証ユーザーはダッシュボードにアクセスできない', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/);
  });
});
