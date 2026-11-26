import { test, expect } from '@playwright/test';
import { signInWithEmulator } from '../../helpers/auth';
import { selectDropdownOption } from '../../helpers/dropdown';

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
  // タイトルはメンバー名と最終更新（UN-067）
  await expect(detail.getByTestId('un-detail-name')).toHaveText(TEST_USER.displayName);
  await expect(detail.getByTestId('un-detail-updated')).toHaveText('最終更新 今日');

  // シード: 当日 20〜24 時が対応不可、19 時は空き
  const hour = (h: number) =>
    detail.locator(`[data-testid="un-hour"][data-date="${today}"][data-hour="${h}"]`);
  const block = (h: number) => hour(h).getByTestId('un-block');
  await hour(20).scrollIntoViewIfNeeded();
  await expect(hour(20)).toHaveAttribute('data-unavailable', 'true');
  await expect(hour(19)).toHaveAttribute('data-unavailable', 'false');

  // 対応不可の時間は danger 色のブロックで塗られ、空きの時間には無い
  await expect(block(20)).toBeVisible();
  await expect(block(19)).toHaveCount(0);
  expect(await block(20).evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(
    'rgba(0, 0, 0, 0)'
  );

  // 連続する時間は 1 つのブロックにつながる（UN-066）: 20 時の下端と 21 時の上端に隙間が無い
  const box20 = await block(20).boundingBox();
  const box21 = await block(21).boundingBox();
  expect(box20 && box21 && Math.abs(box20.y + box20.height - box21.y)).toBeLessThanOrEqual(1);
});

test('ヘルプボタンを押すと注意事項が出る（UN-043）', async ({ page }) => {
  await expect(page.getByTestId('un-member-row').first()).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'ヘルプを表示' }).click();

  const help = page.getByRole('dialog', { name: '対応不可時間の使い方' });
  await expect(help).toContainText('前月 1 日〜翌月末日');
  await help.getByRole('button', { name: '閉じる' }).click();
  await expect(help).toHaveCount(0);
});

test('時間帯を指定すると、表示中のメンバー全員が対応できる日に「空き」が付く（UN-056）', async ({
  page,
}) => {
  await expect(page.getByTestId('un-member-row').first()).toBeVisible({ timeout: 15000 });
  const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const tomorrow = new Date(
    Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth(), jstNow.getUTCDate() + 1)
  )
    .toISOString()
    .slice(0, 10);
  const dayHead = (date: string) => page.locator(`[data-testid="un-day"][data-date="${date}"]`);

  // 指定前は印が無い
  await expect(page.getByTestId('un-free')).toHaveCount(0);

  // 13:00〜15:00 を指定する
  await page.getByRole('button', { name: '検索条件' }).click();
  const filter = page.locator('#un-filter');
  await selectDropdownOption(filter.locator('[data-slot="dropdown-trigger"]').nth(0), '13:00');
  // 開始だけでは効かない
  await expect(page.getByTestId('un-free')).toHaveCount(0);
  await selectDropdownOption(filter.locator('[data-slot="dropdown-trigger"]').nth(1), '15:00');

  // シード: 当日は誰も 13〜15 時に対応不可が無い。翌日は運営花子が終日対応不可
  await expect(dayHead(today)).toHaveAttribute('data-free', 'true');
  await expect(dayHead(today)).toContainText('空き');
  await expect(dayHead(tomorrow)).toHaveAttribute('data-free', 'false');
  await expect(dayHead(tomorrow)).not.toContainText('空き');

  // 配信太郎だけに絞り込むと、翌日（太郎は 0〜2 時だけ対応不可）も空きになる
  await filter.locator('fieldset button', { hasText: TEST_USER.displayName }).click();
  await expect(page.getByTestId('un-member-row')).toHaveCount(1);
  await expect(dayHead(tomorrow)).toHaveAttribute('data-free', 'true');

  // 条件を解除すると、時間帯も解除されて印が消える
  await filter.getByRole('button', { name: '条件を解除' }).click();
  await expect(page.getByTestId('un-free')).toHaveCount(0);
  await expect(page.getByTestId('un-member-row')).toHaveCount(6);
});
