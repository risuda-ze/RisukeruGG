import { expect, type Locator } from '@playwright/test';

/**
 * 共通部品 Dropdown を開き、選択肢を選ぶ。
 *
 * 選択肢はポータルで body 直下に描画され、閉じた Dropdown の選択肢もフェードアウトが終わるまで残る。
 * ページ全体から名前で探すと別の Dropdown の同名の選択肢にも当たるので、
 * 開いたトリガーの `aria-controls` が指す listbox の中から選ぶ。
 */
export async function selectDropdownOption(trigger: Locator, name: string) {
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-controls', /.+/);
  const listId = await trigger.getAttribute('aria-controls');
  await trigger.page().locator(`[id="${listId}"]`).getByRole('option', { name }).click();
}
