/**
 * 各ページ表示確認テスト
 *
 * シードデータ（3人チーム）が投入された状態で各ページが
 * 正しく表示されることを確認する。
 *
 * 実行前提:
 *   - Docker コンテナ (emulator / app) が起動済み
 *   - node scripts/seed.mjs でシードデータ投入済み
 *
 * 実行方法:
 *   pnpm test:e2e --project=chromium tests/e2e/visual.spec.ts
 */
import { test, expect } from '@playwright/test';
import { signInWithEmulator } from '../helpers/auth';

const TEST_USER = {
  email: 'taro@example.com',
  password: 'password123',
};

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
test.describe('各ページ表示確認 (3人チーム)', () => {
  // ── ダッシュボード ─────────────────────────────────────────
  test('ダッシュボードが表示される', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('今月の配信数')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('チームメンバー')).toBeVisible();
    await expect(page.getByText('配信太郎')).toBeVisible();
    await expect(page.getByText('編集花子')).toBeVisible();
    await expect(page.getByText('視聴者三郎')).toBeVisible();
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

  // ── タスク (カンバン) ──────────────────────────────────────
  test('タスクボードが表示される', async ({ page }) => {
    await page.goto('/tasks');
    await expect(page.getByText('未着手')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('進行中')).toBeVisible();
    await expect(page.getByText('完了')).toBeVisible();
    await expect(page.getByText('サムネイル制作')).toBeVisible();
    await page.screenshot({ path: 'screenshots/tasks.png', fullPage: true });
  });

  // ── チーム管理 ─────────────────────────────────────────────
  test('チーム管理が表示される', async ({ page }) => {
    await page.goto('/team');
    await expect(page.getByText('配信太郎')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('編集花子')).toBeVisible();
    await expect(page.getByText('視聴者三郎')).toBeVisible();
    await page.screenshot({ path: 'screenshots/team.png', fullPage: true });
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
