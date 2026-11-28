import { test, expect, type Page } from '@playwright/test';
import { signInWithEmulator } from '../../helpers/auth';
import { selectDropdownOption } from '../../helpers/dropdown';

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
// どのテストもログイン・ページ遷移と、Firestore Emulator への書き込みを 2 回以上行う。
// 空いた環境では 5〜10 秒で終わるが、同じ機械で dev サーバーのコンパイルなど重い処理が走ると
// 20 秒を超えることがあり、既定の 30 秒では途中で打ち切られる（#304）
test.describe.configure({ timeout: 60_000 });

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

/** リロードしようとして、ブラウザの離脱確認が出ることを確かめる。確認は取り消してページに残る */
async function expectLeaveConfirm(page: Page) {
  const dialog = page.waitForEvent('dialog');
  // 確認が出ている間はスクリプトが止まるので、確認を取り消してから完了を待つ
  const reload = page.evaluate(() => window.location.reload());
  const shown = await dialog;
  expect(shown.type()).toBe('beforeunload');
  await shown.dismiss();
  await reload;
}

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
  await selectDropdownOption(bulk.locator('[data-slot="dropdown-trigger"]').nth(1), '12:00');
  await selectDropdownOption(bulk.locator('[data-slot="dropdown-trigger"]').nth(0), '10:00');
  // 閉じた Dropdown の選択肢は DOM に残るが、inert で操作と支援技術から外れている（#241）。
  // 「終了」のポップアップ（24:00 があるのは終了だけ）を包む Positioner で確かめる
  const closedPopup = page.locator('[data-slot="dropdown-menu"]').filter({ hasText: '24:00' });
  await expect(closedPopup.locator('..')).toHaveJSProperty('inert', true);
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

test('書き込みが完了しない間は案内を出し、確認のうえで閉じられる（UN-071, UN-074）', async ({
  page,
  context,
}) => {
  // 通信の案内が出るまでの 10 秒と、通信が戻ってからの再接続を待つので、既定の 30 秒では足りない
  test.setTimeout(120_000);
  await openAs(page, 'kenta@example.com');
  const date = day(4);
  await myCell(page, date).click();

  const detail = page.getByTestId('un-detail');
  const save = detail.getByRole('button', { name: '保存', exact: true });
  const close = detail.getByRole('button', { name: '閉じる' });
  await expect(hourRow(page, date, 2)).toBeVisible();
  await dragHours(page, date, 2, 2);

  // 通信を切って保存する。送信待ちの間も未保存の表示は残り、すぐには閉じられない
  await context.setOffline(true);
  await save.click();
  await expect(detail.getByTestId('un-unsaved')).toBeVisible();
  await expect(close).toBeDisabled();
  // 書き込みが完了していない間のリロードには、離脱確認が出る
  await expectLeaveConfirm(page);
  await expect(detail).toBeVisible();

  // 一定時間たつと通信の案内が加わり（未保存の表示は残る）、閉じる操作で確認が出る
  await expect(detail.getByTestId('un-save-stalled')).toBeVisible({ timeout: 20000 });
  await expect(detail.getByTestId('un-unsaved')).toBeVisible();
  await close.click();
  const confirm = page.getByRole('dialog', { name: '保存が終わっていません' });
  await expect(confirm.getByTestId('un-confirm-discard')).toHaveCount(0);
  await expect(confirm.getByRole('button', { name: '閉じる', exact: true })).toBeVisible();
  await confirm.getByRole('button', { name: '編集に戻る' }).click();

  // 止まっている間に足したメモは、閉じると破棄されることを確認に示す
  const text = `E2E 送信待ち ${Date.now()}`;
  const note = detail.getByTestId('un-note').filter({ hasText: text });
  await hourRow(page, date, 5).getByTestId('un-note-slot').click();
  const form = page.getByRole('dialog', { name: 'メモを追加', exact: true });
  await form.getByLabel('メモ').fill(text);
  await form.getByRole('button', { name: '追加' }).click();
  await expect(note).toHaveAttribute('data-unsaved', 'true');
  await close.click();
  await expect(confirm.getByTestId('un-confirm-discard')).toBeVisible();
  await expect(confirm.getByRole('button', { name: '破棄して閉じる' })).toBeVisible();
  await confirm.getByRole('button', { name: '編集に戻る' }).click();
  await expect(detail).toBeVisible();

  // 足したメモを消してから、確認を通して詳細を閉じる。閉じた後も、書き込みが完了するまで離脱確認が出る
  await note.click();
  await page
    .getByRole('dialog', { name: 'メモを編集' })
    .getByRole('button', { name: '削除' })
    .click();
  await expect(note).toHaveCount(0);
  await close.click();
  await confirm.getByRole('button', { name: '閉じる', exact: true }).click();
  await expect(detail).toHaveCount(0);
  await expectLeaveConfirm(page);

  // 通信が戻ると保存が完了し、一覧に反映される
  await context.setOffline(false);
  await expect(page.getByText('対応不可時間を保存しました')).toBeVisible({ timeout: 60000 });
  await expect(myCell(page, date)).toHaveText('×');
  await myCell(page, date).click();
  await expect(hourRow(page, date, 2).getByTestId('un-block')).toHaveAttribute(
    'data-kind',
    'saved'
  );
  await expect(detail.getByTestId('un-save-stalled')).toHaveCount(0);
  await expect(detail.getByTestId('un-unsaved')).toHaveCount(0);

  // 消して保存し、シードの状態に戻す
  await dragHours(page, date, 2, 2);
  await save.click();
  await expect(hourRow(page, date, 2)).toHaveAttribute('data-unavailable', 'false');
  await expect(detail.getByTestId('un-unsaved')).toHaveCount(0);
});

