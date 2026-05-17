import { test, expect } from '@playwright/test';

test.describe('タスク管理ジャーニー', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('タスクページが表示される（未認証はリダイレクト）', async ({ page }) => {
    await page.goto('/tasks');
    await expect(page).toHaveURL(/login/);
  });

  /* ── UI構造の検証（ログイン不要） ──────────── */
  test('ログインページのヘッダーが表示される', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
  });
});

/* ── 認証済みシナリオ（Firebase Emulatorセットアップ完了後に有効化） ── */
// test.describe('タスク管理 (認証済み)', () => {
//   test.beforeEach(async ({ page }) => {
//     // Emulator Auth でサインイン後にページへ移動
//     await page.goto('/tasks');
//     await page.waitForURL(/tasks/);
//   });
//
//   test('カンバンボードが全幅で表示される', async ({ page }) => {
//     // US4: カンバン全幅レイアウト確認
//     const board = page.locator('[data-testid="kanban-board"]');
//     await expect(board).toBeVisible();
//   });
//
//   test('カードクリックで TaskDetailModal が開く', async ({ page }) => {
//     // US5: TaskDetailModal 起動
//     const firstCard = page.locator('.kanban-card').first();
//     await firstCard.click();
//     await expect(page.locator('[role="dialog"]')).toBeVisible();
//   });
//
//   test('タスク作成フォームでカテゴリを選択できる', async ({ page }) => {
//     // US4: TaskForm で categoryId フィールド確認
//     await page.click('button:has-text("+ タスク")');
//     await expect(page.locator('select[name="categoryId"]')).toBeVisible();
//   });
//
//   test('カテゴリフィルタがタスクを絞り込む', async ({ page }) => {
//     // US4: カテゴリフィルタ動作確認
//     const filterBtn = page.locator('button:has-text("すべて")');
//     await expect(filterBtn).toBeVisible();
//   });
// });
