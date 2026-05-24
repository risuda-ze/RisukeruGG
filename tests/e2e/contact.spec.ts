import { test, expect } from '@playwright/test';

/**
 * お問い合わせページのスモークテスト（認証不要の検証のみ）
 *
 * 認証が必要なフォーム送信テストは emulator プロジェクトで別途実施
 */
test.describe('お問い合わせページ - 未認証リダイレクト', () => {
  // 未認証ユーザーは /login にリダイレクトされること（(protected) グループの保護）
  test('未認証で /settings/contact にアクセスするとログインページにリダイレクトされる', async ({
    page,
  }) => {
    await page.goto('/settings/contact');
    // (protected) レイアウトがログインページへリダイレクトする
    await expect(page).toHaveURL('/login');
  });
});

/**
 * ログインページ - 回帰テスト
 * プライバシーポリシーリンクが引き続き存在することを確認
 */
test.describe('ログインページ - 回帰テスト', () => {
  test('プライバシーポリシーリンクが引き続き存在する', async ({ page }) => {
    await page.goto('/login');
    const ppLink = page.getByRole('link', { name: 'プライバシーポリシー' });
    await expect(ppLink).toBeVisible();
    await expect(ppLink).toHaveAttribute('href', '/privacy-policy');
  });
});
