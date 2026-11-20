import { test, expect, type Page } from '@playwright/test';
import { signInWithEmulator } from '../../helpers/auth';

/**
 * 対応不可時間の入力・メモ E2E（emulator プロジェクト専用）
 *
 * 実行前提:
 *   - Firebase Emulator が起動済み（pnpm emulators）
 *   - node scripts/seed.mjs でシードデータ投入済み（対応不可は実行日基準で入る）
 *
 * 実行方法:
 *   pnpm test:e2e:emulator tests/e2e/unavailability/unavailability-edit.spec.ts
 *
 * どのテストも、書いた内容を最後に消して保存し直す（シードの状態に戻す）。
 */

const PASSWORD = 'password123';

/** JST の当日から offset 日後（`yyyy-mm-dd`）。シードと画面が同じ基準で使う */
function day(offset: number): string {
  const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return new Date(
    Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth(), jstNow.getUTCDate() + offset)
  )
    .toISOString()
    .slice(0, 10);
}

test.use({ viewport: { width: 1440, height: 900 } });

async function openAs(page: Page, email: string) {
  await page.goto('/');
  await page.waitForFunction(
    () =>
      (window as Window & { __firebaseEmulatorsConnected?: boolean })
        .__firebaseEmulatorsConnected === true,
    { timeout: 10000 }
  );
  await signInWithEmulator(page, email, PASSWORD);
  await page.goto('/unavailability');
  await expect(page.getByTestId('un-member-row').first()).toBeVisible({ timeout: 15000 });
}

/** 自分の行（最上段）の、指定した日のセル */
const myCell = (page: Page, date: string) =>
  page.getByTestId('un-member-row').first().locator(`[data-testid="un-cell"][data-date="${date}"]`);

/** 詳細の、指定した日時の行 */
const hourRow = (page: Page, date: string, h: number) =>
  page
    .getByTestId('un-detail')
    .locator(`[data-testid="un-hour"][data-date="${date}"][data-hour="${h}"]`);

/** 対応不可の列を、from 時から to 時までドラッグする */
async function dragHours(page: Page, date: string, from: number, to: number) {
  const start = await hourRow(page, date, from).getByTestId('un-paint').boundingBox();
  const end = await hourRow(page, date, to).getByTestId('un-paint').boundingBox();
  if (!start || !end) throw new Error('塗るセルが見つからない');
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 5 });
  await page.mouse.up();
}

test('③ 自分の詳細で塗って保存すると、一覧の × と最終更新が更新される（UN-070, UN-071）', async ({
  page,
}) => {
  // マネージャー健太: シードでは最終更新が 10 日前で、3 日後には対応不可が無い
  await openAs(page, 'kenta@example.com');
  const date = day(3);
  await expect(myCell(page, date)).toHaveText('');
  await myCell(page, date).click();

  const detail = page.getByTestId('un-detail');
  const hour = (h: number) => hourRow(page, date, h);
  const drag = (from: number, to: number) => dragHours(page, date, from, to);
  const save = detail.getByRole('button', { name: '保存', exact: true });

  // 変更が無い間は保存できない
  await expect(hour(1)).toBeVisible();
  await expect(save).toBeDisabled();

  // 1〜3 時をドラッグして塗る。保存するまでは未保存として表示される
  await drag(1, 3);
  for (const h of [1, 2, 3]) {
    await expect(hour(h)).toHaveAttribute('data-unavailable', 'true');
    await expect(hour(h).getByTestId('un-block')).toHaveAttribute('data-kind', 'added');
  }
  await expect(hour(0)).toHaveAttribute('data-unavailable', 'false');
  await expect(hour(4)).toHaveAttribute('data-unavailable', 'false');
  await expect(detail.getByTestId('un-unsaved')).toBeVisible();

  await save.click();
  await expect(page.getByText('対応不可時間を保存しました')).toBeVisible();
  await expect(hour(2).getByTestId('un-block')).toHaveAttribute('data-kind', 'saved');
  await expect(detail.getByTestId('un-unsaved')).toHaveCount(0);
  await expect(detail.getByTestId('un-detail-updated')).toHaveText('最終更新 今日');

  // 一覧に × と最終更新が反映される
  await detail.getByRole('button', { name: '閉じる' }).click();
  await expect(detail).toHaveCount(0);
  await expect(myCell(page, date)).toHaveText('×');
  await expect(page.getByTestId('un-member-row').first().getByTestId('un-last-updated')).toHaveText(
    '最終更新 今日'
  );

  // 対応不可の上からドラッグすると消える。保存して元に戻す
  await myCell(page, date).click();
  await expect(hour(1).getByTestId('un-block')).toHaveAttribute('data-kind', 'saved');
  await drag(1, 3);
  await expect(hour(2).getByTestId('un-block')).toHaveAttribute('data-kind', 'removed');
  await expect(hour(2)).toHaveAttribute('data-unavailable', 'false');
  await save.click();
  await expect(hour(2).getByTestId('un-block')).toHaveCount(0);
  await detail.getByRole('button', { name: '閉じる' }).click();
  await expect(myCell(page, date)).toHaveText('');
});

