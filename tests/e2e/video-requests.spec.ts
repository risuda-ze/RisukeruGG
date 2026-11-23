import { test, expect } from '@playwright/test';
import { signInWithEmulator } from '../helpers/auth';

test('動画依頼のチーム設定と初稿・完パケの入力順を確認できる', async ({ page }) => {
  await page.goto('/login');
  await signInWithEmulator(page, 'taro@example.com', 'password123');
  await page.goto('/settings/categories');
  await expect(page.getByRole('combobox', { name: '納品確認待ち' })).toBeEnabled();
  await expect(page.getByLabel('サムネ制作も依頼する')).toBeEnabled();

  await page.goto('/video-requests');
  await page.getByRole('button', { name: '動画を依頼する' }).click();
  await page.getByLabel('編集開始日').fill('2026-12-10');
  await page.getByLabel('初稿納期').fill('2026-12-09');
  await page.getByLabel('完パケ納期').fill('2026-12-11');
  await expect(page.getByText('初稿納期は編集開始日以降の日付を指定してください')).toBeVisible();
  const submit = page.getByRole('button', { name: '依頼を作成してDiscordへ送る' });
  await expect(submit).toBeDisabled();
  await page.getByLabel('初稿納期').fill('2026-12-10');
  await expect(submit).toBeEnabled();
});
