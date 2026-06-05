import { test, expect } from '@playwright/test';

/**
 * TaskControlBar v3 E2E テスト
 * Constitution III 必須: タスク管理フィルタリングジャーニーの E2E テスト
 *
 * 注意: 認証済み環境（Firebase Emulator）でのみフル実行可能。
 * 現時点では UI 構造確認（DOM存在・非存在）を主体とする。
 */

/**
 * SC-013: CSV出力ボタンが存在しない
 * v3 で廃止されたため、ページ上に CSVエクスポートボタンが存在しないことを確認する。
 */
test.describe('SC-013: CSV出力ボタン廃止確認', () => {
  test('未認証でアクセスするとログインにリダイレクトされる（CSV ボタン検証の前提確認）', async ({ page }) => {
    await page.goto('/tasks');
    await expect(page).toHaveURL(/login/);
  });

  /**
   * 認証済みシナリオ: CSVエクスポートボタンが存在しないことを確認。
   * Firebase Emulator 接続後に有効化すること。
   */
  // test('CSVエクスポートボタンが画面上に存在しない (SC-013)', async ({ page }) => {
  //   // Firebase Emulator Auth でログイン後
  //   await page.goto('/tasks');
  //   await page.waitForURL(/tasks/);
  //   // CSVエクスポートテキストを持つボタンが存在しないことを確認
  //   await expect(page.getByRole('button', { name: /CSV|エクスポート/ })).not.toBeVisible();
  // });
});

/**
 * SC-014: 「ステータス列を追加」ゴーストカラムが存在しない
 * v3 で廃止されたゴーストカラムが DOM から消えていることを確認する。
 */
test.describe('SC-014: ゴーストカラム廃止確認', () => {
  /**
   * 認証済みシナリオ: ゴーストカラムが存在しないことを確認。
   * Firebase Emulator 接続後に有効化すること。
   */
  // test.use({ viewport: { width: 1440, height: 900 } });
  // test('カンバン末尾に「ステータス列を追加」ゴーストカラムが存在しない (SC-014)', async ({ page }) => {
  //   await page.goto('/tasks');
  //   await page.waitForURL(/tasks/);
  //   // ゴーストカラムのテキストが存在しないことを確認
  //   await expect(page.getByText('ステータス列を追加')).not.toBeVisible();
  // });
});

/**
 * SC-011: カテゴリ複数選択 OR 条件フィルタ
 * TaskControlBar でカテゴリバッジを複数クリックし、OR 条件でタスクがフィルタされることを確認。
 */
test.describe('SC-011: カテゴリ複数選択フィルタ', () => {
  /**
   * 認証済みシナリオ: カテゴリバッジを複数クリックしてフィルタ動作を確認。
   * Firebase Emulator 接続後に有効化すること。
   */
  // test.use({ viewport: { width: 1440, height: 900 } });
  // test('カテゴリバッジを複数選択すると OR 条件でタスクがフィルタされる (SC-011)', async ({ page }) => {
  //   await page.goto('/tasks');
  //   await page.waitForURL(/tasks/);
  //
  //   // 「すべて」バッジが初期アクティブ
  //   const allBadge = page.getByRole('button', { name: 'すべて' });
  //   await expect(allBadge).toHaveClass(/bg-purple-d/);
  //
  //   // カテゴリバッジを2つクリック
  //   const categoryBadges = page.locator('[data-testid="category-badge"]');
  //   const firstBadge = categoryBadges.nth(0);
  //   const secondBadge = categoryBadges.nth(1);
  //   await firstBadge.click();
  //   await secondBadge.click();
  //
  //   // 2つのカテゴリバッジがアクティブスタイルになっている
  //   await expect(firstBadge).toHaveClass(/bg-purple-d/);
  //   await expect(secondBadge).toHaveClass(/bg-purple-d/);
  //
  //   // 「すべて」バッジが非アクティブになっている
  //   await expect(allBadge).not.toHaveClass(/bg-purple-d/);
  // });
});

/**
 * SC-012: 担当者プルダウンフィルタ
 * TaskControlBar の担当者 <select> で特定の担当者を選択し、タスクが絞り込まれることを確認。
 */
test.describe('SC-012: 担当者プルダウンフィルタ', () => {
  /**
   * 認証済みシナリオ: 担当者プルダウンでフィルタ動作を確認。
   * Firebase Emulator 接続後に有効化すること。
   */
  // test.use({ viewport: { width: 1440, height: 900 } });
  // test('担当者プルダウンで担当者を選択するとタスクが絞り込まれる (SC-012)', async ({ page }) => {
  //   await page.goto('/tasks');
  //   await page.waitForURL(/tasks/);
  //
  //   // 担当者プルダウンで「すべて」以外を選択
  //   const assigneeSelect = page.getByRole('combobox', { name: /担当者/ });
  //   await assigneeSelect.selectOption({ index: 1 }); // 最初のメンバー
  //
  //   // タスクカードが表示されていれば選択担当者のみ（または空状態）になっている
  //   // 件数が「すべて」選択時より少ないか等しい
  //   const countText = page.locator('text=/\\d+件/');
  //   await expect(countText).toBeVisible();
  // });
});

/**
 * SC-015: タスクカードフッターに締め切り日時が最初に表示される
 * フッターの先頭要素が M/d HH:mm 形式であることを確認。
 */
test.describe('SC-015: タスクカードフッター日時フォーマット', () => {
  /**
   * 認証済みシナリオ: タスクカードフッターの日時フォーマットを確認。
   * Firebase Emulator 接続後に有効化すること。
   */
  // test.use({ viewport: { width: 1440, height: 900 } });
  // test('期限付きタスクカードフッターの先頭要素に M/d HH:mm 形式の日時が表示される (SC-015)', async ({ page }) => {
  //   await page.goto('/tasks');
  //   await page.waitForURL(/tasks/);
  //
  //   // 期限付きタスクカードのフッターを確認
  //   const taskCards = page.locator('.tcard');
  //   await expect(taskCards.first()).toBeVisible();
  //
  //   // フッターの最初の span が M/d HH:mm 形式であることを確認（例: "6/5 14:30"）
  //   const footerFirstSpan = taskCards.first().locator('.flex.items-center.gap-1\\.5 > span').first();
  //   await expect(footerFirstSpan).toHaveText(/^\d+\/\d+ \d{2}:\d{2}$/);
  // });
});

/**
 * TaskControlBar UI 構造確認（認証不要・ログインページベース）
 * ページロードが成功することを確認するスモークテスト。
 */
test.describe('TaskControlBar スモークテスト', () => {
  test('タスクページが未認証でアクセスするとログインページにリダイレクトされる', async ({ page }) => {
    await page.goto('/tasks');
    await expect(page).toHaveURL(/login/);
  });
});
