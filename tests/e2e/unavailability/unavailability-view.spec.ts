import { test, expect } from '@playwright/test';
import { signInWithEmulator } from '../../helpers/auth';

/**
 * 対応不可時間の閲覧 E2E（emulator プロジェクト専用）
 *
 * 実行前提:
 *   - Firebase Emulator が起動済み（pnpm emulators）
 *   - node scripts/seed.mjs でシードデータ投入済み（対応不可は実行日基準で入る）
 *
 * 実行方法:
 *   pnpm test:e2e:emulator tests/e2e/unavailability/unavailability-view.spec.ts
 */

const TEST_USER = { email: 'taro@example.com', password: 'password123', displayName: '配信太郎' };

/** JST の当日（`yyyy-mm-dd`）。シードと画面が同じ基準で使う */
const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());

test.use({ viewport: { width: 1440, height: 900 } });

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(
    () =>
      (window as Window & { __firebaseEmulatorsConnected?: boolean })
        .__firebaseEmulatorsConnected === true,
    { timeout: 10000 }
  );
  await signInWithEmulator(page, TEST_USER.email, TEST_USER.password);
  await page.goto('/unavailability');
});

test('① 一覧が開き、自分の行が最上段にある（UN-050, UN-052）', async ({ page }) => {
  const rows = page.getByTestId('un-member-row');
  await expect(rows.first()).toBeVisible({ timeout: 15000 });

  // シードの teamAlpha は 6 人。自分（配信太郎）が先頭
  await expect(rows).toHaveCount(6);
  await expect(rows.first()).toContainText(TEST_USER.displayName);
  await expect(rows.first()).toContainText('自分');

  // 当日の列が表示され、シードした自分の対応不可が × で出る
  const myToday = rows.first().locator(`[data-testid="un-cell"][data-date="${today}"]`);
  await expect(myToday).toBeVisible();
  await expect(myToday).toHaveText('×');

  // ヘッダー（検索条件）は折り畳まれている（UN-041）
  await expect(page.getByRole('button', { name: '検索条件' })).toHaveAttribute(
    'aria-expanded',
    'false'
  );
});

test('② セルをクリックするとメンバー詳細が開き、シードした不可時間帯が赤く出る（UN-060）', async ({
  page,
}) => {
  const myToday = page
    .getByTestId('un-member-row')
    .first()
    .locator(`[data-testid="un-cell"][data-date="${today}"]`);
  await expect(myToday).toBeVisible({ timeout: 15000 });
  await myToday.click();

  const detail = page.getByTestId('un-detail');
  await expect(detail).toBeVisible();
  await expect(detail).toContainText(`${TEST_USER.displayName} の対応不可`);

  // シード: 当日 20〜24 時が対応不可、19 時は空き
  const hour = (h: number) =>
    detail.locator(`[data-testid="un-hour"][data-date="${today}"][data-hour="${h}"]`);
  await hour(20).scrollIntoViewIfNeeded();
  await expect(hour(20)).toHaveAttribute('data-unavailable', 'true');
  await expect(hour(20)).toContainText('対応不可');
  await expect(hour(19)).toHaveAttribute('data-unavailable', 'false');

  // 対応不可の行は danger 色で塗られ、空きの行は塗られない
  const fill = (h: number) =>
    hour(h)
      .locator('div')
      .last()
      .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(await fill(20)).not.toBe('rgba(0, 0, 0, 0)');
  expect(await fill(19)).toBe('rgba(0, 0, 0, 0)');
});
