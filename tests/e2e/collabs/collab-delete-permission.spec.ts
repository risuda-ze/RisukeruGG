import { test, expect, type Page } from '@playwright/test';
import { signInWithEmulator } from '../../helpers/auth';

/**
 * コラボ一覧の削除ボタンはメンバーだけに出す（CO-031）。
 * Emulator + シード（scripts/seed.mjs）が必要。データは変更しない。
 */

const PC_VIEWPORT = { width: 1440, height: 900 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };

async function openCollabsAs(page: Page, email: string) {
  await page.goto('/');
  await page.waitForFunction(
    () =>
      (window as Window & { __firebaseEmulatorsConnected?: boolean })
        .__firebaseEmulatorsConnected === true,
    { timeout: 10000 }
  );
  await signInWithEmulator(page, email, 'password123');
  await page.goto('/collabs');
  await expect(page.getByTestId('collab-board')).toBeVisible({ timeout: 15000 });
}

for (const viewport of [
  { name: 'PC', size: PC_VIEWPORT },
  { name: 'モバイル', size: MOBILE_VIEWPORT },
]) {
  for (const user of [
    { role: 'スタッフ', email: 'kenta@example.com', deleteCount: 0 },
    { role: 'メンバー', email: 'taro@example.com', deleteCount: 1 },
  ]) {
    test(`${viewport.name}: ${user.role}の一覧の行の削除ボタン`, async ({ page }) => {
      await page.setViewportSize(viewport.size);
      await openCollabsAs(page, user.email);
      // シードの collab006（open・参加者あり。モバイルのカードも削除ボタンを出す条件を満たす）
      await expect(page.getByText('回答つきコラボ調整').first()).toBeVisible({ timeout: 10000 });
      const deletes = page.getByTestId('collab-board').locator('[title="削除"]');
      if (user.deleteCount === 0) await expect(deletes).toHaveCount(0);
      else await expect(deletes.first()).toBeVisible();
    });
  }
}
