import { test, expect } from '@playwright/test';

test.describe('LPページ', () => {
  test('ユースケース重視の訴求が表示される', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1, name: /配信前の連絡と調整を/ })).toBeVisible();

    await expect(page.getByRole('link', { name: '活用例' })).toHaveAttribute('href', '#usecases');
    await expect(page.getByRole('heading', { level: 2, name: /想像しやすいユースケース/ })).toBeVisible();
    await expect(page.getByText('個人配信者')).toBeVisible();
    await expect(page.getByText('コラボ多めの配信者')).toBeVisible();
    await expect(page.getByText('管理のための時間を減らして')).toBeVisible();
  });
});