test('保存に失敗したら知らせて、入力した内容を未保存のまま残す（UN-071）', async ({
  page,
  request,
}) => {
  // ROM美香: 他のテストが使わない。シードでは入力済みで対応不可なし
  await openAs(page, 'mika@example.com');
  const date = day(6);

  // ルールに拒否させるため、月ドキュメントに定義外のフィールドを置く（Emulator は Bearer owner でルールを迂回できる）
  const firestore = 'http://localhost:8080/v1/projects/demo-risukeru/databases/(default)/documents';
  const headers = { Authorization: 'Bearer owner' };
  const members: {
    documents: { name: string; fields: { displayName: { stringValue: string } } }[];
  } = await (await request.get(`${firestore}/teams/teamAlpha/members`, { headers })).json();
  const uid = members.documents
    .find((doc) => doc.fields.displayName.stringValue === 'ROM美香')
    ?.name.split('/')
    .pop();
  expect(uid).toBeTruthy();
  const brokenField = `${firestore}/teams/teamAlpha/unavailability/${uid}_${date.slice(0, 7)}?updateMask.fieldPaths=broken`;
  const setBroken = async (fields: Record<string, unknown>) =>
    expect((await request.patch(brokenField, { headers, data: { fields } })).ok()).toBe(true);

  await myCell(page, date).click();
  const detail = page.getByTestId('un-detail');
  const save = detail.getByRole('button', { name: '保存', exact: true });
  const block = hourRow(page, date, 3).getByTestId('un-block');
  await expect(hourRow(page, date, 3)).toBeVisible();
  await dragHours(page, date, 3, 3);

  await setBroken({ broken: { stringValue: 'x' } });
  try {
    await save.click();
    await expect(
      page.getByText('保存に失敗しました。入力した内容は残っています。もう一度お試しください。')
    ).toBeVisible();
    await expect(block).toHaveAttribute('data-kind', 'added');
    await expect(detail.getByTestId('un-unsaved')).toBeVisible();
  } finally {
    await setBroken({});
  }

  // 原因を取り除けば、残っていた内容をそのまま保存できる
  await save.click();
  await expect(page.getByText('対応不可時間を保存しました')).toBeVisible();
  await expect(block).toHaveAttribute('data-kind', 'saved');

  // 消して保存し、シードの状態に戻す
  await dragHours(page, date, 3, 3);
  await save.click();
  await expect(hourRow(page, date, 3)).toHaveAttribute('data-unavailable', 'false');
  await expect(detail.getByTestId('un-unsaved')).toHaveCount(0);
});
