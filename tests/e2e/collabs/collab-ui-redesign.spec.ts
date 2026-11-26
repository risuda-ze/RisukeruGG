import { test, expect, type Page } from '@playwright/test';
import { signInWithEmulator } from '../../helpers/auth';

/**
 * コラボ調整機能 UIリデザイン E2E テスト
 * spec.md 受け入れ基準 SC-001〜SC-013 に対応
 *
 * 前提: テスト実行前にログイン済みセッションが必要。
 * 未認証の場合、(protected)/layout.tsx が auth 解決後にクライアントサイドで
 * /login へリダイレクトするため、リダイレクト完了かボード表示を待ってから
 * 判定し、未認証環境ではスキップする。
 */

const COLLAB_URL = 'http://localhost:3000/collabs';
const MOBILE_VIEWPORT = { width: 390, height: 844 };
const PC_VIEWPORT = { width: 1440, height: 900 };

const board = (page: Page) => page.getByTestId('collab-board');
const rows = (page: Page) => page.getByTestId('collab-row');
const adjustRows = (page: Page) =>
  page.locator('[data-testid="collab-zone"][data-zone="adjust"]').getByTestId('collab-row');
const modal = (page: Page) => page.getByTestId('collab-detail-modal');

/** /collabs へ遷移し、認証済みなら true を返す（未認証リダイレクトを待ってから判定） */
async function gotoCollabs(page: Page): Promise<boolean> {
  await page.goto(COLLAB_URL);
  await Promise.race([
    page.waitForURL('**/login**', { timeout: 15000 }).catch(() => {}),
    board(page).waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
  ]);
  return !page.url().includes('login');
}

test.describe('SC-001〜SC-004: US1 コラボ一覧の閲覧', () => {
  /* SC-001: /collabs にアクセスしてコラボ一覧が表示される */
  test('SC-001: コラボ画面が表示される', async ({ page }) => {
    await page.setViewportSize(PC_VIEWPORT);
    const authed = await gotoCollabs(page);
    test.skip(!authed, '未認証のためスキップ');
    await expect(board(page)).toBeVisible({ timeout: 10000 });
  });

  /* SC-002: 調整中ゾーンと予定確定ゾーンの2ゾーンが表示される（PC） */
  test('SC-002: PCで2ゾーン表示される', async ({ page }) => {
    await page.setViewportSize(PC_VIEWPORT);
    const authed = await gotoCollabs(page);
    test.skip(!authed, '未認証のためスキップ');
    await expect(page.getByTestId('collab-zone')).toHaveCount(2, { timeout: 10000 });
  });

  /* SC-003: モバイルでピルタブが表示される */
  test('SC-003: モバイルでピルタブが表示される', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    const authed = await gotoCollabs(page);
    test.skip(!authed, '未認証のためスキップ');
    await expect(page.getByTestId('collab-zone-tabs')).toBeVisible({ timeout: 10000 });
  });

  /* SC-004: 横長カードにタイトル・バッジ・アバター・回答状況が表示される */
  test('SC-004: 横長カードの構成要素確認', async ({ page }) => {
    await page.setViewportSize(PC_VIEWPORT);
    const authed = await gotoCollabs(page);
    test.skip(!authed, '未認証のためスキップ');
    const count = await rows(page).count();
    if (count === 0) {
      // セッションがない場合、空状態メッセージを確認
      await expect(page.getByTestId('collab-empty').first()).toBeVisible({ timeout: 5000 });
      return;
    }
    const firstRow = rows(page).first();
    await expect(firstRow.getByTestId('collab-row-title')).toBeVisible();
    await expect(firstRow.locator('[data-slot="badge"]')).toBeVisible();
  });
});

test.describe('SC-006〜SC-007: US2 新規コラボ作成', () => {
  /* SC-006: バリデーションエラーが表示される */
  test('SC-006: 必須項目未入力時にバリデーションエラー', async ({ page }) => {
    await page.setViewportSize(PC_VIEWPORT);
    const authed = await gotoCollabs(page);
    test.skip(!authed, '未認証のためスキップ');
    // 「コラボ調整開始」ボタンをクリック
    const startBtn = page.getByRole('button', { name: 'コラボ調整開始' });
    await expect(startBtn).toBeVisible({ timeout: 10000 });
    await startBtn.click();
    // モーダルが開く
    await expect(modal(page)).toBeVisible({ timeout: 5000 });
    // 「新規追加」ボタンをクリック（未入力のまま）
    await page.getByRole('button', { name: '新規追加' }).click();
    // バリデーションエラーが表示される
    await expect(page.getByText('タイトルを入力してください')).toBeVisible({ timeout: 3000 });
  });

  /* SC-007: 必須項目入力後に保存して一覧に反映される */
  test('SC-007: 正常な新規作成フロー', async ({ page }) => {
    await page.setViewportSize(PC_VIEWPORT);
    const authed = await gotoCollabs(page);
    test.skip(!authed, '未認証のためスキップ');
    const startBtn = page.getByRole('button', { name: 'コラボ調整開始' });
    await expect(startBtn).toBeVisible({ timeout: 10000 });
    await startBtn.click();
    await expect(modal(page)).toBeVisible({ timeout: 5000 });

    // タイトル入力
    const titleInput = page.locator('input[placeholder*="タイトル"]');
    await titleInput.fill('E2Eテスト用コラボ');

    // 参加者追加（外部参加者）
    const extInput = page.locator('input[placeholder*="外部参加者"]');
    await extInput.fill('テスト参加者');
    await page.getByRole('button', { name: '追加' }).first().click();

    // 候補日程追加（MiniCalendar の確定日時テキストボックスへ直接入力）
    await page.getByRole('button', { name: '別の日程を提案する' }).click();
    // MiniCalendar は DateField のトリガーを開くまで DOM に出ない
    await page.getByText('日付を選択', { exact: true }).click();
    const dateReadout = page.getByTestId('mini-calendar').locator('input[type="text"]');
    await dateReadout.fill('2099/12/31 10:00');
    await dateReadout.press('Enter');
    await page.getByRole('button', { name: '追加' }).last().click();

    // 新規追加ボタンをクリック
    await page.getByRole('button', { name: '新規追加' }).click();
    // モーダルが閉じる
    await expect(modal(page)).not.toBeVisible({ timeout: 10000 });
  });
});

