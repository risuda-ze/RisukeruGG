/**
 * 各ページ表示確認テスト
 *
 * シードデータ（複数チーム・複数メンバー）が投入された状態で各ページが
 * 正しく表示されることを確認する。
 *
 * 実行前提:
 *   - Firebase Emulator (pnpm emulators) と開発サーバー (pnpm dev) が起動済み
 *   - node scripts/seed.mjs でシードデータ投入済み
 *
 * 実行方法:
 *   pnpm test:e2e --project=emulator tests/e2e/visual.spec.ts
 */
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { signInWithEmulator } from '../helpers/auth';

const TEST_USER = {
  email: 'taro@example.com',
  password: 'password123',
};

async function switchToTeam(page: Page, targetTeamName: string, expectedTeamCode: string) {
  await page.getByRole('tab', { name: 'チーム', exact: true }).click();
  const info = page.getByRole('main').locator('dl');
  await expect(info).toBeVisible();
  if (!(await info.getByText(expectedTeamCode, { exact: true }).isVisible())) {
    await page.getByTestId('team-switcher').press('Enter');
    await page.getByRole('button', { name: new RegExp(targetTeamName) }).last().click();
  }
  await expect(info.getByText(expectedTeamCode, { exact: true })).toBeVisible();
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
    /* StatCard はチームデータ読み込み後に描画されるため、タイムアウトを長めに設定 */
    await expect(page.getByText('今月の配信数')).toBeVisible({ timeout: 25000 });
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

  test('Google カレンダーへの書き出しボタンが表示され、メンバーの予定・接続バナーは出ない', async ({ page }) => {
    await page.goto('/team');
    await switchToTeam(page, '配信チームα', 'ALPHA001');

    await page.goto('/schedule');

    await expect(page.getByRole('button', { name: 'Google カレンダーに書き出す' })).toBeVisible();
    /* 未書き出しのチームでは最終書き出し日時を出さない */
    await expect(page.getByText('最終書き出し')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /メンバーの予定|メンバー表示中/ })).toHaveCount(0);
    await expect(page.getByText(/Googleカレンダーに接続|認証が切れています/)).toHaveCount(0);
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

    await switchToTeam(page, '編集チームβ', 'BETA002');
    await switchToTeam(page, '配信チームα', 'ALPHA001');

    await expect(page.getByRole('main').getByText('配信チームα')).toBeVisible();
    await expect(page.getByText('ALPHA001')).toBeVisible();
    await expect(page.locator('text=BETA002')).toHaveCount(0);
    await page.getByRole('tab', { name: 'メンバー・スタッフ' }).click();
    await expect(page.getByText('マネージャー健太')).toBeVisible();
    await expect(page.getByText('ROM三郎')).toBeVisible();
  });

  // ── コラボ ────────────────────────────────────────────────
  test('コラボが表示される', async ({ page }) => {
    await page.goto('/collabs');
    await page.waitForTimeout(3000);
    expect(page.url()).not.toContain('/login');
    await page.screenshot({ path: 'screenshots/collabs.png', fullPage: true });
  });

  // ── 設定（カテゴリ設定） ──────────────────────────────────
  test('設定が表示される', async ({ page }) => {
    await page.goto('/settings/categories');
    await page.waitForTimeout(3000);
    expect(page.url()).not.toContain('/login');
    await page.screenshot({ path: 'screenshots/settings.png', fullPage: true });
  });
});
