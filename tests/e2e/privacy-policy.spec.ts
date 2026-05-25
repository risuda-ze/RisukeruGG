import { test, expect } from '@playwright/test';

/**
 * プライバシーポリシーページのスモークテスト
 * AC-1〜AC-3・AC-6 を検証する（認証不要）
 *
 * AC-4（アプリ情報タブ）・AC-5（タブ内リンク）は認証が必要なため
 * emulator プロジェクトで別途テスト予定
 */
test.describe('プライバシーポリシー', () => {
  // AC-1: /privacy-policy に認証なしでアクセスできる
  test('未認証でプライバシーポリシーページにアクセスできる', async ({ page }) => {
    const response = await page.goto('/privacy-policy');
    // リダイレクトされず 200 が返ること（ログインページへ飛ばされないこと）
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL('/privacy-policy');
  });

  // AC-2: 11セクション（プライバシーポリシー本文）が全て含まれている
  test('プライバシーポリシーの必須セクションが全て表示される', async ({ page }) => {
    await page.goto('/privacy-policy');

    // h1 タイトル確認
    await expect(page.getByRole('heading', { level: 1 })).toContainText('プライバシーポリシー');

    // 必須11セクションの見出し確認
    const requiredSections = [
      '1. 事業者情報',
      '2. 取得する個人情報',
      '3. 利用目的',
      '4. 第三者への提供',
      '5. 委託先への提供',
      '6. 外国への個人情報の提供',
      '7. Cookieおよび認証トークンの使用',
      '8. 安全管理措置',
      '9. 個人情報に関するご請求',
      '10. お問い合わせ窓口',
      '11. プライバシーポリシーの変更',
    ];

    for (const section of requiredSections) {
      await expect(page.getByRole('heading', { name: section })).toBeVisible();
    }
  });

  // ページ内に委託先（Firebase・Vercel）の記載があること
  test('委託先（Firebase・Vercel）の情報が記載されている', async ({ page }) => {
    await page.goto('/privacy-policy');
    await expect(page.getByText('Google LLC（Firebase）')).toBeVisible();
    // "Vercel Inc." はテーブルセル・本文・リンクの複数箇所に出現するため、委託先テーブルのセルを対象にする
    await expect(page.getByRole('cell', { name: 'Vercel Inc.' })).toBeVisible();
  });

  // ページ内に外部リンク（Google・Vercel プライバシーポリシー）があること
  test('外部プライバシーポリシーへのリンクがある', async ({ page }) => {
    await page.goto('/privacy-policy');
    await expect(
      page.getByRole('link', { name: 'Google LLC プライバシーポリシー' }),
    ).toHaveAttribute('href', 'https://policies.google.com/privacy');
    await expect(
      page.getByRole('link', { name: 'Vercel Inc. プライバシーポリシー' }),
    ).toHaveAttribute('href', 'https://vercel.com/legal/privacy-policy');
  });

  // ログインに戻るリンクが存在すること
  test('ログインに戻るリンクがある', async ({ page }) => {
    await page.goto('/privacy-policy');
    // ヘッダー・フッターの両方に「ログインに戻る」リンクがあるため、ヘッダー内を対象にする
    await expect(
      page.locator('header').getByRole('link', { name: /ログインに戻る/ }),
    ).toHaveAttribute('href', '/login');
  });
});

// AC-3: ログインページの「プライバシーポリシー」がリンクになっている
test.describe('ログインページ', () => {
  test('プライバシーポリシーへのクリッカブルリンクがある', async ({ page }) => {
    await page.goto('/login');

    // プライバシーポリシーリンクが存在し、正しい href を持つこと
    const ppLink = page.getByRole('link', { name: 'プライバシーポリシー' });
    await expect(ppLink).toBeVisible();
    await expect(ppLink).toHaveAttribute('href', '/privacy-policy');
    // 新しいタブで開く設定
    await expect(ppLink).toHaveAttribute('target', '_blank');
  });
});

// AC-6: モバイル（375px）でもレイアウト崩れなし
test.describe('プライバシーポリシー - モバイル表示', () => {
  test('375px 幅でもレイアウトが崩れない', async ({ page }) => {
    // モバイルビューポートに設定
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/privacy-policy');

    // タイトルが表示されること
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // 水平スクロールバーが発生していないこと（本文がはみ出していないこと）
    const bodyScrollWidth = await page.evaluate(
      () => document.body.scrollWidth <= window.innerWidth,
    );
    expect(bodyScrollWidth).toBe(true);
  });
});
