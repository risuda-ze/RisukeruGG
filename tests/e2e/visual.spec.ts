/**
 * 各ページ表示確認テスト
 *
 * シードデータ（複数チーム・複数オペレーター）が投入された状態で各ページが
 * 正しく表示されることを確認する。
 *
 * 実行前提:
 *   - Docker コンテナ (emulator / app) が起動済み
 *   - node scripts/seed.mjs でシードデータ投入済み
 *
 * 実行方法:
 *   pnpm test:e2e --project=emulator tests/e2e/visual.spec.ts
 */
import { test, expect } from '@playwright/test';
import { signInWithEmulator } from '../helpers/auth';

const TEST_USER = {
  email: 'taro@example.com',
  password: 'password123',
};

async function switchToTeam(
  page: Parameters<typeof test.beforeEach>[0]['page'],
  targetTeamName: string,
  expectedTeamCode: string
) {
  if (await page.getByText(expectedTeamCode).count()) {
    return;
  }

  const switcher = page.getByRole('button', { name: /swap_horiz/ });
  await switcher.click();
  await page
    .getByRole('button', { name: new RegExp(targetTeamName) })
    .last()
    .click();
  await expect(page.getByText(expectedTeamCode)).toBeVisible({ timeout: 15000 });
}

// ── 各テストでサインイン（IndexedDB が browser context 間で共有されないため） ──
test.beforeEach(async ({ page }) => {
  // Firebase SDK が初期化・Emulator 接続される任意のページに移動
  await page.goto('/');
  await page.waitForFunction(
    () =>
      (window as Window & { __firebaseEmulatorsConnected?: boolean })
        .__firebaseEmulatorsConnected === true,
    { timeout: 10000 }
  );
  await signInWithEmulator(page, TEST_USER.email, TEST_USER.password);
});

// ─── テストスイート ──────────────────────────────────────────
test.describe('各ページ表示確認 (シードデータ)', () => {
  // ── ダッシュボード ─────────────────────────────────────────
  test('ダッシュボードが表示される', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('今月の配信数')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('チームメンバー')).toBeVisible();
    await expect(page.getByText('配信太郎').first()).toBeVisible();
    await expect(page.getByText('運営花子').first()).toBeVisible();
    await expect(page.getByText('サポート里奈').first()).toBeVisible();
    await page.screenshot({ path: 'screenshots/dashboard.png', fullPage: true });
  });

  // ── スケジュール ───────────────────────────────────────────
  test('スケジュールが表示される', async ({ page }) => {
    await page.goto('/schedule');
    await page.waitForTimeout(3000);
    // ログインリダイレクトされていない ＝ 認証成功
    expect(page.url()).not.toContain('/login');
    await page.screenshot({ path: 'screenshots/schedule.png', fullPage: true });
  });

  test('メンバーの予定トグルが表示され、ON に切り替えられる', async ({ page }) => {
    await page.goto('/team');
    await switchToTeam(page, '配信チームα', 'ALPHA001');

    await page.goto('/schedule');

    const memberToggle = page.getByRole('button', { name: 'メンバーの予定' });
    await expect(memberToggle).toBeVisible();

    await memberToggle.click();
    await expect(memberToggle).toHaveClass(/text-\[#60a5fa\]/);
  });

  // ── タスク (カンバン) ──────────────────────────────────────
  test('タスクボードが表示される', async ({ page }) => {
    await page.goto('/tasks');
    expect(page.url()).not.toContain('/login');
    await expect(page.getByText('タスク管理').first()).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: 'screenshots/tasks.png', fullPage: true });
  });

  // ── チーム管理 ─────────────────────────────────────────────
  test('チーム管理が表示される', async ({ page }) => {
    await page.goto('/team');
    await expect(page.getByText('配信太郎').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('運営花子').first()).toBeVisible();
    await expect(page.getByText('サポート里奈').first()).toBeVisible();
    await page.screenshot({ path: 'screenshots/team.png', fullPage: true });
  });

  test('チームを切り替えるとチーム名とメンバー一覧が新チームへ更新される', async ({ page }) => {
    await page.goto('/team');

    await switchToTeam(page, '配信チームα', 'ALPHA001');

    await expect(page.getByRole('main').getByText('配信チームα')).toBeVisible();
    await expect(page.getByText('ALPHA001')).toBeVisible();
    await expect(page.getByText('マネージャー健太')).toBeVisible();
    await expect(page.getByText('ROM三郎')).toBeVisible();
    await expect(page.locator('text=BETA002')).toHaveCount(0);
  });

  // ── コラボ ────────────────────────────────────────────────
  test('コラボが表示される', async ({ page }) => {
    await page.goto('/collabs');
    await page.waitForTimeout(3000);
    expect(page.url()).not.toContain('/login');
    await page.screenshot({ path: 'screenshots/collabs.png', fullPage: true });
  });

  // ── 通知 ──────────────────────────────────────────────────
  test('通知が表示される', async ({ page }) => {
    await page.goto('/notifications');
    await page.waitForTimeout(3000);
    expect(page.url()).not.toContain('/login');
    await page.screenshot({ path: 'screenshots/notifications.png', fullPage: true });
  });

  // ── 設定 ──────────────────────────────────────────────────
  test('設定が表示される', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForTimeout(3000);
    expect(page.url()).not.toContain('/login');
    await page.screenshot({ path: 'screenshots/settings.png', fullPage: true });
  });
});
