import { test, expect } from '@playwright/test';

/**
 * タスク管理設定アイコン対応 v4 E2E テスト
 * Constitution III 必須: 設定画面遷移・アイコン表示ジャーニーの E2E テスト
 *
 * 注意: 認証済み環境（Firebase Emulator）でのみフル実行可能。
 * 現時点では UI 構造確認（ページ存在・DOM 構造）を主体とする。
 */

/**
 * SC-016: `/settings/tasks` ページが存在し、設定ボタンから遷移できる
 * 未認証の場合はログインにリダイレクトされることを確認する。
 */
test.describe('SC-016: /settings/tasks ページ存在確認', () => {
  test('未認証で /settings/tasks にアクセスするとログインにリダイレクトされる', async ({ page }) => {
    await page.goto('/settings/tasks');
    await expect(page).toHaveURL(/login/);
  });

  test('未認証で /tasks にアクセスするとログインにリダイレクトされる（設定ボタン前提確認）', async ({ page }) => {
    await page.goto('/tasks');
    await expect(page).toHaveURL(/login/);
  });

  /**
   * 認証済みシナリオ: タスク管理画面の設定ボタンで /settings/tasks に遷移する。
   * Firebase Emulator 接続後に有効化すること。
   */
  // test('タスク管理画面の設定ボタンをクリックすると /settings/tasks に遷移する (SC-016)', async ({ page }) => {
  //   await page.goto('/tasks');
  //   await page.waitForURL(/tasks/);
  //   // 設定ボタンをクリック
  //   await page.getByRole('button', { name: '設定' }).click();
  //   await expect(page).toHaveURL(/settings\/tasks/);
  //   // タスク管理設定のページタイトルが表示される
  //   await expect(page.getByText('タスク管理設定')).toBeVisible();
  // });
});

/**
 * SC-017: カンバン列ヘッダーにステータスアイコンが表示される
 * アイコン付きステータスのカンバン列ヘッダーにアイコン要素が存在することを確認。
 */
test.describe('SC-017: カンバン列ヘッダーのアイコン表示', () => {
  /**
   * 認証済みシナリオ: アイコンが設定されたステータスの列ヘッダーにアイコンが表示される。
   * Firebase Emulator 接続後に有効化すること。
   */
  // test.use({ viewport: { width: 1440, height: 900 } });
  // test('アイコン付きステータスの列ヘッダーに material-icons が表示される (SC-017)', async ({ page }) => {
  //   await page.goto('/tasks');
  //   await page.waitForURL(/tasks/);
  //   // /settings/tasks でステータスにアイコンを設定済みの環境で実行すること
  //   // カンバン列ヘッダー内の material-icons span が存在することを確認
  //   const columnHeaders = page.locator('[aria-label*="のメニュー"]').locator('..');
  //   const firstHeader = columnHeaders.first();
  //   await expect(firstHeader.locator('.material-icons')).toBeVisible();
  // });
});

/**
 * SC-018: カテゴリバッジにアイコンが表示される
 * TaskControlBar のカテゴリバッジと TaskCard のカテゴリチップにアイコンが表示されることを確認。
 */
test.describe('SC-018: カテゴリバッジのアイコン表示', () => {
  /**
   * 認証済みシナリオ: アイコンが設定されたカテゴリのバッジにアイコンが表示される。
   * Firebase Emulator 接続後に有効化すること。
   */
  // test('TaskControlBar のカテゴリバッジにアイコンが表示される (SC-018)', async ({ page }) => {
  //   await page.goto('/tasks');
  //   await page.waitForURL(/tasks/);
  //   // /settings/tasks でカテゴリにアイコンを設定済みの環境で実行すること
  //   // TaskControlBar のカテゴリバッジ内に material-icons が存在する
  //   const categoryBadges = page.locator('button[class*="rounded-full"]').filter({ hasText: /.+/ });
  //   const firstBadge = categoryBadges.first();
  //   await expect(firstBadge.locator('.material-icons')).toBeVisible();
  // });
});

/**
 * SC-019: TaskDetailModal でステータス・カテゴリのアイコンが表示される
 */
test.describe('SC-019: TaskDetailModal のアイコン表示', () => {
  /**
   * 認証済みシナリオ: タスクカードクリックで詳細モーダルが開き、アイコン表示エリアが存在する。
   * Firebase Emulator 接続後に有効化すること。
   */
  // test('タスク詳細モーダルでステータス・カテゴリ選択エリアが存在する (SC-019)', async ({ page }) => {
  //   await page.goto('/tasks');
  //   await page.waitForURL(/tasks/);
  //   // タスクカードをクリックして詳細モーダルを開く
  //   await page.locator('.tcard').first().click();
  //   // ステータス・カテゴリのラベルが存在することを確認
  //   await expect(page.getByText('ステータス')).toBeVisible();
  //   await expect(page.getByText('カテゴリ')).toBeVisible();
  //   // アイコン設定済みの場合は material-icons が表示される
  //   // await expect(page.locator('.material-icons').first()).toBeVisible();
  // });
});

/**
 * SC-021: v3 の主要機能の回帰なし確認
 */
test.describe('SC-021: v3 機能回帰なし', () => {
  test('未認証で /tasks にアクセスするとログインにリダイレクトされる（回帰なし確認）', async ({ page }) => {
    await page.goto('/tasks');
    await expect(page).toHaveURL(/login/);
  });

  /**
   * 認証済みシナリオ: v3 の主要機能が引き続き動作することを確認。
   * Firebase Emulator 接続後に有効化すること。
   */
  // test('カンバンボードが表示される（PC 1440px）(SC-021)', async ({ page }) => {
  //   test.use({ viewport: { width: 1440, height: 900 } });
  //   await page.goto('/tasks');
  //   await page.waitForURL(/tasks/);
  //   // カンバンボードが表示される
  //   await expect(page.locator('.md\\:block')).toBeVisible();
  //   // TaskControlBar が表示される（「すべて」バッジ）
  //   await expect(page.getByRole('button', { name: 'すべて' })).toBeVisible();
  //   // 担当者プルダウンが存在する
  //   await expect(page.getByRole('combobox', { name: '担当者でフィルタ' })).toBeVisible();
  // });

  // test('/settings/tasks ページが正常に表示される (SC-021)', async ({ page }) => {
  //   await page.goto('/settings/tasks');
  //   await page.waitForURL(/settings\/tasks/);
  //   await expect(page.getByText('ステータスの管理')).toBeVisible();
  //   await expect(page.getByText('カテゴリの管理')).toBeVisible();
  // });
});
