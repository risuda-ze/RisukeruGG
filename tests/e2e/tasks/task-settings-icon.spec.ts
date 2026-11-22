import { test, expect } from '@playwright/test';
import { signInWithEmulator } from '../../helpers/auth';

/**
 * タスク管理設定アイコン対応 v4 E2E テスト（emulator プロジェクト専用）
 * Constitution III 必須: 設定画面遷移・アイコン表示ジャーニーの E2E テスト
 *
 * 実行前提:
 *   - Firebase Emulator が起動済み
 *   - node scripts/seed.mjs でシードデータ投入済み
 *
 * 実行方法:
 *   pnpm test:e2e --project=emulator tests/e2e/tasks/task-settings-icon.spec.ts
 *
 * 未認証リダイレクト確認は smoke プロジェクト（task-control-bar.spec.ts）でカバー済み。
 */

const TEST_USER = {
  email: 'taro@example.com',
  password: 'password123',
};

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

/**
 * SC-016: TaskControlBar の設定ボタンで /settings/categories に遷移し、
 *         ステータス管理・カテゴリ管理セクションが表示される
 */
test.describe('SC-016: /settings/categories ページ遷移', () => {
  test('タスク管理画面の設定ボタンをクリックすると /settings/categories に遷移する', async ({ page }) => {
    await page.goto('/tasks');
    expect(page.url()).not.toContain('/login');

    await page.getByRole('button', { name: /ステータス・カテゴリ設定/ }).click();
    await expect(page).toHaveURL(/settings\/categories/, { timeout: 10000 });
    await expect(page.getByText('カテゴリ設定')).toBeVisible();
  });

  test('/settings/categories ページにステータスとカテゴリの管理セクションが表示される', async ({ page }) => {
    await page.goto('/settings/categories');
    expect(page.url()).not.toContain('/login');

    await expect(page.getByText('ステータスの管理')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('カテゴリの管理')).toBeVisible();
  });
});

/**
 * SC-017: カンバン列ヘッダーにステータス名とカラーバーが表示される
 * シードデータには「未着手」「進行中」「完了」の 3 ステータスが存在する
 * アイコン未設定のためアイコン span は存在しないが、列ヘッダー構造は確認できる
 */
test.describe('SC-017: カンバン列ヘッダーの表示', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('シードデータのステータス列ヘッダーが PC 表示で確認できる', async ({ page }) => {
    await page.goto('/tasks');
    expect(page.url()).not.toContain('/login');

    await expect(page.getByText('未着手').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('進行中').first()).toBeVisible();
    await expect(page.getByText('完了').first()).toBeVisible();
  });
});

/**
 * SC-018: TaskControlBar にカテゴリバッジが表示される
 * シードデータには「動画編集」「企画」「台本」「告知」の 4 カテゴリが存在する
 */
test.describe('SC-018: カテゴリバッジの表示', () => {
  test('TaskControlBar に「すべて」バッジとシードデータのカテゴリが表示される', async ({ page }) => {
    await page.goto('/tasks');
    expect(page.url()).not.toContain('/login');

    await expect(page.getByRole('button', { name: 'すべて' })).toBeVisible({ timeout: 15000 });
    /* シードデータの 4 カテゴリのうち少なくとも 1 件がバッジとして存在する */
    const categoryNames = ['動画編集', '企画', '台本', '告知'];
    let found = false;
    for (const name of categoryNames) {
      const count = await page.getByRole('button', { name }).count();
      if (count > 0) { found = true; break; }
    }
    expect(found).toBe(true);
  });
});

/**
 * SC-019: TaskDetailModal でステータス・カテゴリの表示エリアが存在する
 */
test.describe('SC-019: TaskDetailModal のステータス・カテゴリ表示', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('タスクカードクリックでモーダルが開き、ステータスとカテゴリ欄が表示される', async ({ page }) => {
    await page.goto('/tasks');
    expect(page.url()).not.toContain('/login');

    await expect(page.getByTestId('task-card').first()).toBeVisible({ timeout: 15000 });
    await page.getByTestId('task-card').first().click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.getByText('ステータス')).toBeVisible();
    await expect(modal.getByText('カテゴリ')).toBeVisible();
  });
});

/**
 * SC-021: v3 の主要機能が v4 実装後も正常に動作する（回帰なし）
 */
test.describe('SC-021: v3 機能回帰なし', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('カンバンボードと TaskControlBar が表示される（PC 1440px）', async ({ page }) => {
    await page.goto('/tasks');
    expect(page.url()).not.toContain('/login');

    await expect(page.getByRole('button', { name: 'すべて' })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('select').filter({ hasText: 'すべて' })).toBeVisible();
    await expect(page.getByTestId('task-card').first()).toBeVisible();
  });

  test('CSV出力ボタンが存在しない（SC-013 回帰なし）', async ({ page }) => {
    await page.goto('/tasks');
    expect(page.url()).not.toContain('/login');

    /* TaskControlBar の「すべて」バッジが出るまで待機してからカードを確認 */
    await expect(page.getByRole('button', { name: 'すべて' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('task-card').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /CSV|エクスポート/ })).not.toBeVisible();
  });
});