test('④ メモを追加・削除して保存できる。他人の詳細ではメモの追加ボタンが出ない（UN-035, UN-036, UN-065）', async ({
  page,
}) => {
  await openAs(page, 'taro@example.com');
  const today = day(0);
  const text = `E2E メモ ${Date.now()}`;

  await myCell(page, today).click();
  const detail = page.getByTestId('un-detail');
  const save = detail.getByRole('button', { name: '保存', exact: true });
  const note = detail.getByTestId('un-note').filter({ hasText: text });

  // 追加: 確定しても、保存するまでは未保存として表示される
  await detail.getByRole('button', { name: 'メモを追加', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'メモを追加', exact: true });
  await expect(form).toContainText('予定の内容ではなく、補足を書いてください');
  await form.getByLabel('メモ').fill(text);
  await form.getByRole('button', { name: '追加' }).click();
  await expect(note).toHaveAttribute('data-unsaved', 'true');

  await save.click();
  await expect(page.getByText('対応不可時間を保存しました')).toBeVisible();
  await expect(note).toHaveAttribute('data-unsaved', 'false');

  // 削除: 自分のメモを押すと編集フォームが開く
  await note.click();
  await page
    .getByRole('dialog', { name: 'メモを編集' })
    .getByRole('button', { name: '削除' })
    .click();
  await expect(note).toHaveCount(0);
  await expect(detail.getByTestId('un-unsaved')).toBeVisible();
  await save.click();
  await expect(detail.getByTestId('un-unsaved')).toHaveCount(0);
  await expect(note).toHaveCount(0);
  await detail.getByRole('button', { name: '閉じる' }).click();
  await expect(detail).toHaveCount(0);

  // 他人（運営花子）の詳細には、入力・メモ追加・保存の操作が無い
  await page
    .getByTestId('un-member-row')
    .filter({ hasText: '運営花子' })
    .locator(`[data-testid="un-cell"][data-date="${today}"]`)
    .click();
  await expect(detail.getByTestId('un-detail-name')).toHaveText('運営花子');
  await expect(detail.getByTestId('un-hour').first()).toBeVisible();
  await expect(detail.getByRole('button', { name: 'メモを追加', exact: true })).toHaveCount(0);
  await expect(detail.getByRole('button', { name: '保存', exact: true })).toHaveCount(0);
  await expect(detail.getByTestId('un-paint')).toHaveCount(0);
  await expect(detail.getByTestId('un-note-slot')).toHaveCount(0);
});

test('⑤ 定期入力をプレビューして保存すると、一覧に反映される（UN-085, UN-086）', async ({
  page,
}) => {
  // サポート里奈: シードでは 2 日後に対応不可が無い
  await openAs(page, 'rina@example.com');
  const date = day(2);
  const weekday = '日月火水木金土'[new Date(`${date}T00:00:00Z`).getUTCDay()];
  const detail = page.getByTestId('un-detail');

  await myCell(page, date).click();
  await detail.getByRole('button', { name: 'CSV・定期入力' }).click();

  // 2 日後の 1 日だけを対象に、その曜日の 10〜12 時を指定する
  const bulk = page.getByTestId('un-bulk');
  await bulk.locator('#un-bulk-from').fill(date);
  await bulk.locator('#un-bulk-to').fill(date);
  await bulk.getByRole('button', { name: `${weekday}曜日` }).click();
  await bulk.locator('[data-slot="dropdown-trigger"]').nth(1).click();
  await page.getByRole('option', { name: '12:00' }).click();
  await bulk.locator('[data-slot="dropdown-trigger"]').nth(0).click();
  await page.getByRole('option', { name: '10:00' }).click();
  await page.getByRole('button', { name: 'プレビュー' }).click();

  // プレビュー: 対象日と時間帯を確認して保存する
  const preview = page.getByRole('dialog', { name: '取り込み内容の確認' });
  await expect(preview.getByTestId('un-bulk-day')).toHaveCount(1);
  await expect(preview.getByTestId('un-bulk-day')).toHaveAttribute('data-date', date);
  await expect(preview.getByTestId('un-bulk-day')).toContainText('10:00〜12:00');
  await preview.getByRole('button', { name: '保存' }).click();
  await expect(page.getByText('1 日分の対応不可を保存しました')).toBeVisible();
  await expect(preview).toHaveCount(0);

  // 詳細と一覧に反映される
  await expect(hourRow(page, date, 10).getByTestId('un-block')).toHaveAttribute(
    'data-kind',
    'saved'
  );
  await expect(hourRow(page, date, 11).getByTestId('un-block')).toHaveAttribute(
    'data-kind',
    'saved'
  );
  await expect(hourRow(page, date, 12)).toHaveAttribute('data-unavailable', 'false');
  await detail.getByRole('button', { name: '閉じる' }).click();
  await expect(myCell(page, date)).toHaveText('×');

  // 消して保存し、元に戻す
  await myCell(page, date).click();
  await dragHours(page, date, 10, 11);
  await detail.getByRole('button', { name: '保存', exact: true }).click();
  await expect(hourRow(page, date, 10).getByTestId('un-block')).toHaveCount(0);
  await detail.getByRole('button', { name: '閉じる' }).click();
  await expect(myCell(page, date)).toHaveText('');
});
