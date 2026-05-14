import { test, expect } from '@playwright/test';

test.describe('スケジュール管理ジャーニー', () => {
  test.beforeEach(async ({ page }) => {
    // Firebase Emulator でのテストセットアップが必要
    // TODO: Emulatorの認証UIでテストユーザーを作成してサインイン
    await page.goto('/login');
  });

  test('スケジュールページが表示される（未認証はリダイレクト）', async ({ page }) => {
    await page.goto('/schedule');
    await expect(page).toHaveURL(/login/);
  });
});