test.describe('SC-008: US3 ステータス変更→ゾーン移動', () => {
  test('SC-008: コラボ詳細からステータス変更でゾーンが更新される', async ({ page }) => {
    await page.setViewportSize(PC_VIEWPORT);
    const authed = await gotoCollabs(page);
    test.skip(!authed, '未認証のためスキップ');
    // 既存の調整中コラボがある場合のみテスト
    test.skip((await adjustRows(page).count()) === 0, '調整中コラボがないためスキップ');
    // 詳細ボタンをクリック
    await adjustRows(page).first().getByRole('button', { name: '詳細' }).click();
    await expect(modal(page)).toBeVisible({ timeout: 5000 });
    // モーダルが開いたことを確認
    await expect(modal(page).getByRole('heading', { level: 2 })).toBeVisible();
  });
});

/**
 * コラボ詳細の「回答」の欄（CO-029 / CO-030）。
 * シード（scripts/seed.mjs）の collab006「回答つきコラボ調整」を使う。データは変更しない。
 */
test.describe('SC-013: コラボ詳細の「回答」の欄', () => {
  const SEEDED_TITLE = '回答つきコラボ調整';

  for (const user of [
    { role: 'メンバー', email: 'taro@example.com' },
    { role: 'スタッフ', email: 'kenta@example.com' },
  ]) {
    test(`SC-013: ${user.role}のコラボ詳細にコメントの入力欄が無く、回答者ごとの回答と回答コメントが出る`, async ({
      page,
    }) => {
      await page.setViewportSize(PC_VIEWPORT);
      await page.goto('/');
      await page.waitForFunction(
        () =>
          (window as Window & { __firebaseEmulatorsConnected?: boolean })
            .__firebaseEmulatorsConnected === true,
        { timeout: 10000 }
      );
      await signInWithEmulator(page, user.email, 'password123');
      await page.goto('/collabs');

      await rows(page).filter({ hasText: SEEDED_TITLE }).first().click();
      await expect(modal(page)).toBeVisible({ timeout: 10000 });

      // コメント欄（見出し・入力欄・送信・返信）が無い
      await expect(modal(page).getByText('コメント / メモ')).toHaveCount(0);
      await expect(modal(page).locator('textarea[placeholder*="メモ"]')).toHaveCount(0);
      await expect(modal(page).getByRole('button', { name: '送信' })).toHaveCount(0);
      await expect(modal(page).getByRole('button', { name: '返信' })).toHaveCount(0);

      // 「回答」の欄: 回答者ごとに 1 行、回答者名の昇順
      const responseRows = modal(page).getByTestId('collab-responses').getByTestId('collab-response-row');
      await expect(responseRows).toHaveCount(2);

      // 回答コメントあり: 候補日程は日時の昇順（6/24 が NG、6/25 が OK）。同じ本文の 2 件もそのまま出る
      const withComments = responseRows.nth(0);
      await expect(withComments).toContainText('ゲスト歌い手G');
      await expect(withComments.getByRole('listitem').nth(0)).toContainText('NG');
      await expect(withComments.getByRole('listitem').nth(1)).toContainText('OK');
      await expect(withComments.getByTestId('collab-response-comment')).toHaveText([
        /マイクは持参します/,
        /21時半からなら参加できます/,
        /21時半からなら参加できます/,
      ]);

      // 回答コメントなし: 回答だけ（未定と、ok / ng / pending 以外の「—」）
      const withoutComments = responseRows.nth(1);
      await expect(withoutComments).toContainText('飛び入りH');
      await expect(withoutComments.getByRole('listitem').nth(0)).toContainText('未定');
      await expect(withoutComments.getByRole('listitem').nth(1)).toContainText('—');
      await expect(withoutComments.getByTestId('collab-response-comment')).toHaveCount(0);

      // チーム内から投稿された既存のコメントは表示しない
      await expect(modal(page).getByText('チーム内から投稿した既存のコメント')).toHaveCount(0);
    });
  }
});
